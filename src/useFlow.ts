import { useEffect, useReducer } from 'react';
import { initialState, reducer, steps } from './flow';
export function useFlow() {
  const [state, dispatch] = useReducer(reducer, undefined, initialState);
  useEffect(() => {
    if (
      state.paused ||
      state.inspector ||
      state.review !== null ||
      !steps[state.stage].duration
    )
      return;
    let frame: number;
    let last = performance.now();
    const tick = (now: number) => {
      const delta = now - last;
      last = now;
      dispatch({ type: 'TICK', delta, run: state.run, stage: state.stage });
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [state.stage, state.run, state.paused, state.inspector, state.review]);
  useEffect(() => {
    const hide = () => {
      if (document.hidden) dispatch({ type: 'PAUSE' });
    };
    document.addEventListener('visibilitychange', hide);
    return () => document.removeEventListener('visibilitychange', hide);
  }, []);
  return { state, dispatch };
}
