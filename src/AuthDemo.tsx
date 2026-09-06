import {
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
  Code2,
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
  captionFor,
  isWaiting,
  sceneNames,
  steps,
  viewOf,
  type Action,
  type FlowState,
  type InspectId,
  type NodeId,
  type Snapshot,
} from './flow';
import { useFlow, type Playback } from './useFlow';
import { rates } from './useNarration';
import s from './AuthDemo.module.css';

const packetNames = {
  request: '登入請求',
  code: '一次性代碼',
  token: 'ID Token',
};

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

function PhonePreview({
  view,
  dispatch,
  locked,
  waiting,
  nodeRef,
}: {
  view: Snapshot;
  dispatch: Dispatch<Action>;
  locked: boolean;
  waiting: boolean;
  nodeRef: RefObject<HTMLDivElement | null>;
}) {
  const cta = waiting ? ` ${s.cta}` : '';
  const consent = view.stage === 4;
  const ready = view.stage === 0;
  const done = view.stage === 17;
  return (
    <div className={s.phoneColumn}>
      <div className={s.areaLabel}>
        <span className={s.blueDot} /> 你看得見的畫面 <span>BROWSER</span>
      </div>
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
          <div className={s.addressBar}>
            <LockKeyhole size={11} />
            {view.stage >= 4 && view.stage <= 6
              ? 'accounts.google.com'
              : 'my-app.example'}
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
                    disabled={locked}
                    onClick={() => dispatch({ type: 'CANCEL' })}
                  >
                    取消
                  </button>
                  <button
                    className={cta.trim()}
                    disabled={locked}
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
                <h2>
                  歡迎回來<span>從這裡，開始。</span>
                </h2>
                <p>用熟悉的帳號，輕鬆登入。</p>
                <button
                  className={`${s.googleButton}${cta}`}
                  disabled={locked}
                  onClick={() => dispatch({ type: 'START' })}
                >
                  <GoogleMark />
                  <span>Continue with Google</span>
                </button>
                <div className={s.noPassword}>
                  <LockKeyhole size={12} /> 不用另外設定密碼
                </div>
                <div className={s.startHint}>
                  <MousePointer2 size={15} />
                  <span>點一下，看看背後發生什麼</span>
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
                <div className={s.signedIn}>
                  <CheckCheck size={16} /> 已登入 My App <span>user 42</span>
                </div>
                <button
                  className={`${s.logoutButton}${cta}`}
                  disabled={locked}
                  onClick={() => dispatch({ type: 'LOGOUT' })}
                >
                  <LogOut size={15} />
                  登出，再試一次
                </button>
              </>
            ) : (
              <>
                <div className={s.processingIcon}>
                  {view.stage === 5 ? (
                    <GoogleMark />
                  ) : (
                    <Fingerprint size={36} strokeWidth={1.5} />
                  )}
                </div>
                <h2 className={s.processingTitle}>
                  {view.stage === 5
                    ? 'Google 已確認身份'
                    : view.stage >= 6 && view.stage <= 8
                      ? '正在返回 My App…'
                      : '正在為你登入…'}
                </h2>
                <p>
                  {view.stage === 5
                    ? '接下來，回到你的 App。'
                    : '背後的系統正在合作。'}
                </p>
                <div className={s.phoneProgress}>
                  <span style={{ width: `${(view.stage / 17) * 100}%` }} />
                </div>
                <div className={s.progressCaption}>
                  <span>MY APP</span>
                  <span>{view.stage === 5 ? '尚未登入' : '處理中'}</span>
                </div>
              </>
            )}
          </div>
          <div className={s.phoneFootnote}>
            <ShieldCheck size={12} />
            教學模擬，不會連線至 Google
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

function SystemMap({
  view,
  dispatch,
  refs,
  paused,
}: {
  view: Snapshot;
  dispatch: Dispatch<Action>;
  refs: Record<NodeId, RefObject<HTMLDivElement | null>>;
  paused: boolean;
}) {
  const { stage, member } = view;
  const active = steps[stage].active;
  const backendStatus =
    stage === 0 || stage === 4 || stage === 5
      ? '等待登入資料'
      : stage < 8
        ? '準備登入流程'
        : stage < 11
          ? '已收到一次性代碼'
          : stage === 11
            ? '正在驗證憑證'
            : stage < 13
              ? '身份已確認'
              : stage < 16
                ? '正在對應 App 會員'
                : stage === 16
                  ? '建立登入狀態'
                  : '登入處理完成';
  const dbStatus =
    stage === 13
      ? '正在查找會員…'
      : stage === 14
        ? member
          ? '找到 user 42'
          : '找不到既有會員'
        : stage === 15
          ? '正在建立新會員…'
          : member
            ? '已有 1 位會員'
            : '尚未查詢';
  return (
    <div className={s.systemColumn}>
      <div className={s.areaLabel}>
        <span className={s.purpleDot} /> 登入背後的世界{' '}
        <span>BEHIND THE SCENES</span>
      </div>
      <div className={s.systemBoxes}>
        <section className={s.appGroup} aria-label="你的產品">
          <div className={s.systemCardHeading}>
            <div>
              <span className={s.miniDot} />
              <strong>YOUR APP</strong>
              <span>你的產品</span>
            </div>
            <span className={s.liveBadge}>
              {stage === 0
                ? '等待開始'
                : stage === 17
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
                <div className={s.nodeHeading}>
                  <Server size={18} />
                  <strong>Backend</strong>
                  <ArrowUpRight size={14} />
                </div>
                <span className={s.nodeSubtitle}>你的後端</span>
                <div className={s.rack} aria-hidden="true">
                  <div>
                    <i />
                    <span />
                    <span />
                  </div>
                  <div>
                    <i />
                    <span />
                    <span />
                  </div>
                </div>
                <div className={s.nodeStatus}>
                  <span />
                  {backendStatus}
                </div>
              </button>
              <div className={s.receiptSlot}>
                {stage >= 8 && (
                  <button
                    className={s.receipt}
                    onClick={() =>
                      dispatch({
                        type: 'INSPECT',
                        target: stage >= 11 ? 'token' : 'code',
                      })
                    }
                  >
                    <KeyRound size={12} />
                    {stage >= 11 ? 'ID Token' : '一次性代碼'}
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
                <span className={s.nodeSubtitle}>你的會員資料庫</span>
                <div className={s.databasePreview}>
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
                <div className={s.nodeStatus}>
                  <span />
                  {dbStatus}
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
              {stage >= 5 ? '身份已確認' : '等待確認'}
            </span>
          </div>
          <div className={s.exchangeHint}>
            <LockKeyhole size={12} />
            {stage >= 9 && stage <= 12
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
                  {stage >= 5 ? (
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
                <span>
                  <Fingerprint size={17} />
                  <span>
                    帳號確認<small>Authentication</small>
                  </span>
                  {stage >= 5 && <Check size={14} />}
                </span>
                <span>
                  <ShieldCheck size={17} />
                  <span>
                    身分憑證<small>Identity Service</small>
                  </span>
                  {stage >= 11 && <Check size={14} />}
                </span>
              </div>
            </button>
          </div>
        </section>
      </div>
      <div className={s.systemCaption}>
        <MousePointer2 size={13} />
        點擊系統或資料標籤，停下來看看
      </div>
    </div>
  );
}

function DataFlow({
  view,
  refs,
  area,
  dispatch,
  reviewing,
  flight,
}: {
  view: Snapshot;
  refs: Record<NodeId, RefObject<HTMLDivElement | null>>;
  area: RefObject<HTMLDivElement | null>;
  dispatch: Dispatch<Action>;
  reviewing: boolean;
  flight: number;
}) {
  const markerId = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const [geometry, setGeometry] = useState({ width: 1, height: 1, path: '' });
  const pathRef = useRef<SVGPathElement>(null);
  const [point, setPoint] = useState({ x: 0, y: 0 });
  const [reduced, setReduced] = useState(false);
  // Log snapshots show the transfer that just completed, not the next transfer.
  const step = steps[reviewing ? Math.max(0, view.stage - 1) : view.stage];
  const from = step.route?.[0],
    to = step.route?.[1];
  useEffect(() => {
    const mq = matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  useLayoutEffect(() => {
    if (!from || !to || !area.current) return;
    const measure = () => {
      const parent = area.current!.getBoundingClientRect();
      const a = refs[from].current!.getBoundingClientRect();
      const b = refs[to].current!.getBoundingClientRect();
      const ac = { x: a.left + a.width / 2, y: a.top + a.height / 2 },
        bc = { x: b.left + b.width / 2, y: b.top + b.height / 2 };
      const horizontal = Math.abs(ac.x - bc.x) > Math.abs(ac.y - bc.y);
      let x1 = ac.x - parent.left,
        y1 = ac.y - parent.top,
        x2 = bc.x - parent.left,
        y2 = bc.y - parent.top;
      if (horizontal) {
        const sign = Math.sign(x2 - x1);
        x1 += (sign * a.width) / 2;
        x2 -= (sign * b.width) / 2;
      } else {
        const sign = Math.sign(y2 - y1);
        y1 += (sign * a.height) / 2;
        y2 -= (sign * b.height) / 2;
      }
      const path = horizontal
        ? `M ${x1} ${y1} C ${(x1 + x2) / 2} ${y1}, ${(x1 + x2) / 2} ${y2}, ${x2} ${y2}`
        : `M ${x1} ${y1} C ${x1} ${(y1 + y2) / 2}, ${x2} ${(y1 + y2) / 2}, ${x2} ${y2}`;
      setGeometry({ width: parent.width, height: parent.height, path });
    };
    const observer = new ResizeObserver(measure);
    observer.observe(area.current);
    for (const ref of Object.values(refs))
      if (ref.current) observer.observe(ref.current);
    measure();
    return () => observer.disconnect();
  }, [from, to, area, refs]);
  useLayoutEffect(() => {
    const path = pathRef.current;
    if (path && typeof path.getTotalLength === 'function') {
      const p = path.getPointAtLength(
        path.getTotalLength() *
          (reviewing ? 1 : reduced ? 0.5 : Math.min(1, view.elapsed / flight)),
      );
      setPoint({ x: p.x, y: p.y });
    }
  }, [geometry.path, view.elapsed, reduced, flight, reviewing]);
  if (!step.route || !geometry.path) return null;
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
        className={s.packet}
        style={{ left: point.x, top: point.y }}
        onClick={() =>
          dispatch({
            type: 'INSPECT',
            target: step.packet || (to === 'db' ? 'db' : 'backend'),
          })
        }
        aria-label={`檢查${step.packet ? packetNames[step.packet] : '資料傳輸'}`}
      >
        <span />
        {step.packet
          ? packetNames[step.packet]
          : to === 'db'
            ? '查找會員'
            : '登入狀態'}
        <ArrowUpRight size={11} />
      </button>
    </div>
  );
}

function inspection(
  view: Snapshot,
  target: InspectId,
): { title: string; detail: string; rows: [string, string][] } {
  const code = `DEMO-CODE-${String(view.run).padStart(3, '0')}`;
  if (target === 'code')
    return {
      title: '一次性代碼 · Authorization Code',
      detail:
        '短效、一次性的兌換憑證。它不是密碼，也不是會員資料；後端還需要拿它向 Google 交換身分憑證。',
      rows: [
        [
          '傳輸路徑',
          view.stage >= 9 ? 'Backend → Google' : 'Google → 瀏覽器 → Backend',
        ],
        ['Code', view.stage >= 6 ? code : '尚未收到'],
        ['性質', '短效 · 一次性 · 非密碼'],
      ],
    };
  if (target === 'token')
    return {
      title: '身分憑證 · ID Token',
      detail:
        view.stage >= 12
          ? '後端已確認憑證來源、適用的 App 與有效期限，接著使用 Google 識別碼對應會員。'
          : '這是 Google 提供的身份資訊；收到後，Backend 還需要驗證憑證。',
      rows:
        view.stage >= 10
          ? [
              ['傳輸路徑', 'Google → Backend'],
              ['Google 識別碼 sub', '108253…'],
              ['Email', 'dino@example.com'],
              ['名稱', 'Dino'],
              ['驗證狀態', view.stage >= 12 ? '✓ 已驗證' : '尚未完成'],
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
          view.stage >= 2 ? 'my-app-demo' : '後端準備中',
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
              view.stage >= 14
                ? '找不到既有會員'
                : view.stage === 13
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
          view.stage >= 5 ? '✓ Dino · dino@example.com' : '等待確認',
        ],
        ['身分憑證', view.stage >= 10 ? '已發出 ID Token' : '尚未發出'],
        ['Google 密碼', '不會提供給 My App'],
      ],
    };
  if (target === 'browser')
    return {
      title: '使用者的瀏覽器 / App',
      detail:
        '你在這裡操作登入，瀏覽器負責前往 Google，再把一次性代碼帶回自己的後端。',
      rows: [
        ['目前頁面', view.stage >= 4 && view.stage <= 6 ? 'Google' : 'My App'],
        ['App 登入狀態', view.stage === 17 ? '✓ user 42 已登入' : '尚未登入'],
      ],
    };
  return {
    title: '你的後端 · Backend',
    detail:
      '後端交換並驗證身分憑證，找到或建立自己的會員，最後建立 App 的登入狀態。',
    rows: [
      ['一次性代碼', view.stage >= 8 ? code : '尚未收到'],
      [
        'ID Token',
        view.stage >= 11
          ? view.stage >= 12
            ? '✓ 已驗證'
            : '正在驗證'
          : '尚未收到',
      ],
      ['App 會員對應', view.stage >= 16 ? 'user 42' : '尚未完成'],
      ['App 登入', view.stage === 17 ? '✓ 已完成' : '尚未完成'],
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
    inspectorRef.current?.focus();
    return () => {
      if (opener?.isConnected) opener.focus({ preventScroll: true });
    };
  }, [state.inspector]);
  const confirmed = view.stage === 5;
  const code = view.stage === 8;
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
        <div className={s.inspectorHeading}>
          <span className={s.explainLabel}>
            {details ? '停下來，看看資料' : '幕後解說'}
          </span>
          {!details && (
            <span className={s.sceneCount}>
              0{steps[view.stage].scene} / 05
            </span>
          )}
        </div>
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
        ) : confirmed ? (
          <div className={s.comparison}>
            <span>
              <Check size={14} />
              Google 已確認身份
            </span>
            <span>
              <CircleHelp size={14} />
              My App 尚未登入
            </span>
          </div>
        ) : code ? (
          <div className={s.comparison}>
            <button
              onClick={() => dispatch({ type: 'INSPECT', target: 'code' })}
            >
              <KeyRound size={14} />
              查看一次性代碼
              <ArrowUpRight size={12} />
            </button>
            <span>Code ≠ 密碼 ≠ App 會員</span>
          </div>
        ) : null}
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
  const { narration, position, total, unlocked, seekTo, driving } = playback;
  const trackRef = useRef<HTMLDivElement>(null);
  const [scrubbing, setScrubbing] = useState(false);
  const review = state.review !== null;
  const waiting = isWaiting(state);
  const paused = state.paused || narration.blocked;
  const canSeek = driving && !review && !state.inspector;
  const label = review
    ? '正在回看紀錄'
    : state.inspector
      ? '已暫停，正在檢查資料'
      : narration.blocked
        ? '按播放，開始語音解說'
        : state.stage === 0
          ? '等待你開始登入'
          : state.stage === 4
            ? '等待你確認 Google 帳號'
            : state.stage === 17
              ? '這次登入已完成'
              : state.paused
                ? '已暫停 · 按播放繼續'
                : '解說進行中';

  const scrubTo = (clientX: number) => {
    const track = trackRef.current;
    if (!track || !total) return;
    const box = track.getBoundingClientRect();
    seekTo(((clientX - box.left) / box.width) * total);
  };
  const nudge = (delta: number) => seekTo(position + delta);

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
          disabled={review || !!state.inspector}
          aria-label={paused ? '繼續播放' : '暫停流程'}
          onClick={() => {
            if (state.paused) dispatch({ type: 'PLAY' });
            else if (narration.blocked) narration.resume();
            else dispatch({ type: 'PAUSE' });
          }}
        >
          {paused ? (
            <Play size={17} fill="currentColor" />
          ) : (
            <Pause size={17} fill="currentColor" />
          )}
        </button>
        <div className={s.playbackStatus}>
          <div className={s.playbackLabel}>
            <span>{label}</span>
            {waiting && <span className={s.waitingChip}>等你操作</span>}
          </div>
          <div className={s.trackRow}>
            <time className={s.clock}>{formatTime(position)}</time>
            <div
              ref={trackRef}
              className={`${s.progressTrack} ${canSeek ? s.seekable : ''}`}
              role="slider"
              tabIndex={canSeek ? 0 : -1}
              aria-label="解說進度"
              aria-valuemin={0}
              aria-valuemax={Math.round(total / 1000)}
              aria-valuenow={Math.round(position / 1000)}
              aria-valuetext={`${formatTime(position)} / ${formatTime(total)}`}
              onPointerDown={(event) => {
                if (!canSeek) return;
                event.currentTarget.setPointerCapture(event.pointerId);
                setScrubbing(true);
                scrubTo(event.clientX);
              }}
              onPointerMove={(event) => scrubbing && scrubTo(event.clientX)}
              onPointerUp={() => setScrubbing(false)}
              onPointerCancel={() => setScrubbing(false)}
              onKeyDown={(event) => {
                if (!canSeek) return;
                if (event.key === 'ArrowLeft') nudge(-5000);
                else if (event.key === 'ArrowRight') nudge(5000);
                else if (event.key === 'Home') seekTo(0);
                else return;
                event.preventDefault();
              }}
            >
              <span
                className={s.progressHeard}
                style={{ width: `${total ? (unlocked / total) * 100 : 0}%` }}
              />
              <span
                className={s.progressFill}
                style={{ width: `${total ? (position / total) * 100 : 0}%` }}
              />
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
        {review && (
          <button
            className={s.returnLive}
            onClick={() => dispatch({ type: 'LIVE' })}
          >
            回到目前進度
            <ArrowRight size={14} />
          </button>
        )}
      </div>
    </div>
  );
}

function AuthLog({
  state,
  dispatch,
}: {
  state: FlowState;
  dispatch: Dispatch<Action>;
}) {
  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (listRef.current)
      listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [state.logs.length]);
  return (
    <section className={s.logSection} aria-label="系統執行紀錄">
      <div className={s.logHeading}>
        <div>
          <Code2 size={16} />
          <h3>AUTH.LOG</h3>
          <span>系統執行紀錄</span>
        </div>
        <span>
          {state.logs.length ? '點擊紀錄，回看那個時刻' : '每一步，都有跡可循'}
        </span>
      </div>
      <div className={s.logList} ref={listRef}>
        {!state.logs.length ? (
          <div className={s.logEmpty}>
            <span className={s.emptyDot} />
            <span>
              按下手機上的登入按鈕，觀察流程
              <span className={s.logEmptyDash}> — 等待第一個事件</span>
            </span>
          </div>
        ) : (
          state.logs.map((log, i) => (
            <button
              key={log.id}
              className={`${s.logEntry} ${state.review === i ? s.selectedLog : ''}`}
              onClick={() => dispatch({ type: 'REVIEW', index: i })}
              aria-pressed={state.review === i}
            >
              <span className={s.logNumber}>
                {String(i + 1).padStart(2, '0')}
              </span>
              <Check size={13} />
              <strong>{log.title}</strong>
              <span className={s.logDirection}>{log.direction}</span>
              <ArrowUpRight size={14} />
            </button>
          ))
        )}
      </div>
    </section>
  );
}

export function AuthDemo() {
  const { state, dispatch, playback } = useFlow();
  const view = viewOf(state);
  const area = useRef<HTMLDivElement>(null);
  const browser = useRef<HTMLDivElement>(null),
    backend = useRef<HTMLDivElement>(null),
    google = useRef<HTMLDivElement>(null),
    db = useRef<HTMLDivElement>(null);
  const [refs] = useState(() => ({ browser, backend, google, db }));
  const waiting = isWaiting(state);
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
        <article className={s.lessonCard}>
          <div className={s.lessonHeading}>
            <div>
              <div className={s.eyebrow}>
                <span />
                低門檻身份驗證與第三方登入
                <span className={s.simulationBadge}>教學模擬</span>
              </div>
              <h1>
                按下 Google 登入之後，
                <br className={s.mobileBreak} />
                發生了什麼？
              </h1>
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
                  steps[view.stage].scene === i + 1
                    ? s.currentScene
                    : steps[view.stage].scene > i + 1
                      ? s.completedScene
                      : ''
                }
                aria-current={
                  steps[view.stage].scene === i + 1 ? 'step' : undefined
                }
              >
                <span>
                  {steps[view.stage].scene > i + 1 ? (
                    <Check size={12} />
                  ) : (
                    `0${i + 1}`
                  )}
                </span>
                {name}
                {i < 4 && <ChevronRight size={12} />}
              </li>
            ))}
          </ol>
          <div className={`${s.experiment}${waiting ? ` ${s.spotlight}` : ''}`}>
            <div className={s.scrim} aria-hidden="true" />
            {state.review !== null && (
              <div className={s.reviewBanner}>
                <RotateCcw size={14} />
                回看中 · {state.logs[state.review].title}
                <span>目前流程已暫停</span>
              </div>
            )}
            <div className={s.stageArea} ref={area}>
              <PhonePreview
                view={view}
                dispatch={dispatch}
                locked={state.review !== null || !!state.inspector}
                waiting={waiting}
                nodeRef={browser}
              />
              <SystemMap
                view={view}
                dispatch={dispatch}
                refs={refs}
                paused={state.paused}
              />
              <DataFlow
                reviewing={state.review !== null}
                flight={playback.flight}
                view={view}
                refs={refs}
                area={area}
                dispatch={dispatch}
              />
            </div>
            <Inspector state={state} view={view} dispatch={dispatch} />
          </div>
          <PlaybackControls
            state={state}
            dispatch={dispatch}
            playback={playback}
          />
          <AuthLog state={state} dispatch={dispatch} />
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
