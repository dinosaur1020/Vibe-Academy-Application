import { describe, expect, it } from 'vitest';
import {
  clipFor,
  cueFor,
  flightMs,
  initialState,
  reducer,
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
    if (state.stage === 4) state = reducer(state, { type: 'CONTINUE' });
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
    for (let i = 0; i < 30 && state.stage !== 17; i++) {
      expect(clipFor(state), `stage ${state.stage} 缺少旁白`).toBeDefined();
      state =
        state.stage === 4
          ? reducer(state, { type: 'CONTINUE' })
          : advance(state);
    }
    expect(cueFor(state)).toBe('s17-first');
    expect(cueFor({ ...state, returning: true })).toBe('s17-return');
    expect(cueFor({ ...state, stage: 14, member: true })).toBe('s14-found');
    expect(cueFor({ ...state, stage: 14, member: false })).toBe('s14-new');
    expect(cueFor(initialState())).toBe('intro');
    expect(cueFor({ ...initialState(), returning: true })).toBe('intro-again');
  });
  it('取消時播自己的旁白，重新開始後回到正常流程', () => {
    const cancelled = reducer(runUntil(start(), 4), { type: 'CANCEL' });
    expect(cueFor(cancelled)).toBe('cancel');
    expect(cueFor(reducer(cancelled, { type: 'START' }))).toBe('s1');
  });
  it('旁白結束才前進，等待互動的步驟不會被旁白推走', () => {
    expect(advance(initialState()).stage).toBe(0);
    expect(advance(runUntil(start(), 4)).stage).toBe(4);
    expect(advance(runUntil(start(), 17)).stage).toBe(17);
    const moving = runUntil(start(), 5);
    expect(advance(moving).stage).toBe(6);
  });
  it('過期的旁白結束事件不會推進目前步驟', () => {
    const state = runUntil(start(), 5);
    expect(
      reducer(state, { type: 'ADVANCE', run: state.run, stage: 3 }),
    ).toEqual(state);
    expect(
      reducer(state, { type: 'ADVANCE', run: state.run + 1, stage: 5 }),
    ).toEqual(state);
  });
  it('時間軸涵蓋整條路徑，再次登入時略過建立會員', () => {
    const first = timelineFor(false);
    const again = timelineFor(true);
    expect(first.map((s) => s.stage)).toEqual(stagesFor(false));
    expect(again.some((s) => s.stage === 15)).toBe(false);
    expect(first[0].start).toBe(0);
    for (let i = 1; i < first.length; i++)
      expect(first[i].start).toBe(first[i - 1].start + first[i - 1].ms);
    expect(totalMs(first)).toBeGreaterThan(0);
    expect(totalMs(first)).toBeLessThanOrEqual(180_000);
    expect(totalMs(again)).toBeLessThanOrEqual(180_000);
  });
  it('拖曳到任一步驟，重建出的紀錄與實際播放完全相同', () => {
    for (const stage of [1, 5, 8, 14, 16, 17]) {
      const live = runUntil(start(), stage);
      const seeked = reducer(live, { type: 'SEEK', stage, offset: 1200 });
      expect(seeked.stage).toBe(stage);
      expect(seeked.elapsed).toBe(1200);
      expect(seeked.logs).toEqual(live.logs);
      expect(seeked.member).toBe(live.member);
    }
  });
  it('往回拖再往前播，仍走到同一個結局', () => {
    const live = runUntil(start(), 16);
    const back = reducer(live, { type: 'SEEK', stage: 8, offset: 0 });
    expect(back.stage).toBe(8);
    expect(runUntil(back, 17).logs).toEqual(runUntil(live, 17).logs);
  });
  it('封包飛行時間跟著旁白拉長，但不會慢到停住', () => {
    expect(flightMs(1, undefined)).toBe(steps[1].duration);
    expect(flightMs(1, 700)).toBe(700);
    expect(flightMs(1, 6000)).toBe(2600);
    expect(flightMs(1, 2000)).toBe(1200);
  });
  it('CLOCK 只更新進度，暫停或檢查時被忽略', () => {
    const state = runUntil(start(), 5);
    const ticked = reducer(state, {
      type: 'CLOCK',
      elapsed: 3400,
      run: state.run,
      stage: 5,
    });
    expect(ticked.elapsed).toBe(3400);
    expect(ticked.stage).toBe(5);
    const paused = reducer(state, { type: 'PAUSE' });
    expect(
      reducer(paused, {
        type: 'CLOCK',
        elapsed: 9000,
        run: state.run,
        stage: 5,
      }),
    ).toEqual(paused);
  });
});
