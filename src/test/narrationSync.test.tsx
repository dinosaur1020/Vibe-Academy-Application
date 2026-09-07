import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { AuthDemo } from '../AuthDemo';
import { timelineFor, totalMs } from '../flow';
import css from '../AuthDemo.module.css';

// jsdom has no media stack, so stand up just enough of one to prove the app
// takes its clock from the audio element instead of a timer.
const created: HTMLAudioElement[] = [];
const media = new WeakMap<
  HTMLMediaElement,
  { time: number; paused: boolean }
>();
function fake(el: HTMLMediaElement) {
  let entry = media.get(el);
  if (!entry) {
    entry = { time: 0, paused: true };
    media.set(el, entry);
  }
  return entry;
}
function allow(this: HTMLMediaElement) {
  fake(this).paused = false;
  return Promise.resolve();
}
// What a browser does with autoplay before the page has had a user gesture.
function refuse() {
  return Promise.reject(
    Object.assign(new Error('autoplay'), { name: 'NotAllowedError' }),
  );
}
const setPlay = (value: () => unknown) =>
  Object.defineProperty(HTMLMediaElement.prototype, 'play', {
    configurable: true,
    value,
  });
beforeAll(() => {
  const proto = HTMLMediaElement.prototype;
  const define = (name: string, descriptor: PropertyDescriptor) =>
    Object.defineProperty(proto, name, { configurable: true, ...descriptor });
  define('canPlayType', { value: () => 'maybe' });
  define('load', { value() {} });
  setPlay(allow);
  define('pause', {
    value(this: HTMLMediaElement) {
      fake(this).paused = true;
    },
  });
  define('paused', {
    get(this: HTMLMediaElement) {
      return fake(this).paused;
    },
  });
  define('currentTime', {
    get(this: HTMLMediaElement) {
      return fake(this).time;
    },
    set(this: HTMLMediaElement, value: number) {
      fake(this).time = value;
    },
  });
  // A new source rewinds the element, as it does in a browser — the tests below
  // rely on that to tell "started from the top" from "resumed mid-clip".
  const src = Object.getOwnPropertyDescriptor(proto, 'src')!;
  define('src', {
    get(this: HTMLMediaElement) {
      return src.get!.call(this);
    },
    set(this: HTMLMediaElement, value: string) {
      fake(this).time = 0;
      src.set!.call(this, value);
    },
  });
  // jsdom measures every element as zero and implements no path geometry, so
  // stand in a straight 100-unit path: the packet's left then reads back as the
  // percentage of the flight it has covered.
  // jsdom has no SVGPathElement at all, so the geometry lands on SVGElement.
  const svg = window.SVGElement.prototype as unknown as Record<string, unknown>;
  Object.defineProperty(svg, 'getTotalLength', {
    configurable: true,
    value: () => 100,
  });
  Object.defineProperty(svg, 'getPointAtLength', {
    configurable: true,
    value: (length: number) => ({ x: length, y: 0 }),
  });
  const Native = window.Audio;
  window.Audio = class extends Native {
    constructor() {
      super();
      created.push(this as HTMLAudioElement);
    }
  } as typeof Audio;
});
afterEach(() => {
  created.length = 0;
  setPlay(allow);
  vi.useRealTimers();
});
async function time(ms: number) {
  for (let i = 0; i < ms; i += 100)
    await act(async () => {
      vi.advanceTimersByTime(Math.min(100, ms - i));
    });
}
function useTimers() {
  vi.useFakeTimers({
    toFake: [
      'setTimeout',
      'clearTimeout',
      'requestAnimationFrame',
      'cancelAnimationFrame',
      'performance',
    ],
  });
}
// The first element is the throwaway probe from canPlayType; the narrator
// tags itself so this stays correct however many elements get created.
const narrator = () =>
  created.find((el) => el.dataset.role === 'narration') as HTMLAudioElement;
const ends = async () =>
  await act(async () => {
    fireEvent(narrator(), new Event('ended'));
  });
// The packet is positioned with a transform, so its distance along the leg has
// to be read out of that rather than off style.left.
const along = (packet: HTMLElement) =>
  parseFloat(
    /translate\((-?[\d.]+)px/.exec(packet.style.transform)?.[1] ?? 'NaN',
  );
// The dock renders position and total as separate <time> nodes flanking the track.
const clock = () =>
  [...document.querySelectorAll('time')].map((t) => t.textContent).join(' / ');

describe('音訊驅動', () => {
  it('只有旁白播完會推進旁白，計時器推不動它', async () => {
    useTimers();
    render(<AuthDemo />);
    fireEvent.click(
      screen.getByRole('button', { name: 'Continue with Google' }),
    );
    // The scene runs ahead by hand, but nothing except 'ended' moves the clip.
    await time(30000);
    expect(narrator().src).toContain('/audio/intro.m4a');
    await ends();
    await time(300);
    // The intro ends on the sentence asking for the press, so it takes the
    // scene back to the button rather than leaving the words pointing at a
    // screen that has already moved on.
    expect(narrator().src).toContain('/audio/intro.m4a');
    expect(
      screen.getByRole('button', { name: 'Continue with Google' }),
    ).toBeEnabled();
    fireEvent.click(
      screen.getByRole('button', { name: 'Continue with Google' }),
    );
    await time(300);
    expect(narrator().src).toContain('/audio/s1.m4a');
    // Entering a segment takes the scene back from the viewer.
    expect(screen.getByText('My App 收到登入請求')).toBeInTheDocument();
  });
  it('點畫面不會動到旁白，也不會動到進度條', async () => {
    useTimers();
    render(<AuthDemo />);
    narrator().currentTime = 2;
    await time(200);
    const before = clock();
    fireEvent.click(
      screen.getByRole('button', { name: 'Continue with Google' }),
    );
    await time(2500);
    // The scene walked itself to the consent gate; the dock did not budge.
    expect(screen.getByRole('button', { name: '繼續' })).toBeEnabled();
    expect(narrator().src).toContain('/audio/intro.m4a');
    expect(clock()).toBe(before);
  });
  it('旁白進到新段落時，把畫面和資料面板一起收回來', async () => {
    useTimers();
    render(<AuthDemo />);
    // Clear the opening gate first, so this is about an ordinary segment.
    await ends();
    fireEvent.click(
      screen.getByRole('button', { name: 'Continue with Google' }),
    );
    await time(300);
    fireEvent.click(screen.getByRole('button', { name: '檢查 Backend 狀態' }));
    expect(
      screen.getByRole('button', { name: '關閉資料檢查' }),
    ).toBeInTheDocument();
    expect(narrator().paused).toBe(false);
    await ends();
    await time(300);
    expect(
      screen.queryByRole('button', { name: '關閉資料檢查' }),
    ).not.toBeInTheDocument();
    expect(
      screen.getAllByText('後端把登入網址交回瀏覽器').length,
    ).toBeGreaterThan(0);
  });
  it('等待互動的步驟，旁白播完仍停在原地', async () => {
    useTimers();
    render(<AuthDemo />);
    await ends();
    await time(5000);
    expect(
      screen.getByRole('button', { name: 'Continue with Google' }),
    ).toBeEnabled();
    expect(screen.getByText('一顆按鈕，開始一段幕後旅程')).toBeInTheDocument();
  });
  it('旁白還在講的時候不催促，講完才提示等你操作', async () => {
    useTimers();
    render(<AuthDemo />);
    // The opening screen stays undimmed while the narration explains it.
    expect(screen.queryByText('等你操作')).not.toBeInTheDocument();
    await ends();
    expect(screen.getByText('等你操作')).toBeInTheDocument();
  });
  it('自動播放被擋下時，剛進站的畫面不會先暗起來催人', async () => {
    useTimers();
    setPlay(refuse);
    render(<AuthDemo />);
    await time(300);
    expect(screen.getByRole('button', { name: '繼續播放' })).toBeEnabled();
    expect(screen.queryByText('等你操作')).not.toBeInTheDocument();
  });
  it('進度條走的是音檔時間，並累計成整堂課的進度', async () => {
    useTimers();
    render(<AuthDemo />);
    const total = totalMs(timelineFor(false));
    const mmss = `${Math.floor(Math.round(total / 1000) / 60)}:${String(
      Math.round(total / 1000) % 60,
    ).padStart(2, '0')}`;
    expect(clock()).toBe(`0:00 / ${mmss}`);
    narrator().currentTime = 2;
    await time(200);
    expect(clock().split(' / ')[0]).toBe('0:02');
    await ends();
    fireEvent.click(
      screen.getByRole('button', { name: 'Continue with Google' }),
    );
    await time(300);
    narrator().currentTime = 2;
    await time(200);
    const [minutes, seconds] = clock().split(' / ')[0].split(':');
    const position = Number(minutes) * 60 + Number(seconds);
    // Stage 1 starts after the intro clip, so 2s into it lands well past 0:02.
    expect(position).toBeGreaterThan(8);
  });
  it('快進十秒落在後面那一段的中間，接著的一段仍從自己的開頭播', async () => {
    useTimers();
    render(<AuthDemo />);
    await time(200);
    fireEvent.click(screen.getByRole('button', { name: '快進 10 秒' }));
    await time(300);
    expect(narrator().src).toContain('/audio/s1.m4a');
    expect(narrator().currentTime).toBeGreaterThan(1);
    // The offset belonged to the step that was seeked to, not to every step
    // after it — s2 must open at its first word.
    await ends();
    await time(300);
    expect(narrator().src).toContain('/audio/s2.m4a');
    expect(narrator().currentTime).toBe(0);
  });
  it('進度條不被要按按鈕的節點卡住，可以一路快進到最後', async () => {
    useTimers();
    render(<AuthDemo />);
    fireEvent.click(
      screen.getByRole('button', { name: 'Continue with Google' }),
    );
    await time(200);
    for (let i = 0; i < 20; i++) {
      const skip: HTMLButtonElement = screen.getByRole('button', {
        name: '快進 10 秒',
      });
      if (skip.disabled) break;
      fireEvent.click(skip);
      await time(300);
    }
    // Straight through the consent gate without anyone pressing 繼續.
    expect(screen.getByText(/Welcome, Dino/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '倒退 10 秒' }));
    await time(300);
    expect(screen.getByRole('button', { name: '快進 10 秒' })).toBeEnabled();
  });
  it('沒在聽旁白的時候，按按鈕直接跑動畫，不等音檔播完', async () => {
    useTimers();
    setPlay(refuse);
    render(<AuthDemo />);
    await time(200);
    fireEvent.click(
      screen.getByRole('button', { name: 'Continue with Google' }),
    );
    // Steps 1-3 run on their own 700/600/700ms timings — no 'ended' fires here.
    await time(2500);
    expect(screen.getByRole('button', { name: '繼續' })).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: '繼續' }));
    await time(14000);
    expect(screen.getByText(/Welcome, Dino/)).toBeInTheDocument();
  });
  it('旁白在講的時候，封包真的在箭頭上飛', async () => {
    useTimers();
    render(<AuthDemo />);
    // The opening clip runs out on the gate; pressing the button releases it
    // into s1, where the narration — not the viewer — is driving.
    await ends();
    fireEvent.click(
      screen.getByRole('button', { name: 'Continue with Google' }),
    );
    await time(200);
    const packet = screen.getByRole('button', { name: '檢查登入請求' });
    expect(along(packet)).toBe(0);
    narrator().currentTime = 1.2;
    await time(200);
    const midway = along(packet);
    expect(midway).toBeGreaterThan(0);
    narrator().currentTime = 3.2;
    await time(200);
    expect(along(packet)).toBeGreaterThan(midway);
  });
  it('停在同一個畫面的段落，也會照著旁白一句一句長出來', async () => {
    useTimers();
    render(<AuthDemo />);
    await ends();
    fireEvent.click(
      screen.getByRole('button', { name: 'Continue with Google' }),
    );
    for (const cue of ['s1', 's2', 's3']) {
      await time(100);
      expect(narrator().src).toContain(`/audio/${cue}.m4a`);
      await ends();
    }
    // s4 runs out on the consent gate, so the press is what releases s5 — one
    // short line that keeps the pressed button on screen. s5b is the stretch that
    // stands still, and so the one that has to grow.
    await ends();
    fireEvent.click(screen.getByRole('button', { name: '繼續' }));
    await time(200);
    expect(narrator().src).toContain('/audio/s5.m4a');
    await ends();
    await time(200);
    expect(narrator().src).toContain('/audio/s5b.m4a');
    const line = screen.getByText('My App 登入狀態').parentElement!;
    expect(line.className).not.toContain(css.beatOn);
    // s5b says "身份被確認" before it says "還沒讓你登入".
    narrator().currentTime = 4;
    await time(200);
    expect(line.className).toContain(css.beatOn);
  });
  it('先把瀏覽器倒回自己的網址，下一段才拉出箭頭送代碼', async () => {
    useTimers();
    render(<AuthDemo />);
    await ends();
    fireEvent.click(
      screen.getByRole('button', { name: 'Continue with Google' }),
    );
    for (let i = 0; i < 3; i++) {
      await time(100);
      await ends();
    }
    // s4 runs out on the consent gate, so the press is what releases s5;
    // s5 and s5b both play out before the browser is sent back.
    await ends();
    fireEvent.click(screen.getByRole('button', { name: '繼續' }));
    await time(100);
    await ends();
    await time(100);
    await ends();
    await time(200);
    const bar = () =>
      document.querySelector(`.${css.addressBar}`)!.textContent ?? '';
    const arrow = () =>
      screen.queryByRole('button', { name: '檢查一次性代碼' });
    // s6 sends the browser back and nothing else: no packet, so no arrow.
    expect(bar()).toContain('accounts.google.com');
    expect(arrow()).toBeNull();
    narrator().currentTime = 2;
    await time(200);
    expect(bar()).toContain('my-app.example');
    expect(bar()).not.toContain('code=');
    expect(arrow()).toBeNull();
    // Only the next step carries anything across.
    await ends();
    await time(200);
    expect(arrow()).not.toBeNull();
    const ticket = document.querySelector(`.${css.codeTicket}`)!;
    expect(ticket.className).not.toContain(css.beatOn);
    narrator().currentTime = 2.5;
    await time(200);
    expect(bar()).toContain('my-app.example/?code=DEMO-CODE-001');
    expect(ticket.className).toContain(css.beatOn);
  });
  it('標題旁的時間泡泡把整堂課倒回開頭', async () => {
    useTimers();
    render(<AuthDemo />);
    await ends();
    fireEvent.click(
      screen.getByRole('button', { name: 'Continue with Google' }),
    );
    await time(300);
    expect(screen.getByText('My App 收到登入請求')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /從頭播放解說/ }));
    await time(200);
    expect(screen.getByText('一顆按鈕，開始一段幕後旅程')).toBeInTheDocument();
    expect(clock().split(' / ')[0]).toBe('0:00');
    expect(narrator().src).toContain('/audio/intro.m4a');
  });
  it('暫停會停下旁白，檢查資料不會', async () => {
    useTimers();
    render(<AuthDemo />);
    fireEvent.click(
      screen.getByRole('button', { name: 'Continue with Google' }),
    );
    expect(narrator().paused).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: '暫停流程' }));
    await time(100);
    expect(narrator().paused).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: '繼續播放' }));
    await time(100);
    expect(narrator().paused).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: '檢查 Backend 狀態' }));
    await time(100);
    expect(narrator().paused).toBe(false);
  });
});
