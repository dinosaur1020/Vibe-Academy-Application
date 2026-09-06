import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { AuthDemo } from '../AuthDemo';
import { timelineFor, totalMs } from '../flow';

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
beforeAll(() => {
  const proto = HTMLMediaElement.prototype;
  const define = (name: string, descriptor: PropertyDescriptor) =>
    Object.defineProperty(proto, name, { configurable: true, ...descriptor });
  define('canPlayType', { value: () => 'maybe' });
  define('load', { value() {} });
  define('play', {
    value(this: HTMLMediaElement) {
      fake(this).paused = false;
      return Promise.resolve();
    },
  });
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
// The dock renders position and total as separate <time> nodes flanking the track.
const clock = () =>
  [...document.querySelectorAll('time')].map((t) => t.textContent).join(' / ');

describe('音訊驅動', () => {
  it('旁白播完才前進，計時器不再推動流程', async () => {
    useTimers();
    render(<AuthDemo />);
    fireEvent.click(
      screen.getByRole('button', { name: 'Continue with Google' }),
    );
    expect(screen.getByText('My App 收到登入請求')).toBeInTheDocument();
    // Step 1 lasts 700ms of animation but the clip is seconds long: without
    // audio ending, nothing may advance no matter how much time passes.
    await time(30000);
    expect(screen.getByText('My App 收到登入請求')).toBeInTheDocument();
    await ends();
    expect(screen.getByText('後端準備 Google 登入')).toBeInTheDocument();
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
  it('進度條走的是音檔時間，並累計成整堂課的進度', async () => {
    useTimers();
    render(<AuthDemo />);
    const total = totalMs(timelineFor(false));
    const mmss = `${Math.floor(Math.round(total / 1000) / 60)}:${String(
      Math.round(total / 1000) % 60,
    ).padStart(2, '0')}`;
    expect(clock()).toBe(`0:00 / ${mmss}`);
    fireEvent.click(
      screen.getByRole('button', { name: 'Continue with Google' }),
    );
    narrator().currentTime = 2;
    await time(200);
    const [minutes, seconds] = clock().split(' / ')[0].split(':');
    const position = Number(minutes) * 60 + Number(seconds);
    // Stage 1 starts after the intro clip, so 2s into it lands well past 0:02.
    expect(position).toBeGreaterThan(8);
  });
  it('提前點擊會切換到下一段旁白', async () => {
    useTimers();
    render(<AuthDemo />);
    expect(narrator().src).toContain('/audio/intro.m4a');
    narrator().currentTime = 3;
    fireEvent.click(
      screen.getByRole('button', { name: 'Continue with Google' }),
    );
    await time(400);
    expect(narrator().src).toContain('/audio/s1.m4a');
  });
  it('標題旁的時間泡泡把整堂課倒回開頭', async () => {
    useTimers();
    render(<AuthDemo />);
    fireEvent.click(
      screen.getByRole('button', { name: 'Continue with Google' }),
    );
    await ends();
    expect(screen.getByText('後端準備 Google 登入')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /從頭播放解說/ }));
    await time(200);
    expect(screen.getByText('一顆按鈕，開始一段幕後旅程')).toBeInTheDocument();
    expect(clock().split(' / ')[0]).toBe('0:00');
    expect(narrator().src).toContain('/audio/intro.m4a');
  });
  it('暫停與檢查資料會一起停下旁白', async () => {
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
    expect(narrator().paused).toBe(true);
  });
});
