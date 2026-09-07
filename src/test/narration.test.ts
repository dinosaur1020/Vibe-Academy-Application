import { describe, expect, it } from 'vitest';
import {
  clipFor,
  cueFor,
  flightMs,
  initialState,
  reducer,
  S,
  stagesFor,
  steps,
  timelineFor,
  totalMs,
  type FlowState,
} from '../flow';
function advance(state: FlowState) {
  return reducer(state, {
    type: 'ADVANCE',
    run: state.run,
    stage: state.stage,
  });
}
function runUntil(state: FlowState, stage: number) {
  for (let i = 0; i < 30 && state.stage !== stage; i++) {
    if (state.stage === S.consent) state = reducer(state, { type: 'CONTINUE' });
    else state = advance(state);
  }
  return state;
}
function start() {
  return reducer(initialState(), { type: 'START' });
}
describe('旁白與流程同步', () => {
  it('每個步驟都有對應旁白，分支各有自己的版本', () => {
    let state = start();
    for (let i = 0; i < 30 && state.stage !== S.done; i++) {
      expect(clipFor(state), `stage ${state.stage} 缺少旁白`).toBeDefined();
      state =
        state.stage === S.consent
          ? reducer(state, { type: 'CONTINUE' })
          : advance(state);
    }
    expect(cueFor(state)).toBe('s17-first');
    expect(cueFor({ ...state, returning: true })).toBe('s17-return');
    expect(cueFor({ ...state, stage: S.lookupResult, member: true })).toBe(
      's14-found',
    );
    expect(cueFor({ ...state, stage: S.lookupResult, member: false })).toBe(
      's14-new',
    );
    expect(cueFor(initialState())).toBe('intro');
    expect(cueFor({ ...initialState(), returning: true })).toBe('intro-again');
  });
  it('取消時播自己的旁白，重新開始後回到正常流程', () => {
    const cancelled = reducer(runUntil(start(), S.consent), { type: 'CANCEL' });
    expect(cueFor(cancelled)).toBe('cancel');
    expect(cueFor(reducer(cancelled, { type: 'START' }))).toBe('s1');
  });
  it('旁白結束才前進，等待互動的步驟不會被旁白推走', () => {
    expect(advance(initialState()).stage).toBe(S.idle);
    expect(advance(runUntil(start(), S.consent)).stage).toBe(S.consent);
    expect(advance(runUntil(start(), S.done)).stage).toBe(S.done);
    const moving = runUntil(start(), S.confirmed);
    expect(advance(moving).stage).toBe(S.back);
  });
  it('過期的旁白結束事件不會推進目前步驟', () => {
    const state = runUntil(start(), S.confirmed);
    expect(
      reducer(state, { type: 'ADVANCE', run: state.run, stage: S.toGoogle }),
    ).toEqual(state);
    expect(
      reducer(state, {
        type: 'ADVANCE',
        run: state.run + 1,
        stage: S.confirmed,
      }),
    ).toEqual(state);
  });
  it('時間軸涵蓋整條路徑，再次登入時略過建立會員', () => {
    const first = timelineFor(false);
    const again = timelineFor(true);
    expect(first.map((s) => s.stage)).toEqual(stagesFor(false));
    expect(again.some((s) => s.stage === S.create)).toBe(false);
    expect(first[0].start).toBe(0);
    for (let i = 1; i < first.length; i++)
      expect(first[i].start).toBe(first[i - 1].start + first[i - 1].ms);
    expect(totalMs(first)).toBeGreaterThan(0);
    expect(totalMs(first)).toBeLessThanOrEqual(180_000);
    expect(totalMs(again)).toBeLessThanOrEqual(180_000);
  });
  it('拖曳到任一步驟，重建出的狀態與實際播到那裡完全相同', () => {
    for (const stage of [
      S.request,
      S.confirmed,
      S.codeHeld,
      S.lookupResult,
      S.session,
      S.done,
    ]) {
      const live = runUntil(start(), stage);
      const seeked = reducer(live, { type: 'SEEK', stage, offset: 1200 });
      expect(seeked.stage).toBe(stage);
      expect(seeked.elapsed).toBe(1200);
      expect(seeked.member).toBe(live.member);
      expect(seeked.returning).toBe(live.returning);
    }
  });
  it('往回拖再往前播，仍走到同一個結局', () => {
    const live = runUntil(start(), S.session);
    const back = reducer(live, { type: 'SEEK', stage: S.codeHeld, offset: 0 });
    expect(back.stage).toBe(S.codeHeld);
    expect(back.member).toBe(false);
    expect(runUntil(back, S.done).member).toBe(true);
  });
  it('封包飛行時間跟著旁白拉長，但不會慢到停住', () => {
    expect(flightMs(S.request, undefined)).toBe(steps[S.request].duration);
    expect(flightMs(S.request, 700)).toBe(700);
    expect(flightMs(S.request, 6000)).toBe(2600);
    expect(flightMs(S.request, 2000)).toBe(1200);
  });
  it('CLOCK 只更新進度，暫停或檢查時被忽略', () => {
    const state = runUntil(start(), S.confirmed);
    const ticked = reducer(state, {
      type: 'CLOCK',
      elapsed: 3400,
      run: state.run,
      stage: S.confirmed,
    });
    // CLOCK belongs to the narration pointer; the scene is not its business.
    expect(ticked.audioElapsed).toBe(3400);
    expect(ticked.elapsed).toBe(state.elapsed);
    expect(ticked.stage).toBe(S.confirmed);
    const paused = reducer(state, { type: 'PAUSE' });
    expect(
      reducer(paused, {
        type: 'CLOCK',
        elapsed: 9000,
        run: state.run,
        stage: S.confirmed,
      }),
    ).toEqual(paused);
  });
});
