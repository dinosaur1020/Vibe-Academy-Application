import { describe, expect, it } from 'vitest';
import {
  anchorNode,
  initialState,
  isWaiting,
  lastStage,
  reducer,
  S,
  steps,
  type FlowState,
} from '../flow';
function advance(state: FlowState, delta = steps[state.stage].duration) {
  return reducer(state, {
    type: 'TICK',
    delta,
    run: state.run,
    stage: state.stage,
  });
}
function runUntil(state: FlowState, stage: number) {
  for (let i = 0; i < 30 && state.stage !== stage; i++) {
    if (state.stage === S.consent && stage !== S.consent)
      state = reducer(state, { type: 'CONTINUE' });
    else state = advance(state);
  }
  return state;
}
function start() {
  return reducer(initialState(), { type: 'START' });
}
describe('Google 登入教學狀態機', () => {
  it('首次登入依序建立會員和 App 登入狀態，第二次使用相同會員', () => {
    let state = runUntil(start(), S.create);
    expect(state.member).toBe(false);
    state = advance(state);
    expect(state.stage).toBe(S.session);
    expect(state.member).toBe(true);
    state = advance(state);
    expect(state.stage).toBe(S.done);
    state = reducer(state, { type: 'LOGOUT' });
    expect(state.member).toBe(true);
    expect(state.stage).toBe(S.idle);
    // The second run starts already a member, so it never creates one again.
    state = runUntil(reducer(state, { type: 'START' }), S.lookupResult);
    expect(state.returning).toBe(true);
    expect(advance(state).stage).toBe(S.session);
  });
  it('Google 確認與收到 Code 各停留完整 2 秒', () => {
    for (const stage of [S.confirmed, S.codeHeld]) {
      let state = runUntil(start(), stage);
      state = advance(state, 1999);
      expect(state.stage).toBe(stage);
      state = advance(state, 1);
      expect(state.stage).toBe(stage + 1);
    }
  });
  it('暫停凍結剩餘時間，繼續後不重新計時', () => {
    let state = advance(runUntil(start(), S.confirmed), 800);
    state = reducer(state, { type: 'PAUSE' });
    expect(advance(state, 5000)).toEqual(state);
    state = reducer(state, { type: 'PLAY' });
    state = advance(state, 1199);
    expect(state.stage).toBe(S.confirmed);
    expect(advance(state, 1).stage).toBe(S.back);
  });
  it('等待使用者的步驟不會被播放或計時跳過', () => {
    expect(
      advance(reducer(initialState(), { type: 'PLAY' }), 10000).stage,
    ).toBe(S.idle);
    const state = runUntil(start(), S.consent);
    expect(advance(reducer(state, { type: 'PLAY' }), 10000).stage).toBe(
      S.consent,
    );
  });
  it('手動跑在前面時，旁白進到新段落會把畫面收回去', () => {
    // Narration on the intro, the viewer already at the consent gate.
    let state = { ...start(), narrating: true, audio: S.idle };
    state = runUntil(state, S.consent);
    expect(state.stage).toBe(S.consent);
    expect(state.audio).toBe(S.idle);
    state = reducer(state, { type: 'ADVANCE', run: state.run, stage: S.idle });
    expect(state.audio).toBe(S.request);
    expect(state.stage).toBe(S.request);
    expect(state.hand).toBe(false);
  });
  it('旁白停在關卡等使用者，按下按鈕才放行', () => {
    const state = { ...initialState(), narrating: true };
    // The clip runs out on the opening gate: narration waits, it does not skip.
    const waitingAtGate = reducer(state, {
      type: 'ADVANCE',
      run: state.run,
      stage: S.idle,
    });
    expect(waitingAtGate.audio).toBe(S.idle);
    expect(waitingAtGate.held).toBe(true);
    expect(isWaiting(waitingAtGate)).toBe(true);
    const started = reducer(waitingAtGate, { type: 'START' });
    expect(started.audio).toBe(S.request);
    expect(started.held).toBe(false);
  });
  it('步驟只用名字互相指涉，插一步不會讓別人的意思跑掉', () => {
    // Every position in the lesson is written down exactly once, here.
    const ids = steps.map((step) => step.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const [index, step] of steps.entries()) expect(S[step.id]).toBe(index);
    expect(lastStage).toBe(steps.length - 1);
    // Each step names its own clip rather than deriving one from its position.
    expect(new Set(steps.map((step) => step.cue)).size).toBe(steps.length);
  });
  it('每條箭頭都指向確切的元件，而且都有可以退回的卡片', () => {
    const anchors = Object.keys(anchorNode);
    for (const [stage, step] of steps.entries())
      for (const id of step.route ?? [])
        expect(anchors, `stage ${stage}`).toContain(id);
    // The browser asks, the backend answers with somewhere to go, and only
    // then does the browser leave for Google. Without the middle leg the jump
    // to Google looks like it came from nowhere.
    expect(steps[S.request].route).toEqual(['browser.action', 'backend']);
    expect(steps[S.redirect].route).toEqual(['backend', 'browser.action']);
    expect(steps[S.toGoogle].route).toEqual(['browser.action', 'google.auth']);
    // Coming back from Google is its own step and carries nothing; the code
    // travels on the step after it.
    expect(steps[S.back].route).toBeUndefined();
    expect(steps[S.codeBack].route).toEqual(['google.auth', 'browser.screen']);
  });
  it('取消不建立會員或取得憑證，保留取消紀錄並可重試', () => {
    const state = reducer(runUntil(start(), S.consent), { type: 'CANCEL' });
    expect(state.stage).toBe(S.idle);
    expect(state.member).toBe(false);
    expect(runUntil(reducer(state, { type: 'START' }), S.done).member).toBe(
      true,
    );
  });
  it('檢查資料凍結畫面，但不動到旁白', () => {
    let state = advance(runUntil(start(), S.exchange), 240);
    state = reducer(state, { type: 'INSPECT', target: 'code' });
    expect(advance(state, 10000)).toEqual(state);
    // Reading a panel is not a pause: narration is left alone entirely.
    expect(state.paused).toBe(false);
    state = reducer(state, { type: 'CLOSE' });
    expect(state.elapsed).toBe(240);
    expect(advance(state).stage).toBe(S.tokenBack);
  });
  it('往回拖之後照常往下播，不鎖住流程', () => {
    let state = runUntil(start(), S.done);
    state = reducer(state, { type: 'SEEK', stage: S.redirect, offset: 0 });
    expect(state.stage).toBe(S.redirect);
    expect(state.paused).toBe(false);
    // Rewinding rebuilds the run as it stood then: not a member yet.
    expect(state.member).toBe(false);
    expect(advance(state).stage).toBe(S.toGoogle);
  });
  it('重設或登出之後，旁白仍然是帶路的那一個', () => {
    const listening = { ...runUntil(start(), S.done), narrating: true };
    for (const state of [
      reducer(listening, { type: 'RESET' }),
      reducer(listening, { type: 'LOGOUT' }),
    ]) {
      expect(state.narrating).toBe(true);
      // Still decoupled: the button moves the scene and leaves the clip alone.
      const started = reducer(state, { type: 'START' });
      expect(started.stage).toBe(S.request);
      expect(started.audio).toBe(S.idle);
    }
  });
  it('按播放把畫面交回旁白，但不倒帶旁白', () => {
    const state = {
      ...runUntil(start(), S.codeHeld),
      narrating: true,
      audio: S.confirmed,
      audioElapsed: 4200,
    };
    const resumed = reducer(reducer(state, { type: 'PAUSE' }), {
      type: 'PLAY',
    });
    expect(resumed.stage).toBe(S.confirmed);
    expect(resumed.audioElapsed).toBe(4200);
    expect(resumed.paused).toBe(false);
  });
  it('重設清空會員並拒絕舊流程與舊步驟的事件', () => {
    const old = runUntil(start(), S.create);
    let state = reducer(old, { type: 'RESET' });
    expect(state.member).toBe(false);
    expect(state.stage).toBe(0);
    state = reducer(state, { type: 'START' });
    expect(
      reducer(state, {
        type: 'TICK',
        delta: 10000,
        run: old.run,
        stage: state.stage,
      }),
    ).toEqual(state);
    expect(
      reducer(state, {
        type: 'TICK',
        delta: 10000,
        run: state.run,
        stage: S.create,
      }),
    ).toEqual(state);
  });
  it('快速連點不重複登入或重複確認', () => {
    const state = start();
    expect(reducer(state, { type: 'START' })).toEqual(state);
    const confirmed = runUntil(state, S.confirmed);
    expect(reducer(confirmed, { type: 'CONTINUE' })).toEqual(confirmed);
  });
});
