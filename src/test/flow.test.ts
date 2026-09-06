import { describe, expect, it } from 'vitest';
import { initialState, reducer, steps, viewOf, type FlowState } from '../flow';
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
    if (state.stage === 4) state = reducer(state, { type: 'CONTINUE' });
    else state = advance(state);
  }
  return state;
}
function start() {
  return reducer(initialState(), { type: 'START' });
}
describe('Google 登入教學狀態機', () => {
  it('首次登入依序建立會員和 App 登入狀態，第二次使用相同會員', () => {
    let state = runUntil(start(), 15);
    expect(state.member).toBe(false);
    state = advance(state);
    expect(state.stage).toBe(16);
    expect(state.member).toBe(true);
    state = advance(state);
    expect(state.stage).toBe(17);
    expect(
      state.logs.filter((x) => x.title === '建立會員 user 42'),
    ).toHaveLength(1);
    state = reducer(state, { type: 'LOGOUT' });
    expect(state.member).toBe(true);
    expect(state.logs).toEqual([]);
    expect(state.stage).toBe(0);
    state = runUntil(reducer(state, { type: 'START' }), 17);
    expect(state.logs.some((x) => x.title === '找到既有會員 user 42')).toBe(
      true,
    );
    expect(state.logs.some((x) => x.title === '建立會員 user 42')).toBe(false);
    expect(state.returning).toBe(true);
  });
  it('Google 確認與收到 Code 各停留完整 2 秒', () => {
    for (const stage of [5, 8]) {
      let state = runUntil(start(), stage);
      state = advance(state, 1999);
      expect(state.stage).toBe(stage);
      state = advance(state, 1);
      expect(state.stage).toBe(stage + 1);
    }
  });
  it('暫停凍結剩餘時間，繼續後不重新計時', () => {
    let state = advance(runUntil(start(), 5), 800);
    state = reducer(state, { type: 'PAUSE' });
    expect(advance(state, 5000)).toEqual(state);
    state = reducer(state, { type: 'PLAY' });
    state = advance(state, 1199);
    expect(state.stage).toBe(5);
    expect(advance(state, 1).stage).toBe(6);
  });
  it('等待使用者的步驟不會被播放或計時跳過', () => {
    expect(
      advance(reducer(initialState(), { type: 'PLAY' }), 10000).stage,
    ).toBe(0);
    const state = runUntil(start(), 4);
    expect(advance(reducer(state, { type: 'PLAY' }), 10000).stage).toBe(4);
  });
  it('取消不建立會員或取得憑證，保留取消紀錄並可重試', () => {
    const state = reducer(runUntil(start(), 4), { type: 'CANCEL' });
    expect(state.stage).toBe(0);
    expect(state.member).toBe(false);
    expect(state.logs.at(-1)?.title).toBe('已取消 Google 登入');
    expect(runUntil(reducer(state, { type: 'START' }), 17).member).toBe(true);
  });
  it('檢查時凍結，關閉後仍需按播放', () => {
    let state = advance(runUntil(start(), 9), 240);
    state = reducer(state, { type: 'INSPECT', target: 'code' });
    expect(advance(state, 10000)).toEqual(state);
    expect(reducer(state, { type: 'PLAY' }).paused).toBe(true);
    state = reducer(state, { type: 'CLOSE' });
    expect(state.paused).toBe(true);
    expect(state.elapsed).toBe(240);
  });
  it('回看快照不修改會員，回到目前進度後仍暫停', () => {
    let state = runUntil(start(), 17);
    const logCount = state.logs.length;
    state = reducer(state, { type: 'REVIEW', index: 0 });
    expect(viewOf(state).member).toBe(false);
    expect(state.member).toBe(true);
    expect(advance(state)).toEqual(state);
    expect(reducer(state, { type: 'LOGOUT' })).toEqual(state);
    state = reducer(state, { type: 'LIVE' });
    expect(viewOf(state).stage).toBe(17);
    expect(state.paused).toBe(true);
    expect(state.logs).toHaveLength(logCount);
  });
  it('重設清空會員並拒絕舊流程與舊步驟的事件', () => {
    const old = runUntil(start(), 15);
    let state = reducer(old, { type: 'RESET' });
    expect(state.member).toBe(false);
    expect(state.logs).toEqual([]);
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
      reducer(state, { type: 'TICK', delta: 10000, run: state.run, stage: 15 }),
    ).toEqual(state);
  });
  it('快速連點不重複登入或重複確認', () => {
    const state = start();
    expect(reducer(state, { type: 'START' })).toEqual(state);
    const confirmed = runUntil(state, 5);
    expect(reducer(confirmed, { type: 'CONTINUE' })).toEqual(confirmed);
  });
});
