import { narration, type NarrationClip } from './narration/manifest';
export type NodeId = 'browser' | 'backend' | 'google' | 'db';
export type InspectId = NodeId | 'request' | 'code' | 'token';
/**
 * Where an arrow actually starts and ends. A whole card tells you two systems
 * talked; the button, the receipt chip or the table row tells you which part of
 * one spoke to which part of the other, which is the thing being taught.
 */
export type AnchorId =
  | 'browser.action'
  | 'browser.screen'
  | 'backend'
  | 'backend.receipt'
  | 'google.auth'
  | 'google.token'
  | 'db';
/** The card to fall back on while an anchor's element is not on screen yet. */
export const anchorNode: Record<AnchorId, NodeId> = {
  'browser.action': 'browser',
  'browser.screen': 'browser',
  backend: 'backend',
  'backend.receipt': 'backend',
  'google.auth': 'google',
  'google.token': 'google',
  db: 'db',
};
/**
 * The lesson's steps by name. Adding one is a matter of adding its name here
 * and its entry to `steps` in the same position — nothing downstream counts.
 */
export type StageId =
  | 'idle'
  | 'request'
  | 'redirect'
  | 'toGoogle'
  | 'consent'
  | 'confirmed'
  | 'back'
  | 'codeBack'
  | 'codeToBackend'
  | 'codeHeld'
  | 'exchange'
  | 'tokenBack'
  | 'verify'
  | 'verified'
  | 'lookup'
  | 'lookupResult'
  | 'create'
  | 'session'
  | 'done';
/** Which edge of an anchor a leg leaves from or arrives at. */
export type Side = 'top' | 'bottom' | 'left' | 'right';
export interface Step {
  /** Stable name for this step. Every comparison in the app goes through S,
   *  so inserting a step here never silently shifts anyone else's meaning. */
  id: StageId;
  /** The clip this step narrates by default; branches override it in cueFor. */
  cue: CueId;
  title: string;
  caption: string;
  scene: number;
  duration: number;
  active: NodeId[];
  route?: [AnchorId, AnchorId];
  /** Pins the leg to particular edges; without it the longer axis picks them. */
  sides?: [Side, Side];
  packet?: 'request' | 'code' | 'token';
  /** Overrides the packet's own name when this leg carries something else. */
  packetLabel?: string;
}
export const steps: Step[] = [
  {
    id: 'idle',
    cue: 'intro',
    title: '一顆按鈕，開始一段幕後旅程',
    caption:
      '從左邊的 Google 登入按鈕開始。你可以隨時暫停，點開資料，看看系統正在交換什麼。',
    scene: 1,
    duration: 0,
    active: [],
  },
  {
    id: 'request',
    cue: 's1',
    title: 'My App 收到登入請求',
    caption: '瀏覽器先告訴自己的後端：我想使用 Google 登入。',
    scene: 1,
    duration: 700,
    active: ['browser', 'backend'],
    route: ['browser.action', 'backend'],
    packet: 'request',
  },
  {
    id: 'redirect',
    cue: 's2',
    title: '後端把登入網址交回瀏覽器',
    caption:
      '後端準備好登入網址，交回瀏覽器；網址裡說明了是哪個 App 要確認身份。',
    scene: 1,
    duration: 600,
    active: ['backend', 'browser'],
    // The redirect back is the link between "the browser asked" and "the
    // browser went to Google"; without it the next step looks like it came
    // from nowhere.
    route: ['backend', 'browser.action'],
    packet: 'request',
    packetLabel: '登入網址',
  },
  {
    id: 'toGoogle',
    cue: 's3',
    title: '瀏覽器前往 Google',
    caption:
      '你的 App 請 Google 協助確認身份。Google 密碼只會交給 Google，不會交給 My App。',
    scene: 1,
    duration: 700,
    active: ['browser', 'google'],
    route: ['browser.action', 'google.auth'],
    packet: 'request',
  },
  {
    id: 'consent',
    cue: 's4',
    title: '選擇你的 Google 帳號',
    caption:
      '現在位於模擬的 Google 畫面。你已登入這個 Google 帳號，選擇是否以它繼續。',
    scene: 2,
    duration: 0,
    active: ['google'],
  },
  {
    id: 'confirmed',
    cue: 's5',
    title: 'Google 已確認，My App 還沒登入',
    caption:
      'Google 已經確認這個帳號，但 My App 還需要完成自己的登入流程。這是兩件不同的事。',
    scene: 2,
    duration: 2000,
    active: ['google'],
  },
  {
    id: 'back',
    cue: 's6',
    title: '瀏覽器被導回你的 App',
    caption:
      'Google 把瀏覽器送回你的應用程式。這一步只是換回自己的網址，還沒有資料在傳輸。',
    scene: 3,
    duration: 600,
    active: ['google', 'browser'],
  },
  {
    id: 'codeBack',
    cue: 's6b',
    title: 'Google 讓瀏覽器帶回一次性代碼',
    caption:
      'Google 透過瀏覽器把一次性 Code 帶回 App。接下來，瀏覽器會將它送到 Backend。',
    scene: 3,
    duration: 700,
    active: ['google', 'browser'],
    route: ['google.auth', 'browser.screen'],
    packet: 'code',
  },
  {
    id: 'codeToBackend',
    cue: 's7',
    title: '瀏覽器將 Code 交給 Backend',
    caption:
      '這一段經過瀏覽器；稍後交換身分憑證，才是 Backend 直接與 Google 溝通。',
    scene: 3,
    duration: 700,
    active: ['browser', 'backend'],
    route: ['browser.screen', 'backend.receipt'],
    packet: 'code',
  },
  {
    id: 'codeHeld',
    cue: 's8',
    title: '拿到 Code，還不等於登入成功',
    caption:
      '這是一張短效、一次性的兌換憑證。它不是 Google 密碼，也不是你的 App 會員資料。',
    scene: 3,
    duration: 2000,
    active: ['backend'],
  },
  {
    id: 'exchange',
    cue: 's9',
    title: 'Backend 用 Code 交換身分憑證',
    caption:
      '後端直接向 Google 交換憑證。這是系統自動完成的工作，不需要使用者再按一個按鈕。',
    scene: 4,
    duration: 700,
    active: ['backend', 'google'],
    // Down out of the backend and in through the top of the credential row:
    // the two cards sit one above the other, so a side-to-side leg would have
    // to travel back up and read as a detour.
    route: ['backend.receipt', 'google.token'],
    sides: ['bottom', 'top'],
    packet: 'code',
  },
  {
    id: 'tokenBack',
    cue: 's10',
    title: 'Google 回傳 ID Token',
    caption:
      'Google 回傳一份身分憑證。後端將確認這份憑證，再使用其中的身份資訊。',
    scene: 4,
    duration: 700,
    active: ['google', 'backend'],
    route: ['google.token', 'backend.receipt'],
    sides: ['top', 'bottom'],
    packet: 'token',
  },
  {
    id: 'verify',
    cue: 's11',
    title: 'Backend 正在驗證身分憑證',
    caption:
      '後端確認憑證來源、適用的 App 與有效期限。收到憑證之後，還要確認它可以被信任。',
    scene: 4,
    duration: 600,
    active: ['backend'],
  },
  {
    id: 'verified',
    cue: 's12',
    title: '身份已確認，接著找自己的會員',
    caption:
      'Backend 現在取得了 Google 提供、並經過驗證的身份資訊，接著要找出這是 My App 裡的哪位會員。',
    scene: 4,
    duration: 600,
    active: ['backend'],
  },
  {
    id: 'lookup',
    cue: 's13',
    title: '這個 Google 身份有會員了嗎？',
    caption:
      '後端使用 Google 的穩定帳號識別碼 sub 查找會員。Email 是顯示資料，不用來當唯一識別碼。',
    scene: 5,
    duration: 700,
    active: ['backend', 'db'],
    // Over the top of both cards rather than through the gap between them, so
    // the query arcs above the row instead of cutting across the two bodies.
    route: ['backend', 'db'],
    sides: ['top', 'top'],
  },
  {
    id: 'lookupResult',
    cue: 's14-new',
    title: '查詢會員資料',
    caption: '相同的 Google 身份，對應到相同的 App 會員。',
    scene: 5,
    duration: 600,
    active: ['db'],
  },
  {
    id: 'create',
    cue: 's15',
    title: '第一次登入，也可以完成註冊',
    caption:
      '資料庫還沒有這位會員，My App 使用已確認的 Google 身份，建立自己的 user 42。',
    scene: 5,
    duration: 600,
    active: ['backend', 'db'],
  },
  {
    id: 'session',
    cue: 's16',
    title: 'My App 建立自己的登入狀態',
    caption:
      '找到或建立會員後，App 還要建立登入狀態，讓這個瀏覽器以 user 42 的身份使用產品。',
    scene: 5,
    duration: 700,
    active: ['backend', 'browser'],
    route: ['backend', 'browser.screen'],
  },
  {
    id: 'done',
    cue: 's17-first',
    title: 'Google 身份，對應到你的 App 會員',
    caption:
      'Google 負責確認 Google 帳號；My App 負責把這個身份對應到自己的會員 user 42。',
    scene: 5,
    duration: 0,
    active: ['browser'],
  },
];
/** Stage index by name. The only place a step's position is written down. */
export const S = Object.fromEntries(
  steps.map((step, index) => [step.id, index]),
) as Record<StageId, number>;
/** The last step: where the lesson ends rather than waits for a press. */
export const lastStage = steps.length - 1;

export const sceneNames = [
  '開始登入',
  '確認身份',
  '帶回代碼',
  '驗證憑證',
  '登入 App',
];
export interface Snapshot {
  stage: number;
  member: boolean;
  returning: boolean;
  run: number;
  elapsed: number;
}
/**
 * Two pointers, deliberately not the same one. The Snapshot half is the view:
 * what the scene is showing. `audio` is where the narration is, and only the
 * narration moves it — pressing something on the phone drives the view alone.
 * Whenever the narration enters a segment it takes the view back with it.
 */
export interface FlowState extends Snapshot {
  paused: boolean;
  /** The step the narration is on. Feeds the clip and the progress bar. */
  audio: number;
  audioElapsed: number;
  /** The clip ended on a gate the viewer has not cleared, so narration waits. */
  held: boolean;
  /**
   * Whether narration is actually going to drive. When it is not — no audio
   * support, a clip that will not decode — the two pointers stay together and
   * the lesson behaves as it always did.
   */
  narrating: boolean;
  /** The viewer set the view running; the next segment change takes it back. */
  hand: boolean;
  /** Set while the cancel narration plays, so stage 0 uses its own cue. */
  justCancelled: boolean;
  inspector: InspectId | null;
}
export type Action =
  | {
      type:
        | 'START'
        | 'CONTINUE'
        | 'CANCEL'
        | 'PAUSE'
        | 'PLAY'
        | 'CLOSE'
        | 'LOGOUT'
        | 'RESET';
    }
  /** TICK moves the view; CLOCK and ADVANCE move the narration. */
  | { type: 'TICK'; delta: number; run: number; stage: number }
  | { type: 'CLOCK'; elapsed: number; run: number; stage: number }
  | { type: 'ADVANCE'; run: number; stage: number }
  | { type: 'SEEK'; stage: number; offset: number }
  | { type: 'INSPECT'; target: InspectId }
  | { type: 'NARRATING'; on: boolean };
export function initialState(run = 0): FlowState {
  return {
    stage: S.idle,
    member: false,
    returning: false,
    run,
    elapsed: 0,
    paused: false,
    audio: 0,
    audioElapsed: 0,
    held: false,
    narrating: false,
    hand: false,
    justCancelled: false,
    inspector: null,
  };
}
/** Moves the view onto a step. */
function enter(state: FlowState, stage: number): FlowState {
  return {
    ...state,
    stage,
    elapsed: 0,
    member: state.member || (stage === S.session && state.stage === S.create),
    // With nothing narrating, there is only one pointer to speak of.
    ...(state.narrating ? null : { audio: stage, audioElapsed: 0 }),
  };
}
/** The narration enters a step and takes the view with it, panel and all. */
function narrate(state: FlowState, stage: number): FlowState {
  return {
    ...enter({ ...state, hand: false, inspector: null }, stage),
    audio: stage,
    audioElapsed: 0,
    held: false,
  };
}
/** Where the narration goes next; the branch depends only on which run it is. */
function nextAudio(state: FlowState): number {
  return state.audio === S.lookupResult && state.returning
    ? S.session
    : state.audio + 1;
}
/**
 * A gate holds the narration until the viewer clears it on the phone. Pressing
 * the button never moves the narration itself — it only lifts this hold.
 */
function release(state: FlowState): FlowState {
  return state.held && state.stage > state.audio
    ? narrate(state, nextAudio(state))
    : state;
}
export function reducer(state: FlowState, action: Action): FlowState {
  switch (action.type) {
    case 'START':
      return state.stage === S.idle && !state.inspector
        ? release(
            enter(
              {
                ...state,
                run: state.run + 1,
                hand: true,
                justCancelled: false,
              },
              S.request,
            ),
          )
        : state;
    case 'CONTINUE':
      return state.stage === S.consent && !state.inspector
        ? release(enter({ ...state, hand: true }, S.confirmed))
        : state;
    // Cancelling abandons the run rather than nudging the view, so the
    // narration goes back to the start with it and picks up its own cue.
    case 'CANCEL':
      return state.stage === S.consent
        ? narrate({ ...state, justCancelled: true }, S.idle)
        : state;
    case 'TICK': {
      // The view's own clock: it only runs while the viewer is driving.
      if (
        action.run !== state.run ||
        action.stage !== state.stage ||
        state.inspector ||
        !steps[state.stage].duration ||
        // Off the viewer's hand the scene moves only for narration, and only
        // while nothing has frozen it.
        (!state.hand && (state.narrating || state.paused))
      )
        return state;
      const elapsed = state.elapsed + Math.max(0, action.delta);
      if (elapsed < steps[state.stage].duration)
        return release({ ...state, elapsed });
      return release(enter(state, nextStage(state)));
    }
    case 'CLOCK':
      return action.run !== state.run ||
        action.stage !== state.audio ||
        state.paused
        ? state
        : { ...state, audioElapsed: action.elapsed };
    case 'ADVANCE':
      if (action.run !== state.run || action.stage !== state.audio)
        return state;
      // Nothing follows the last step, and a gate waits for the viewer.
      return state.audio >= lastStage ||
        (isStop(state.audio) && state.stage <= state.audio)
        ? { ...state, held: true }
        : narrate(state, nextAudio(state));
    case 'SEEK': {
      const target = stateAtStage(state, action.stage);
      return {
        ...target,
        elapsed: action.offset,
        audioElapsed: action.offset,
        paused: state.paused,
        hand: false,
      };
    }
    // Pausing stops everything; a press afterwards starts the scene again on
    // its own, and leaves the narration where it was.
    case 'PAUSE':
      return { ...state, paused: true, hand: false };
    // Asking for the narration back also hands it the view.
    case 'PLAY':
      return state.narrating
        ? enter(
            { ...state, paused: false, hand: false, inspector: null },
            state.audio,
          )
        : { ...state, paused: false, hand: false };
    case 'NARRATING':
      return state.narrating === action.on
        ? state
        : { ...state, narrating: action.on, audio: state.stage, held: false };
    case 'INSPECT':
      return { ...state, inspector: action.target };
    case 'CLOSE':
      return { ...state, inspector: null };
    // Whether narration drives is a fact about the browser, not about the run,
    // so starting over must not quietly relink the two pointers.
    case 'LOGOUT':
      return state.stage === S.done
        ? {
            ...initialState(state.run + 1),
            member: state.member,
            returning: state.member,
            narrating: state.narrating,
          }
        : state;
    case 'RESET':
      return { ...initialState(state.run + 1), narrating: state.narrating };
  }
}
export function captionFor(view: Snapshot): string {
  if (view.stage === S.lookupResult)
    return view.member
      ? '找到 user 42！這個 Google 身份已經有會員資料，不必再建立帳號。'
      : '找不到這個 Google 身份對應的會員。接著，My App 會自動建立一個新帳號。';
  if (view.stage === S.done && view.returning)
    return '同一個 Google 身份已經有會員資料，這次直接登入，不需要再建立帳號。';
  return steps[view.stage].caption;
}

/** Stages that hold until the viewer acts; their narration waits with them. */
export function isGate(stage: number): boolean {
  return !steps[stage].duration;
}
/**
 * A gate the viewer has to clear themselves. The last stage is a gate too, but
 * it is the end of the lesson: nothing to press, and nothing to scrub past.
 */
export function isStop(stage: number): boolean {
  return isGate(stage) && stage !== lastStage;
}
/**
 * True while the demo is parked waiting for the viewer. With narration that is
 * the moment its clip runs out on a gate; without, simply standing on one.
 */
export function isWaiting(state: FlowState): boolean {
  return (
    !state.inspector &&
    (state.narrating ? state.held && isStop(state.audio) : isStop(state.stage))
  );
}
function nextStage(state: FlowState): number {
  return state.stage === S.lookupResult && state.member
    ? S.session
    : state.stage + 1;
}

export type CueId =
  | 'intro'
  | 'intro-again'
  | 'cancel'
  | 's1'
  | 's2'
  | 's3'
  | 's4'
  | 's5'
  | 's6'
  | 's6b'
  | 's7'
  | 's8'
  | 's9'
  | 's10'
  | 's11'
  | 's12'
  | 's13'
  | 's14-new'
  | 's14-found'
  | 's15'
  | 's16'
  | 's17-first'
  | 's17-return';

/** Narration cue for the live state. Branches exactly like captionFor(). */
export function cueFor(state: FlowState): CueId {
  const { stage, member, returning } = state;
  if (stage === S.idle)
    return state.justCancelled ? 'cancel' : returning ? 'intro-again' : 'intro';
  if (stage === S.lookupResult && member) return 's14-found';
  if (stage === S.done && returning) return 's17-return';
  return steps[stage].cue;
}
export function clipOf(cue: CueId | undefined): NarrationClip | undefined {
  return cue ? narration[cue] : undefined;
}
export function clipFor(state: FlowState): NarrationClip | undefined {
  return clipOf(cueFor(state));
}

export interface Segment {
  stage: number;
  cue: CueId;
  start: number;
  ms: number;
}
/** Stage order for one run: a returning member skips the create-account step. */
export function stagesFor(returning: boolean): number[] {
  const stages = [];
  for (let stage = 0; stage < steps.length; stage++)
    if (!(returning && stage === S.create)) stages.push(stage);
  return stages;
}
/**
 * Play order with cumulative offsets, so the dock can show one continuous
 * timeline even though every step is its own clip.
 */
export function timelineFor(returning: boolean): Segment[] {
  const segments: Segment[] = [];
  let start = 0;
  for (const stage of stagesFor(returning)) {
    const cue = cueFor({
      ...initialState(),
      stage,
      member: returning,
      returning,
    });
    const ms = narration[cue]?.ms ?? steps[stage].duration;
    segments.push({ stage, cue, start, ms });
    start += ms;
  }
  return segments;
}
export function totalMs(timeline: Segment[]): number {
  const last = timeline[timeline.length - 1];
  return last ? last.start + last.ms : 0;
}

/**
 * Rebuilds the run at an arbitrary stage by replaying enter() along the
 * deterministic path, so seeking lands on exactly what playing there would.
 */
export function stateAtStage(base: FlowState, target: number): FlowState {
  let state: FlowState = {
    ...initialState(base.run),
    member: base.returning,
    returning: base.returning,
  };
  while (state.stage !== target && state.stage < lastStage)
    state = enter(state, nextStage(state));
  // Seeking is a narration gesture: both pointers land together.
  return {
    ...state,
    paused: base.paused,
    narrating: base.narrating,
    audio: state.stage,
    inspector: null,
  };
}

/**
 * How long the packet takes to cross. Short clips keep the original snap;
 * long ones stretch the flight so it reads as part of the sentence, then rest.
 */
export function flightMs(stage: number, clipMs: number | undefined): number {
  const motion = steps[stage].duration || 700;
  if (!clipMs) return motion;
  return Math.min(Math.max(motion, clipMs * 0.6), 2600);
}
