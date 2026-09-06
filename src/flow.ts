import { narration, type NarrationClip } from './narration/manifest';
export type NodeId = 'browser' | 'backend' | 'google' | 'db';
export type InspectId = NodeId | 'request' | 'code' | 'token';
export interface Step {
  title: string;
  caption: string;
  scene: number;
  duration: number;
  active: NodeId[];
  route?: [NodeId, NodeId];
  packet?: 'request' | 'code' | 'token';
  event?: string;
  direction?: string;
}
export const steps: Step[] = [
  {
    title: '一顆按鈕，開始一段幕後旅程',
    caption:
      '從左邊的 Google 登入按鈕開始。你可以隨時暫停，點開資料，看看系統正在交換什麼。',
    scene: 1,
    duration: 0,
    active: [],
  },
  {
    title: 'My App 收到登入請求',
    caption: '瀏覽器先告訴自己的後端：我想使用 Google 登入。',
    scene: 1,
    duration: 700,
    active: ['browser', 'backend'],
    route: ['browser', 'backend'],
    packet: 'request',
  },
  {
    title: '後端準備 Google 登入',
    caption: '後端準備登入請求，讓 Google 知道是哪個 App 想確認使用者身份。',
    scene: 1,
    duration: 600,
    active: ['backend'],
    event: '開始 Google 登入',
    direction: '瀏覽器 → Backend',
  },
  {
    title: '瀏覽器前往 Google',
    caption:
      '你的 App 請 Google 協助確認身份。Google 密碼只會交給 Google，不會交給 My App。',
    scene: 1,
    duration: 700,
    active: ['browser', 'google'],
    route: ['browser', 'google'],
    packet: 'request',
  },
  {
    title: '選擇你的 Google 帳號',
    caption:
      '現在位於模擬的 Google 畫面。你已登入這個 Google 帳號，選擇是否以它繼續。',
    scene: 2,
    duration: 0,
    active: ['google'],
    event: '已前往 Google',
    direction: '瀏覽器 → Google',
  },
  {
    title: 'Google 已確認，My App 還沒登入',
    caption:
      'Google 已經確認這個帳號，但 My App 還需要完成自己的登入流程。這是兩件不同的事。',
    scene: 2,
    duration: 2000,
    active: ['google'],
    event: 'Google 帳號身份已確認',
    direction: 'Google · Dino',
  },
  {
    title: 'Google 讓瀏覽器帶回一次性代碼',
    caption:
      'Google 透過瀏覽器把一次性 Code 帶回 App。接下來，瀏覽器會將它送到 Backend。',
    scene: 3,
    duration: 700,
    active: ['google', 'browser'],
    route: ['google', 'browser'],
    packet: 'code',
  },
  {
    title: '瀏覽器將 Code 交給 Backend',
    caption:
      '這一段經過瀏覽器；稍後交換身分憑證，才是 Backend 直接與 Google 溝通。',
    scene: 3,
    duration: 700,
    active: ['browser', 'backend'],
    route: ['browser', 'backend'],
    packet: 'code',
  },
  {
    title: '拿到 Code，還不等於登入成功',
    caption:
      '這是一張短效、一次性的兌換憑證。它不是 Google 密碼，也不是你的 App 會員資料。',
    scene: 3,
    duration: 2000,
    active: ['backend'],
    event: '收到一次性代碼',
    direction: 'Google → 瀏覽器 → Backend',
  },
  {
    title: 'Backend 用 Code 交換身分憑證',
    caption:
      '後端直接向 Google 交換憑證。這是系統自動完成的工作，不需要使用者再按一個按鈕。',
    scene: 4,
    duration: 700,
    active: ['backend', 'google'],
    route: ['backend', 'google'],
    packet: 'code',
  },
  {
    title: 'Google 回傳 ID Token',
    caption:
      'Google 回傳一份身分憑證。後端將確認這份憑證，再使用其中的身份資訊。',
    scene: 4,
    duration: 700,
    active: ['google', 'backend'],
    route: ['google', 'backend'],
    packet: 'token',
    event: '已交換一次性代碼',
    direction: 'Backend → Google',
  },
  {
    title: 'Backend 正在驗證身分憑證',
    caption:
      '後端確認憑證來源、適用的 App 與有效期限。收到憑證之後，還要確認它可以被信任。',
    scene: 4,
    duration: 600,
    active: ['backend'],
    event: '收到身分憑證 ID Token',
    direction: 'Google → Backend',
  },
  {
    title: '身份已確認，接著找自己的會員',
    caption:
      'Backend 現在取得了 Google 提供、並經過驗證的身份資訊，接著要找出這是 My App 裡的哪位會員。',
    scene: 4,
    duration: 600,
    active: ['backend'],
    event: '身分憑證驗證完成',
    direction: 'Backend · Dino',
  },
  {
    title: '這個 Google 身份有會員了嗎？',
    caption:
      '後端使用 Google 的穩定帳號識別碼 sub 查找會員。Email 是顯示資料，不用來當唯一識別碼。',
    scene: 5,
    duration: 700,
    active: ['backend', 'db'],
    route: ['backend', 'db'],
  },
  {
    title: '查詢會員資料',
    caption: '相同的 Google 身份，對應到相同的 App 會員。',
    scene: 5,
    duration: 600,
    active: ['db'],
    event: '查詢會員完成',
    direction: 'Backend → Users DB',
  },
  {
    title: '第一次登入，也可以完成註冊',
    caption:
      '資料庫還沒有這位會員，My App 使用已確認的 Google 身份，建立自己的 user 42。',
    scene: 5,
    duration: 600,
    active: ['backend', 'db'],
  },
  {
    title: 'My App 建立自己的登入狀態',
    caption:
      '找到或建立會員後，App 還要建立登入狀態，讓這個瀏覽器以 user 42 的身份使用產品。',
    scene: 5,
    duration: 700,
    active: ['backend', 'browser'],
    route: ['backend', 'browser'],
    event: '會員已就緒',
    direction: 'Users DB → Backend',
  },
  {
    title: 'Google 身份，對應到你的 App 會員',
    caption:
      'Google 負責確認 Google 帳號；My App 負責把這個身份對應到自己的會員 user 42。',
    scene: 5,
    duration: 0,
    active: ['browser'],
    event: 'My App 登入完成',
    direction: 'Backend → 瀏覽器',
  },
];
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
export interface LogEntry {
  id: number;
  title: string;
  direction: string;
  snapshot: Snapshot;
}
export interface FlowState extends Snapshot {
  paused: boolean;
  /** Set while the cancel narration plays, so stage 0 uses its own cue. */
  justCancelled: boolean;
  inspector: InspectId | null;
  review: number | null;
  logs: LogEntry[];
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
        | 'LIVE'
        | 'LOGOUT'
        | 'RESET';
    }
  | { type: 'TICK'; delta: number; run: number; stage: number }
  | { type: 'CLOCK'; elapsed: number; run: number; stage: number }
  | { type: 'ADVANCE'; run: number; stage: number }
  | { type: 'SEEK'; stage: number; offset: number }
  | { type: 'INSPECT'; target: InspectId }
  | { type: 'REVIEW'; index: number };
export function initialState(run = 0): FlowState {
  return {
    stage: 0,
    member: false,
    returning: false,
    run,
    elapsed: 0,
    paused: false,
    justCancelled: false,
    inspector: null,
    review: null,
    logs: [],
  };
}
function enter(state: FlowState, stage: number): FlowState {
  const next = {
    ...state,
    stage,
    elapsed: 0,
    member: state.member || (stage === 16 && state.stage === 15),
  };
  const step = steps[stage];
  if (step.event) {
    let title = step.event;
    if (stage === 14)
      title = state.member ? '找到既有會員 user 42' : '尚無對應的 App 會員';
    if (stage === 16)
      title = state.returning ? '使用既有會員 user 42' : '建立會員 user 42';
    const snapshot: Snapshot = {
      stage,
      member: next.member,
      returning: next.returning,
      run: next.run,
      elapsed: 0,
    };
    next.logs = [
      ...state.logs,
      { id: state.logs.length, title, direction: step.direction!, snapshot },
    ];
  }
  return next;
}
export function reducer(state: FlowState, action: Action): FlowState {
  switch (action.type) {
    case 'START':
      return state.stage === 0 && state.review === null && !state.inspector
        ? enter(
            {
              ...state,
              run: state.run + 1,
              paused: false,
              justCancelled: false,
            },
            1,
          )
        : state;
    case 'CONTINUE':
      return state.stage === 4 && state.review === null && !state.inspector
        ? enter({ ...state, paused: false }, 5)
        : state;
    case 'CANCEL':
      return state.stage === 4 && state.review === null
        ? {
            ...state,
            stage: 0,
            elapsed: 0,
            paused: false,
            justCancelled: true,
            inspector: null,
            logs: [
              ...state.logs,
              {
                id: state.logs.length,
                title: '已取消 Google 登入',
                direction: '返回 My App · 未建立會員',
                snapshot: {
                  stage: 0,
                  member: state.member,
                  returning: state.returning,
                  run: state.run,
                  elapsed: 0,
                },
              },
            ],
          }
        : state;
    case 'TICK': {
      if (
        action.run !== state.run ||
        action.stage !== state.stage ||
        state.paused ||
        state.inspector ||
        state.review !== null ||
        !steps[state.stage].duration
      )
        return state;
      const elapsed = state.elapsed + Math.max(0, action.delta);
      if (elapsed < steps[state.stage].duration) return { ...state, elapsed };
      return enter(state, nextStage(state));
    }
    case 'CLOCK':
      return action.run !== state.run ||
        action.stage !== state.stage ||
        state.paused ||
        state.inspector ||
        state.review !== null
        ? state
        : { ...state, elapsed: action.elapsed };
    case 'ADVANCE':
      return action.run !== state.run ||
        action.stage !== state.stage ||
        state.review !== null ||
        isGate(state.stage)
        ? state
        : enter(state, nextStage(state));
    case 'SEEK': {
      const target = stateAtStage(state, action.stage);
      return { ...target, elapsed: action.offset, paused: state.paused };
    }
    case 'PAUSE':
      return { ...state, paused: true };
    case 'PLAY':
      return state.review === null && !state.inspector
        ? { ...state, paused: false }
        : state;
    case 'INSPECT':
      return { ...state, inspector: action.target, paused: true };
    case 'CLOSE':
      return { ...state, inspector: null, paused: true };
    case 'REVIEW':
      return state.logs[action.index]
        ? { ...state, review: action.index, paused: true, inspector: null }
        : state;
    case 'LIVE':
      return { ...state, review: null, inspector: null, paused: true };
    case 'LOGOUT':
      return state.stage === 17 && state.review === null
        ? {
            ...initialState(state.run + 1),
            member: state.member,
            returning: state.member,
          }
        : state;
    case 'RESET':
      return initialState(state.run + 1);
  }
}
export function viewOf(state: FlowState): Snapshot {
  return state.review === null ? state : state.logs[state.review].snapshot;
}
export function captionFor(view: Snapshot): string {
  if (view.stage === 14)
    return view.member
      ? '找到 user 42！這個 Google 身份已經有會員資料，不必再建立帳號。'
      : '找不到這個 Google 身份對應的會員。接著，My App 會自動建立一個新帳號。';
  if (view.stage === 17 && view.returning)
    return '同一個 Google 身份已經有會員資料，這次直接登入，不需要再建立帳號。';
  return steps[view.stage].caption;
}

/** Stages that hold until the viewer acts; their narration waits with them. */
export function isGate(stage: number): boolean {
  return !steps[stage].duration;
}
/** True while the demo is parked waiting for the viewer to press something. */
export function isWaiting(state: FlowState): boolean {
  return isGate(state.stage) && state.review === null && !state.inspector;
}
function nextStage(state: FlowState): number {
  return state.stage === 14 && state.member ? 16 : state.stage + 1;
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
  if (stage === 0)
    return state.justCancelled ? 'cancel' : returning ? 'intro-again' : 'intro';
  if (stage === 14) return member ? 's14-found' : 's14-new';
  if (stage === 17) return returning ? 's17-return' : 's17-first';
  return `s${stage}` as CueId;
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
  for (let stage = 0; stage <= 17; stage++)
    if (!(returning && stage === 15)) stages.push(stage);
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
 * deterministic path, so seeking produces exactly the logs live playback would.
 */
export function stateAtStage(base: FlowState, target: number): FlowState {
  let state: FlowState = {
    ...initialState(base.run),
    member: base.returning,
    returning: base.returning,
  };
  while (state.stage !== target && state.stage < 17)
    state = enter(state, nextStage(state));
  return { ...state, paused: base.paused, inspector: null, review: null };
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
