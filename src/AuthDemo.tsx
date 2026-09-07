import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type Dispatch,
  type RefObject,
} from 'react';
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  CheckCheck,
  ChevronRight,
  CircleHelp,
  Database,
  Fingerprint,
  Info,
  KeyRound,
  LockKeyhole,
  LogOut,
  MousePointer2,
  Pause,
  Play,
  Volume2,
  VolumeX,
  RotateCcw,
  RotateCw,
  Search,
  Server,
  ShieldCheck,
  Signal,
  Sparkles,
  Wifi,
  X,
  UserRound,
} from 'lucide-react';
import {
  anchorNode,
  captionFor,
  lastStage,
  S,
  sceneNames,
  steps,
  type Action,
  type AnchorId,
  type FlowState,
  type InspectId,
  type NodeId,
  type Side,
  type Snapshot,
} from './flow';
import { useFlow, type Playback } from './useFlow';
import { rates } from './useNarration';
import s from './AuthDemo.module.css';

/** The one-time code this run is carrying, shown wherever it actually is. */
const demoCode = (run: number) => `DEMO-CODE-${String(run).padStart(3, '0')}`;

const packetNames = {
  request: '登入請求',
  code: '一次性代碼',
  token: 'ID Token',
};

type Anchor = (el: HTMLElement | null) => void;

/**
 * Arrows point at the thing being talked about, not at the card containing it,
 * so every element that can be one end of a leg registers itself here. The ref
 * callbacks are cached per id: a fresh one each render would make React detach
 * and reattach the element, and remeasuring forever.
 */
function useAnchors() {
  const elements = useRef(new Map<AnchorId, HTMLElement>());
  const callbacks = useRef(new Map<AnchorId, Anchor>());
  const [version, bump] = useState(0);
  const anchor = useCallback((id: AnchorId): Anchor => {
    let cached = callbacks.current.get(id);
    if (!cached) {
      cached = (el) => {
        if (el) elements.current.set(id, el);
        else elements.current.delete(id);
        bump((n) => n + 1);
      };
      callbacks.current.set(id, cached);
    }
    return cached;
  }, []);
  return { elements, anchor, version };
}

/**
 * Reveals a line once the narration has reached the part of the sentence that
 * mentions it, so a step with nothing moving still has something happening.
 */
function beat(progress: number, at: number): string {
  return `${s.beat}${progress >= at ? ` ${s.beatOn}` : ''}`;
}

export function GoogleMark({ className = '' }: { className?: string }) {
  return (
    <svg
      className={className}
      width="22"
      height="22"
      viewBox="0 0 48 48"
      aria-hidden="true"
    >
      <path
        fill="#4285F4"
        d="M43.61 24.46c0-1.36-.12-2.66-.35-3.92H24v7.42h11c-.47 2.4-1.88 4.43-4 5.8v4.82h6.48c3.79-3.49 6.13-8.63 6.13-14.12Z"
      />
      <path
        fill="#34A853"
        d="M24 44c5.4 0 9.93-1.79 13.24-4.87l-6.48-5.03c-1.8 1.2-4.1 1.92-6.76 1.92-5.2 0-9.62-3.52-11.2-8.27H6.11v5.19A20 20 0 0 0 24 44Z"
      />
      <path
        fill="#FBBC05"
        d="M12.8 27.75A12 12 0 0 1 12.17 24c0-1.3.22-2.57.63-3.75v-5.19H6.11A20 20 0 0 0 4 24c0 3.22.77 6.27 2.11 8.94l6.69-5.19Z"
      />
      <path
        fill="#EA4335"
        d="M24 11.98c2.93 0 5.56 1.01 7.63 3L37.35 9.3A19.15 19.15 0 0 0 24 4 20 20 0 0 0 6.11 15.06l6.69 5.19c1.58-4.75 6-8.27 11.2-8.27Z"
      />
    </svg>
  );
}

/** What the login screen says while the request it started is still in flight. */
const sendingHints = [
  '點一下，看看背後發生什麼',
  '登入請求已送到你的後端',
  '後端把登入網址交回瀏覽器',
  '即將前往 accounts.google.com',
];

function PhonePreview({
  view,
  dispatch,
  locked,
  waiting,
  progress,
  landed,
  anchor,
  nodeRef,
}: {
  view: Snapshot;
  dispatch: Dispatch<Action>;
  locked: boolean;
  waiting: boolean;
  progress: number;
  landed: boolean;
  anchor: (id: AnchorId) => Anchor;
  nodeRef: RefObject<HTMLDivElement | null>;
}) {
  const cta = waiting ? ` ${s.cta}` : '';
  // The consent screen stays up for the step after the press: the arrow leaves
  // the button that was pressed, so that button has to still be there.
  const consent = view.stage === S.consent || view.stage === S.granted;
  const pressed = view.stage === S.granted;
  // The button stays put while the request it sent is still travelling, so the
  // arrow really does leave the thing you pressed and come back to it.
  const ready = view.stage <= S.toGoogle;
  const sending = view.stage > S.idle && view.stage <= S.toGoogle;
  const done = view.stage === S.done;
  // Two steps, in this order: the browser is sent back to its own address —
  // nothing travelling, so no arrow — and only then does the code arrive, on
  // the packet that lands in the URL.
  const onOwnSite =
    view.stage > S.back || (view.stage === S.back && progress >= 0.4);
  const hasCode =
    view.stage > S.codeBack || (view.stage === S.codeBack && landed);
  return (
    <div className={s.phoneColumn}>
      <div className={s.phone} ref={nodeRef}>
        <div className={s.phoneScreen}>
          <div className={s.statusBar}>
            <b>9:41</b>
            <span>
              <Signal size={14} />
              <Wifi size={14} />
              <i className={s.battery} />
            </span>
          </div>
          <div
            className={s.addressBar}
            data-returning={view.stage === S.back || view.stage === S.codeBack}
          >
            <LockKeyhole size={11} />
            {view.stage >= S.consent && !onOwnSite ? (
              'accounts.google.com'
            ) : hasCode && view.stage <= S.codeToBackend ? (
              <>
                my-app.example/?code=
                <b>{demoCode(view.run)}</b>
              </>
            ) : (
              'my-app.example'
            )}
            <span>模擬</span>
          </div>
          <div className={s.phoneContent}>
            {consent ? (
              <>
                <div className={s.googleHeading}>
                  <GoogleMark />
                  <span>使用 Google 帳號繼續</span>
                </div>
                <h2>{view.returning ? '選擇帳號' : '選擇你的帳號'}</h2>
                <p>
                  繼續前往 <strong>My App</strong>
                </p>
                <div className={s.account}>
                  <span className={s.avatar}>D</span>
                  <div>
                    <strong>Dino</strong>
                    <small>dino@example.com</small>
                  </div>
                  <Check size={16} />
                </div>
                <p className={s.consentHint}>
                  {view.returning
                    ? '這個 Google 帳號已同意登入 My App。'
                    : '你已登入這個 Google 帳號。繼續後，My App 將取得你的基本身份資訊。'}
                </p>
                <div className={s.consentButtons}>
                  <button
                    className={s.lift}
                    disabled={locked || pressed}
                    onClick={() => dispatch({ type: 'CANCEL' })}
                  >
                    取消
                  </button>
                  <button
                    className={cta.trim()}
                    ref={anchor('browser.action')}
                    data-sending={pressed}
                    disabled={locked || pressed}
                    onClick={() => dispatch({ type: 'CONTINUE' })}
                  >
                    {view.returning ? '使用這個帳號' : '繼續'}
                    <ArrowRight size={15} />
                  </button>
                </div>
              </>
            ) : ready ? (
              <>
                <div className={s.appLogo}>
                  <Fingerprint size={32} strokeWidth={1.6} />
                </div>
                <span className={s.appName}>My App</span>
                <p>用熟悉的帳號，輕鬆登入。</p>
                <button
                  className={`${s.googleButton}${cta}`}
                  ref={anchor('browser.action')}
                  data-sending={sending}
                  disabled={locked || sending}
                  onClick={() => dispatch({ type: 'START' })}
                >
                  {sending ? (
                    <i className={s.buttonSpinner} aria-hidden="true" />
                  ) : (
                    <GoogleMark />
                  )}
                  <span>
                    {view.stage === S.toGoogle
                      ? '正在前往 Google…'
                      : sending
                        ? '正在為你登入…'
                        : 'Continue with Google'}
                  </span>
                </button>
                <div className={s.noPassword}>
                  <LockKeyhole size={12} />
                  {sending ? '你的密碼不會經過這裡' : '不用另外設定密碼'}
                </div>
                <div className={s.startHint}>
                  {sending ? (
                    <Sparkles size={15} />
                  ) : (
                    <MousePointer2 size={15} />
                  )}
                  <span>{sendingHints[view.stage]}</span>
                </div>
              </>
            ) : done ? (
              <>
                <div className={`${s.avatar} ${s.successAvatar}`}>
                  D
                  <span>
                    <Check size={16} />
                  </span>
                </div>
                <h2>
                  Welcome, Dino <span className={s.wave}>👋</span>
                </h2>
                <p>dino@example.com</p>
                <div className={s.signedIn} ref={anchor('browser.screen')}>
                  <CheckCheck size={16} /> 已登入 My App <span>user 42</span>
                </div>
                {/* An exit, not a call to action: no pulse, no spotlight. It is
                    how you reach the second scenario, where the member exists. */}
                <button
                  className={s.logoutButton}
                  disabled={locked}
                  onClick={() => dispatch({ type: 'LOGOUT' })}
                >
                  <LogOut size={15} />
                  登出
                </button>
              </>
            ) : (
              <>
                <div className={s.processingIcon}>
                  {view.stage === S.confirmed ? (
                    <GoogleMark />
                  ) : (
                    <Fingerprint size={36} strokeWidth={1.5} />
                  )}
                </div>
                <h2 className={s.processingTitle}>
                  {view.stage === S.confirmed
                    ? 'Google 已確認身份'
                    : view.stage === S.back && !onOwnSite
                      ? '正在返回 My App…'
                      : view.stage >= S.back && view.stage <= S.codeHeld
                        ? '已回到 My App'
                        : '正在為你登入…'}
                </h2>
                {view.stage === S.confirmed ? (
                  // The longest sentence in the lesson sits on this step, and
                  // it is about two things being different — so show both, one
                  // at a time, as the narration reaches each.
                  <div className={s.compare} ref={anchor('browser.screen')}>
                    <div className={beat(progress, 0)}>
                      <GoogleMark />
                      <span>Google 帳號</span>
                      <b>已確認</b>
                      <Check size={14} />
                    </div>
                    <div className={beat(progress, 0.42)}>
                      <Fingerprint size={17} strokeWidth={1.7} />
                      <span>My App 登入狀態</span>
                      <b className={s.pending}>尚未建立</b>
                    </div>
                    <p className={beat(progress, 0.78)}>這是兩件不同的事</p>
                  </div>
                ) : (
                  <>
                    <div
                      className={s.phoneStatus}
                      ref={anchor('browser.screen')}
                    >
                      <i aria-hidden="true" />
                      {view.stage === S.back
                        ? onOwnSite
                          ? '已回到你的應用程式'
                          : '正從 Google 被導回你的 App'
                        : view.stage === S.codeBack
                          ? hasCode
                            ? '網址帶回一組一次性代碼'
                            : 'Google 正把代碼帶回網址'
                          : view.stage === S.codeToBackend
                            ? '把代碼交給後端'
                            : view.stage === S.session
                              ? '正在建立登入狀態'
                              : '後端正在處理'}
                    </div>
                    {view.stage === S.codeBack ||
                    view.stage === S.codeToBackend ? (
                      // The same ticket the address bar just delivered, so the
                      // next step's arrow has something to pick up.
                      <div
                        className={`${s.codeTicket}${hasCode ? ` ${s.beatOn}` : ''}`}
                        aria-hidden={!hasCode}
                      >
                        <KeyRound size={13} />
                        <b>{demoCode(view.run)}</b>
                        <span>一次性代碼</span>
                      </div>
                    ) : (
                      <p>背後的系統正在合作。</p>
                    )}
                  </>
                )}
                <div className={s.phoneProgress}>
                  <span
                    style={{ width: `${(view.stage / lastStage) * 100}%` }}
                  />
                </div>
                <div className={s.progressCaption}>
                  <span>MY APP</span>
                  <span>
                    {view.stage === S.confirmed ? '尚未登入' : '處理中'}
                  </span>
                </div>
              </>
            )}
          </div>
          <div className={s.homeIndicator} />
        </div>
      </div>
      <button
        className={s.phoneCaption}
        onClick={() => dispatch({ type: 'INSPECT', target: 'browser' })}
        aria-label="檢查瀏覽器狀態"
      >
        <span>前端</span>使用者的瀏覽器 / App
      </button>
    </div>
  );
}

/** What the backend is checking on the ID Token, in the order s11 says it. */
const tokenChecks: [string, number][] = [
  ['來源是 Google', 0.28],
  ['發給這個 App', 0.55],
  ['還在有效期內', 0.8],
];
/** What the one-time code is and is not, in the order s8 says it. */
const codeFacts: [string, number][] = [
  ['短效，很快就過期', 0.34],
  ['只能用一次', 0.55],
  ['不是密碼，也不是會員資料', 0.76],
];

function SystemMap({
  view,
  dispatch,
  refs,
  paused,
  progress,
  landed,
  anchor,
}: {
  view: Snapshot;
  dispatch: Dispatch<Action>;
  refs: Record<NodeId, RefObject<HTMLDivElement | null>>;
  paused: boolean;
  progress: number;
  landed: boolean;
  anchor: (id: AnchorId) => Anchor;
}) {
  const { stage, member } = view;
  const active = steps[stage].active;
  // Google has confirmed the account once the press has actually arrived.
  const authDone = stage > S.granted || (stage === S.granted && landed);
  const backendStatus =
    stage === S.idle ||
    stage === S.consent ||
    stage === S.granted ||
    stage === S.confirmed
      ? '等待登入資料'
      : stage < S.codeHeld
        ? '準備登入流程'
        : stage < S.verify
          ? '已收到一次性代碼'
          : stage === S.verify
            ? '正在驗證憑證'
            : stage < S.lookup
              ? '身份已確認'
              : stage < S.session
                ? '正在對應 App 會員'
                : stage === S.session
                  ? '建立登入狀態'
                  : '登入處理完成';
  const dbStatus =
    stage === S.lookup
      ? '正在查找會員…'
      : stage === S.lookupResult
        ? member
          ? '找到 user 42'
          : '找不到既有會員'
        : stage === S.create
          ? '正在建立新會員…'
          : member
            ? '已有 1 位會員'
            : '尚未查詢';
  return (
    <div className={s.systemColumn}>
      <div className={s.systemBoxes}>
        <section className={s.appGroup} aria-label="你的產品">
          <div className={s.systemCardHeading}>
            <div>
              <span className={s.miniDot} />
              <strong>YOUR APP</strong>
              <span>你的產品</span>
            </div>
            <span className={s.liveBadge}>
              {stage === S.idle
                ? '等待開始'
                : stage === S.done
                  ? '已完成'
                  : paused
                    ? '已暫停'
                    : '處理中'}
            </span>
          </div>
          <div className={s.appNodes}>
            <div
              ref={refs.backend}
              className={`${s.node} ${s.backendNode} ${active.includes('backend') ? s.activeNode : ''}`}
            >
              <button
                className={s.nodeButton}
                onClick={() => dispatch({ type: 'INSPECT', target: 'backend' })}
                aria-label="檢查 Backend 狀態"
              >
                <div className={s.nodeHeading} ref={anchor('backend')}>
                  <Server size={18} />
                  <strong>Backend</strong>
                  <ArrowUpRight size={14} />
                </div>
                <div className={s.nodeStatus}>
                  <span />
                  {backendStatus}
                </div>
                {/* Sized like the database's table so the two cards match.
                    It says what the backend is holding, and it always says
                    something: an empty box beside a filled one reads as a
                    card that failed to render rather than a card with
                    nothing in it yet. The thresholds only apply on the step
                    that narrates them; later steps show the finished list. */}
                <div className={s.nodeDetail}>
                  {stage < S.codeHeld && (
                    <span className={s.detailEmpty}>
                      <span className={s.factDot} />
                      尚未收到任何憑證
                    </span>
                  )}
                  {stage >= S.codeHeld &&
                    stage < S.verify &&
                    codeFacts.map(([label, at]) => (
                      <span
                        key={label}
                        className={beat(
                          progress,
                          stage === S.codeHeld ? at : 0,
                        )}
                      >
                        <span className={s.factDot} />
                        {label}
                      </span>
                    ))}
                  {stage >= S.verify &&
                    tokenChecks.map(([label, at]) => (
                      <span
                        key={label}
                        className={beat(progress, stage === S.verify ? at : 0)}
                        data-checked={stage > S.verify || progress >= at}
                      >
                        <Check size={12} />
                        {label}
                      </span>
                    ))}
                </div>
              </button>
              <div className={s.receiptSlot} ref={anchor('backend.receipt')}>
                {stage >= S.codeHeld && (
                  <button
                    className={s.receipt}
                    onClick={() =>
                      dispatch({
                        type: 'INSPECT',
                        target: stage >= S.verify ? 'token' : 'code',
                      })
                    }
                  >
                    <KeyRound size={12} />
                    {stage >= S.verify ? 'ID Token' : '一次性代碼'}
                    <ArrowUpRight size={12} />
                  </button>
                )}
              </div>
            </div>
            <div
              ref={refs.db}
              className={`${s.node} ${s.databaseNode} ${active.includes('db') ? s.activeNode : ''}`}
            >
              <button
                className={s.nodeButton}
                onClick={() => dispatch({ type: 'INSPECT', target: 'db' })}
                aria-label="檢查 Users DB 狀態"
              >
                <div className={s.nodeHeading}>
                  <Database size={18} />
                  <strong>Users DB</strong>
                  <ArrowUpRight size={14} />
                </div>
                <div className={s.nodeStatus}>
                  <span />
                  {dbStatus}
                </div>
                <div className={s.databasePreview} ref={anchor('db')}>
                  {member ? (
                    <>
                      <span className={s.dbUser}>
                        <span>D</span>
                        <strong>
                          Dino<small>user 42 · Google</small>
                        </strong>
                        <Check size={14} />
                      </span>
                    </>
                  ) : (
                    <>
                      <div className={s.tableHeader}>
                        <span>ID</span>
                        <span>USER</span>
                        <span>PROVIDER</span>
                      </div>
                      <div className={s.emptyRow}>
                        <span>—</span>
                        <span>還沒有會員資料</span>
                      </div>
                    </>
                  )}
                </div>
              </button>
              <div className={s.receiptSlot}>
                {member && (
                  <span className={s.memberChip}>
                    <Check size={12} />
                    user 42
                  </span>
                )}
              </div>
            </div>
          </div>
        </section>
        <section className={s.googleGroup} aria-label="Google Identity">
          <div className={s.systemCardHeading}>
            <div>
              <span className={s.googleHeadingDot} />
              <strong>GOOGLE IDENTITY</strong>
              <span>第三方身份提供者</span>
            </div>
            <span className={s.liveBadge}>
              {authDone ? '身份已確認' : '等待確認'}
            </span>
          </div>
          <div className={s.exchangeHint}>
            <LockKeyhole size={12} />
            {stage >= S.exchange && stage <= S.verified
              ? 'Backend 正在直接與 Google 溝通'
              : 'Google 只負責確認身份'}
          </div>
          <div
            ref={refs.google}
            className={`${s.googleNode} ${active.includes('google') ? s.activeNode : ''}`}
          >
            <button
              className={s.nodeButton}
              onClick={() => dispatch({ type: 'INSPECT', target: 'google' })}
              aria-label="檢查 Google 狀態"
            >
              <div className={s.googleNodeHeading}>
                <span className={s.googleIcon}>
                  <GoogleMark />
                </span>
                <div>
                  <strong>Google Identity</strong>
                  <span>第三方身份提供者</span>
                </div>
                <span className={s.googleState}>
                  {authDone ? (
                    <>
                      <Check size={12} />
                      身份已確認
                    </>
                  ) : (
                    '等待確認'
                  )}
                </span>
              </div>
              <div className={s.googleServices}>
                <span ref={anchor('google.auth')} data-done={authDone}>
                  <Fingerprint size={17} />
                  <span>
                    帳號確認<small>Authentication</small>
                  </span>
                  <Check size={14} className={s.serviceCheck} />
                </span>
                <span
                  ref={anchor('google.token')}
                  data-done={stage >= S.verify}
                >
                  <ShieldCheck size={17} />
                  <span>
                    身分憑證<small>Identity Service</small>
                  </span>
                  <Check size={14} className={s.serviceCheck} />
                </span>
              </div>
            </button>
          </div>
        </section>
      </div>
      <div className={s.systemCaption}>
        <span className={s.purpleDot} />
        <strong>登入背後的世界</strong>
        <MousePointer2 size={13} />
        點擊系統或資料標籤，停下來看看
      </div>
    </div>
  );
}

function DataFlow({
  view,
  refs,
  anchors,
  version,
  area,
  dispatch,
  elapsed,
  flight,
}: {
  view: Snapshot;
  refs: Record<NodeId, RefObject<HTMLDivElement | null>>;
  anchors: RefObject<Map<AnchorId, HTMLElement>>;
  /** Bumped whenever an anchor mounts or unmounts, so the path remeasures. */
  version: number;
  area: RefObject<HTMLDivElement | null>;
  dispatch: Dispatch<Action>;
  /** Time into this step off whichever clock is driving it. */
  elapsed: number;
  flight: number;
}) {
  const markerId = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const [geometry, setGeometry] = useState({ width: 1, height: 1, path: '' });
  const pathRef = useRef<SVGPathElement>(null);
  const packetRef = useRef<HTMLButtonElement>(null);
  /** The leg and the exact curve the packet was last placed on. The glide is
   *  only ever for moving along one curve; landing on a different one — a new
   *  leg, or the same leg re-measured — has to be a jump. */
  const placedOn = useRef({ stage: -1, path: '' });
  const [reduced, setReduced] = useState(false);
  const step = steps[view.stage];
  const from = step.route?.[0],
    to = step.route?.[1],
    sides = step.sides;
  useEffect(() => {
    const mq = matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  useLayoutEffect(() => {
    if (!from || !to || !area.current) return;
    // An anchor that has not rendered yet falls back to its whole card, so a
    // leg never disappears just because its endpoint is a step away.
    const resolve = (id: AnchorId): HTMLElement | null =>
      anchors.current.get(id) ?? refs[anchorNode[id]].current;
    const measure = () => {
      const source = resolve(from),
        sink = resolve(to);
      if (!area.current || !source || !sink) return;
      const parent = area.current.getBoundingClientRect();
      const a = source.getBoundingClientRect();
      const b = sink.getBoundingClientRect();
      const dx = b.left + b.width / 2 - (a.left + a.width / 2);
      const dy = b.top + b.height / 2 - (a.top + a.height / 2);
      // Unless the step names its edges, the leg leaves and arrives on the axis
      // it travels furthest along.
      const [sideA, sideB]: [Side, Side] =
        sides ??
        (Math.abs(dx) > Math.abs(dy)
          ? dx > 0
            ? ['right', 'left']
            : ['left', 'right']
          : dy > 0
            ? ['bottom', 'top']
            : ['top', 'bottom']);
      const edge = (r: DOMRect, side: Side) => ({
        x:
          (side === 'left'
            ? r.left
            : side === 'right'
              ? r.right
              : r.left + r.width / 2) - parent.left,
        y:
          (side === 'top'
            ? r.top
            : side === 'bottom'
              ? r.bottom
              : r.top + r.height / 2) - parent.top,
      });
      const normal = (side: Side) => ({
        x: side === 'left' ? -1 : side === 'right' ? 1 : 0,
        y: side === 'top' ? -1 : side === 'bottom' ? 1 : 0,
      });
      const p1 = edge(a, sideA),
        p2 = edge(b, sideB);
      const ex = p2.x - p1.x,
        ey = p2.y - p1.y;
      // Each end leaves along its own edge's normal. Half the travel on that
      // axis redraws the plain side-to-side legs exactly as they were; the
      // floor is what bows a leg whose two ends face the same way, capped so
      // the arc cannot climb out of the board and get clipped.
      const reach = Math.min(Math.hypot(ex, ey) * 0.34, 56);
      const pull = (n: { x: number; y: number }) =>
        Math.max(Math.abs(ex * n.x + ey * n.y) / 2, reach);
      const na = normal(sideA),
        nb = normal(sideB);
      const pa = pull(na),
        pb = pull(nb);
      const path =
        `M ${p1.x} ${p1.y} C ${p1.x + na.x * pa} ${p1.y + na.y * pa},` +
        ` ${p2.x + nb.x * pb} ${p2.y + nb.y * pb}, ${p2.x} ${p2.y}`;
      // Only when it really moved. A stage change resizes half the board, so
      // the observer fires several times on the frames that matter most; an
      // identical path must not cost another render of the whole lesson.
      setGeometry((current) =>
        current.path === path &&
        current.width === parent.width &&
        current.height === parent.height
          ? current
          : { width: parent.width, height: parent.height, path },
      );
    };
    const observer = new ResizeObserver(measure);
    observer.observe(area.current);
    for (const ref of Object.values(refs))
      if (ref.current) observer.observe(ref.current);
    for (const id of [from, to]) {
      const el = resolve(id);
      if (el) observer.observe(el);
    }
    measure();
    return () => observer.disconnect();
  }, [from, to, sides, area, refs, anchors, version, view.stage]);
  useLayoutEffect(() => {
    const path = pathRef.current,
      packet = packetRef.current;
    if (!path || !packet || typeof path.getTotalLength !== 'function') return;
    // React writes the same value on its own render; writing it here first
    // means the point is never taken from the leg that just ended.
    if (path.getAttribute('d') !== geometry.path)
      path.setAttribute('d', geometry.path);
    const p = path.getPointAtLength(
      path.getTotalLength() *
        (reduced ? 0.5 : Math.min(1, Math.max(0, elapsed) / flight)),
    );
    // Moved by transform rather than by left/top, and written straight to the
    // node: positioning through React state re-rendered the whole lesson once
    // per frame, and left/top invalidated layout with it. Both cost the most
    // on the first frames of a leg, where the stage change is already
    // rebuilding the phone, the cards and the anchors.
    // The measuring pass runs first and re-renders this component, so the very
    // first placement of a leg is still on the outgoing curve. Keying the jump
    // on the curve as well as the stage is what stops the correction that
    // follows from being animated across the board.
    const jumped =
      placedOn.current.stage !== view.stage ||
      placedOn.current.path !== geometry.path;
    placedOn.current = { stage: view.stage, path: geometry.path };
    if (jumped) packet.style.transition = 'none';
    packet.style.transform = `translate(${p.x}px, ${p.y}px) translate(-50%, -50%)`;
    if (jumped) {
      // Land on the new leg's start with no glide, then hand the glide back.
      void packet.offsetWidth;
      packet.style.transition = '';
    }
  }, [geometry.path, elapsed, reduced, flight, view.stage]);
  if (!step.route || !geometry.path) return null;
  const label =
    step.packetLabel ??
    (step.packet
      ? packetNames[step.packet]
      : to === 'db'
        ? '查找會員'
        : '登入狀態');
  return (
    <div className={s.flowOverlay}>
      <svg width={geometry.width} height={geometry.height} aria-hidden="true">
        <defs>
          <marker
            id={markerId}
            markerWidth="6"
            markerHeight="6"
            refX="5"
            refY="3"
            orient="auto"
          >
            <path d="M0 0 L6 3 L0 6Z" fill="#8b5cf6" />
          </marker>
        </defs>
        <path
          ref={pathRef}
          d={geometry.path}
          fill="none"
          stroke="#8b5cf6"
          strokeWidth="2"
          strokeDasharray="5 5"
          markerEnd={`url(#${markerId})`}
        />
      </svg>
      <button
        ref={packetRef}
        className={s.packet}
        onClick={() =>
          dispatch({
            type: 'INSPECT',
            target:
              step.packetInspect ??
              step.packet ??
              (to === 'db' ? 'db' : 'backend'),
          })
        }
        aria-label={`檢查${label}`}
      >
        <span />
        {label}
        <ArrowUpRight size={11} />
      </button>
    </div>
  );
}

function inspection(
  view: Snapshot,
  target: InspectId,
): { title: string; detail: string; rows: [string, string][] } {
  const code = demoCode(view.run);
  if (target === 'code')
    return {
      title: '一次性代碼 · Authorization Code',
      detail:
        view.stage >= S.exchange
          ? '後端正拿它向 Google 交換身分憑證，並附上只有後端知道的密鑰 — 這就是這一步必須在後端做的原因。'
          : '短效、一次性的兌換憑證。它不是密碼，也不是會員資料；後端還需要拿它向 Google 交換身分憑證。',
      rows: [
        [
          '傳輸路徑',
          view.stage >= S.exchange
            ? 'Backend → Google'
            : 'Google → 瀏覽器 → Backend',
        ],
        ['Code', view.stage >= S.codeBack ? code : '尚未收到'],
        ['性質', '短效 · 一次性 · 非密碼'],
        // The narration teaches the client secret here, so the panel has to
        // show it — and show that it never leaves the backend.
        ...(view.stage >= S.exchange
          ? ([['一併附上', '應用程式密鑰 client_secret · 只存在後端']] as [
              string,
              string,
            ][])
          : []),
      ],
    };
  if (target === 'token')
    return {
      title: '身分憑證 · ID Token',
      detail:
        view.stage >= S.verified
          ? '後端已確認憑證來源、適用的 App 與有效期限，接著使用 Google 識別碼對應會員。'
          : '這是 Google 提供的身份資訊；收到後，Backend 還需要驗證憑證。',
      rows:
        view.stage >= S.tokenBack
          ? [
              ['傳輸路徑', 'Google → Backend'],
              ['Google 識別碼 sub', '108253…'],
              ['Email', 'dino@example.com'],
              ['名稱', 'Dino'],
              ['驗證狀態', view.stage >= S.verified ? '✓ 已驗證' : '尚未完成'],
            ]
          : [['ID Token', '尚未收到']],
    };
  if (target === 'request')
    return {
      title: '登入請求 · Authentication request',
      detail:
        '讓 Google 知道是哪個 App 想確認身份。這裡只顯示教學需要的欄位，並非完整請求。',
      rows: [
        ['請求來源', 'My App'],
        [
          'App 識別碼 client_id',
          view.stage >= S.redirect ? 'my-app-demo' : '後端準備中',
        ],
        ['目的', '請 Google 確認使用者身份'],
      ],
    };
  if (target === 'db')
    return {
      title: '你的會員資料庫 · Users DB',
      detail:
        '以 Google 的穩定識別碼 sub 對應會員。這裡的資料只存在於本次教學示範，重新整理即清空。',
      rows: view.member
        ? [
            ['id', '42'],
            ['provider', 'Google'],
            ['provider_id', '108253…'],
            ['email', 'dino@example.com'],
          ]
        : [
            ['會員資料', '尚未建立'],
            [
              '查詢狀態',
              view.stage >= S.lookupResult
                ? '找不到既有會員'
                : view.stage === S.lookup
                  ? '查詢中'
                  : '尚未查詢',
            ],
          ],
    };
  if (target === 'google')
    return {
      title: '第三方身份提供者 · Google',
      detail:
        'Google 確認 Google 帳號身份。它不知道你產品裡的 user 42，也不會把 Google 密碼交給你的 App。',
      rows: [
        [
          '帳號確認',
          view.stage >= S.granted ? '✓ Dino · dino@example.com' : '等待確認',
        ],
        [
          '身分憑證',
          view.stage >= S.tokenBack ? '已發出 ID Token' : '尚未發出',
        ],
        ['Google 密碼', '不會提供給 My App'],
      ],
    };
  if (target === 'browser')
    return {
      title: '使用者的瀏覽器 / App',
      detail:
        '你在這裡操作登入，瀏覽器負責前往 Google，再把一次性代碼帶回自己的後端。',
      rows: [
        [
          '目前頁面',
          view.stage >= S.consent && view.stage <= S.back ? 'Google' : 'My App',
        ],
        [
          'App 登入狀態',
          view.stage === S.done ? '✓ user 42 已登入' : '尚未登入',
        ],
      ],
    };
  return {
    title: '你的後端 · Backend',
    detail:
      '後端交換並驗證身分憑證，找到或建立自己的會員，最後建立 App 的登入狀態。',
    rows: [
      ['應用程式密鑰 client_secret', '只存在這裡，不會給瀏覽器'],
      ['一次性代碼', view.stage >= S.codeHeld ? code : '尚未收到'],
      [
        'ID Token',
        view.stage >= S.verify
          ? view.stage >= S.verified
            ? '✓ 已驗證'
            : '正在驗證'
          : '尚未收到',
      ],
      ['App 會員對應', view.stage >= S.session ? 'user 42' : '尚未完成'],
      ['App 登入', view.stage === S.done ? '✓ 已完成' : '尚未完成'],
    ],
  };
}

function Inspector({
  state,
  view,
  dispatch,
}: {
  state: FlowState;
  view: Snapshot;
  dispatch: Dispatch<Action>;
}) {
  const details = state.inspector ? inspection(view, state.inspector) : null;
  const inspectorRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!state.inspector) return;
    const opener = document.activeElement as HTMLElement | null;
    inspectorRef.current?.focus({ preventScroll: true });
    return () => {
      if (opener?.isConnected) opener.focus({ preventScroll: true });
    };
  }, [state.inspector]);
  // What the lesson is actually collecting, in the order it collects it. Each
  // one opens the panel that explains it, so the invitation to click is on
  // screen the whole way through rather than only in the closing line.
  const facts: [string, string, InspectId, boolean][] = [
    [
      '一次性代碼',
      view.stage >= S.tokenBack
        ? '已交換掉'
        : view.stage >= S.codeBack
          ? demoCode(view.run)
          : '尚未取得',
      'code',
      view.stage >= S.codeBack,
    ],
    [
      'ID Token',
      view.stage >= S.verified
        ? '已驗證'
        : view.stage >= S.tokenBack
          ? '已收到'
          : '尚未取得',
      'token',
      view.stage >= S.tokenBack,
    ],
    ['App 會員', view.member ? 'user 42' : '尚未建立', 'db', view.member],
  ];
  return (
    <section
      ref={inspectorRef}
      tabIndex={-1}
      className={`${s.inspector} ${details ? s.inspectorOpen : ''}`}
      aria-label="當前解說"
    >
      <div className={s.inspectorIcon}>
        {details ? <Search size={20} /> : <Info size={20} />}
      </div>
      <div className={s.inspectorContent}>
        <h3 aria-live="polite">{details?.title || steps[view.stage].title}</h3>
        <p>{details?.detail || captionFor(view)}</p>
        {details ? (
          <dl className={s.detailRows}>
            {details.rows.map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <>
            <div className={s.facts}>
              {facts.map(([label, value, target, done]) => (
                <button
                  key={label}
                  data-done={done}
                  onClick={() => dispatch({ type: 'INSPECT', target })}
                  // Distinct from the packet's own "檢查一次性代碼": this one
                  // opens the data, wherever that data currently is.
                  aria-label={`檢查${label}資料`}
                >
                  {done ? <Check size={13} /> : <CircleHelp size={13} />}
                  {label}
                  <b>{value}</b>
                  <ArrowUpRight size={11} />
                </button>
              ))}
            </div>
            {view.stage === S.done && (
              <p className={s.replayHint}>
                <MousePointer2 size={13} />
                流程走完了 —— 回頭點點看 Backend、Users
                DB，或任何一個飛過的封包，每一個都能打開看裡面裝了什麼。
              </p>
            )}
          </>
        )}
      </div>
      {details && (
        <button
          className={s.closeInspector}
          onClick={() => dispatch({ type: 'CLOSE' })}
          aria-label="關閉資料檢查"
        >
          <X size={18} />
        </button>
      )}
    </section>
  );
}

function formatTime(ms: number) {
  const total = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

function PlaybackControls({
  state,
  dispatch,
  playback,
}: {
  state: FlowState;
  dispatch: Dispatch<Action>;
  playback: Playback;
}) {
  const { narration, position, total, seekTo, waiting } = playback;
  const trackRef = useRef<HTMLDivElement>(null);
  // While a finger is down the thumb follows it alone. The clock keeps running
  // underneath, and the seek is committed once, on release — a seek per pointer
  // move would reload the clip mid-drag and fight the bar for the position.
  const [scrub, setScrub] = useState<number | null>(null);
  const scrubRef = useRef<number | null>(null);
  const at = scrub ?? position;
  const paused = state.paused || narration.blocked;
  // The label speaks for the narration, so it reads the narration pointer.
  const label = narration.blocked
    ? '按播放，開始語音解說'
    : state.paused
      ? '已暫停 · 按播放繼續'
      : state.audio === S.idle
        ? '等待你開始登入'
        : state.audio === S.consent
          ? '等待你確認 Google 帳號'
          : state.audio === lastStage
            ? '這次登入已完成'
            : state.hand
              ? '解說進行中 · 畫面由你操作'
              : '解說進行中';

  // Clamped to what the demo will actually honour, so the thumb never runs
  // somewhere the release would snap it back from.
  const pointAt = (clientX: number) => {
    const box = trackRef.current!.getBoundingClientRect();
    const ratio = box.width ? (clientX - box.left) / box.width : 0;
    return Math.max(0, Math.min(ratio * total, total));
  };
  const pct = (ms: number) => `${total ? (ms / total) * 100 : 0}%`;
  const nudge = (delta: number) => seekTo(at + delta);
  // Mirrored in a ref: pointer handlers fire between renders, and a stale
  // closure here would either drop the drag or seek to it twice.
  const hold = (ms: number | null) => {
    scrubRef.current = ms;
    setScrub(ms);
  };
  const release = () => {
    if (scrubRef.current !== null) seekTo(scrubRef.current);
    hold(null);
  };

  return (
    <div className={s.playback}>
      <div className={s.playbackInner}>
        <span
          className={s.dockAvatar}
          data-speaking={narration.speaking}
          aria-hidden="true"
        >
          D
        </span>
        <button
          className={s.playButton}
          aria-label={paused ? '繼續播放' : '暫停流程'}
          onClick={() => {
            if (state.paused) dispatch({ type: 'PLAY' });
            else if (narration.blocked) narration.resume();
            else dispatch({ type: 'PAUSE' });
          }}
        >
          {paused ? (
            <Play size={18} fill="currentColor" />
          ) : (
            <Pause size={18} fill="currentColor" />
          )}
        </button>
        <button
          className={s.skipButton}
          aria-label="倒退 10 秒"
          disabled={at < 500}
          onClick={() => nudge(-10000)}
        >
          <RotateCcw size={19} strokeWidth={1.7} />
          <span aria-hidden="true">10</span>
        </button>
        <button
          className={s.skipButton}
          aria-label="快進 10 秒"
          disabled={total - at < 500}
          onClick={() => nudge(10000)}
        >
          <RotateCw size={19} strokeWidth={1.7} />
          <span aria-hidden="true">10</span>
        </button>
        <div className={s.playbackStatus}>
          <div className={s.playbackLabel}>
            {/* Reads the narration pointer, like the sentence beside it: the
                dock speaks for the clip, not for wherever the viewer has
                clicked the scene to. */}
            <span className={s.dockScene}>
              <b>{`0${steps[state.audio].scene}`}</b>
              {sceneNames[steps[state.audio].scene - 1]}
            </span>
            <span>{label}</span>
            {waiting && <span className={s.waitingChip}>等你操作</span>}
          </div>
          <div className={s.trackRow}>
            <time className={s.clock}>{formatTime(at)}</time>
            <div
              ref={trackRef}
              className={s.progressTrack}
              data-scrubbing={scrub !== null || undefined}
              role="slider"
              tabIndex={0}
              aria-label="解說進度"
              aria-valuemin={0}
              aria-valuemax={Math.round(total / 1000)}
              aria-valuenow={Math.round(at / 1000)}
              aria-valuetext={`${formatTime(at)} / ${formatTime(total)}`}
              onPointerDown={(event) => {
                // Keeps the drag from selecting the text around the dock; the
                // track still takes focus so the arrow keys stay available.
                event.preventDefault();
                event.currentTarget.focus();
                event.currentTarget.setPointerCapture?.(event.pointerId);
                hold(pointAt(event.clientX));
              }}
              onPointerMove={(event) => {
                if (scrubRef.current !== null) hold(pointAt(event.clientX));
              }}
              onPointerUp={release}
              onLostPointerCapture={release}
              onPointerCancel={() => hold(null)}
              onKeyDown={(event) => {
                if (event.key === 'ArrowLeft') nudge(-5000);
                else if (event.key === 'ArrowRight') nudge(5000);
                else if (event.key === 'Home') seekTo(0);
                else if (event.key === 'End') seekTo(total);
                else return;
                event.preventDefault();
              }}
            >
              <span className={s.progressFill} style={{ width: pct(at) }} />
            </div>
            <time className={s.clock}>{formatTime(total)}</time>
          </div>
        </div>
        <button
          className={s.rateButton}
          aria-label="播放速度"
          onClick={() =>
            narration.setRate(
              rates[(rates.indexOf(narration.rate) + 1) % rates.length],
            )
          }
        >
          {narration.rate.toFixed(narration.rate % 1 ? 2 : 1)}×
        </button>
        <button
          className={s.muteButton}
          aria-label={narration.muted ? '取消靜音' : '靜音'}
          onClick={narration.toggleMuted}
        >
          {narration.muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
        </button>
      </div>
    </div>
  );
}

export function AuthDemo() {
  const { state, dispatch, playback } = useFlow();
  const area = useRef<HTMLDivElement>(null);
  const browser = useRef<HTMLDivElement>(null),
    backend = useRef<HTMLDivElement>(null),
    google = useRef<HTMLDivElement>(null),
    db = useRef<HTMLDivElement>(null);
  const [refs] = useState(() => ({ browser, backend, google, db }));
  const { elements, anchor, version } = useAnchors();
  const card = useRef<HTMLElement>(null);
  const { waiting } = playback;
  const lessonMinutes = Math.max(1, Math.round(playback.total / 60000));
  return (
    <>
      <header className={s.siteHeader}>
        <div className={s.brand}>
          氛圍學院<span>VIBE ACADEMY</span>
        </div>
        <nav aria-label="課程位置">
          <span>後端：邏輯、資料與服務架構</span>
          <ChevronRight size={14} />
          <strong>身份驗證與第三方登入</strong>
        </nav>
        <span className={s.demoBadge}>
          <Sparkles size={14} />
          互動教學 Demo
        </span>
      </header>
      <main className={s.page}>
        <aside className={s.avatarRail} aria-label="課程講解者">
          <div
            className={s.avatarCircle}
            data-speaking={playback.narration.speaking}
          >
            <span>D</span>
            <UserRound size={36} />
            <i className={s.speaking} aria-hidden="true" />
          </div>
          <strong>Dino</strong>
          <span className={s.avatarRole}>課程講解</span>
          <button className={s.followButton}>
            <Sparkles size={14} />
            跟隨解說
          </button>
        </aside>
        <div className={s.breadcrumb}>
          <span>後端的核心概念</span>
          <ChevronRight size={12} />
          <span>身份驗證</span>
        </div>
        <article className={s.lessonCard} ref={card}>
          <div className={s.lessonHeading}>
            <div className={s.titleRow}>
              <h1>
                按下 Google 登入之後，
                <br className={s.mobileBreak} />
                發生了什麼？
              </h1>
              <button
                className={s.playBubble}
                aria-label={`從頭播放解說，全長約 ${lessonMinutes} 分鐘`}
                onClick={() => {
                  playback.restart();
                  card.current?.scrollIntoView?.({
                    behavior: matchMedia('(prefers-reduced-motion: reduce)')
                      .matches
                      ? 'auto'
                      : 'smooth',
                    block: 'start',
                  });
                }}
              >
                <Play size={12} fill="currentColor" />
                {lessonMinutes} 分鐘
              </button>
            </div>
            <button
              className={s.resetButton}
              aria-label="重設示範"
              onClick={() => dispatch({ type: 'RESET' })}
            >
              <RotateCcw size={16} />
              <span>重設示範</span>
            </button>
          </div>
          <p className={s.intro}>
            試著用 Google 登入。留意背後：
            <strong>現在是誰在處理，又傳了什麼資料？</strong>
          </p>
          <ol className={s.sceneStrip} aria-label="登入流程階段">
            {sceneNames.map((name, i) => (
              <li
                key={name}
                className={
                  steps[state.stage].scene === i + 1
                    ? s.currentScene
                    : steps[state.stage].scene > i + 1
                      ? s.completedScene
                      : ''
                }
                aria-current={
                  steps[state.stage].scene === i + 1 ? 'step' : undefined
                }
              >
                <span>
                  {steps[state.stage].scene > i + 1 ? (
                    <Check size={12} />
                  ) : (
                    `0${i + 1}`
                  )}
                </span>
                {name}
              </li>
            ))}
          </ol>
          <div className={`${s.experiment}${waiting ? ` ${s.spotlight}` : ''}`}>
            <div className={s.scrim} aria-hidden="true" />
            <div className={s.stageArea} ref={area}>
              <PhonePreview
                view={state}
                dispatch={dispatch}
                locked={!!state.inspector}
                waiting={waiting}
                progress={playback.stepProgress}
                landed={playback.landed}
                anchor={anchor}
                nodeRef={browser}
              />
              <SystemMap
                view={state}
                dispatch={dispatch}
                refs={refs}
                paused={state.paused}
                progress={playback.stepProgress}
                landed={playback.landed}
                anchor={anchor}
              />
              <DataFlow
                flight={playback.flight}
                elapsed={playback.stepElapsed}
                view={state}
                refs={refs}
                anchors={elements}
                version={version}
                area={area}
                dispatch={dispatch}
              />
            </div>
            <Inspector state={state} view={state} dispatch={dispatch} />
          </div>
          <PlaybackControls
            state={state}
            dispatch={dispatch}
            playback={playback}
          />
        </article>
        <footer className={s.pageFooter}>
          <span>
            <ShieldCheck size={14} />以 OpenID Connect 示範後端處理的 Google
            登入流程；僅展示與本課相關的資料。
          </span>
          <a
            href="https://developers.google.com/identity/openid-connect/openid-connect"
            target="_blank"
            rel="noreferrer"
          >
            技術參考
            <ArrowUpRight size={13} />
          </a>
        </footer>
      </main>
    </>
  );
}
