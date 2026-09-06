import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react';
import {
  clipFor,
  clipOf,
  flightMs,
  initialState,
  reducer,
  steps,
  timelineFor,
  totalMs,
  type Segment,
} from './flow';
import { useNarration, type Narration } from './useNarration';

export interface Playback {
  timeline: Segment[];
  segment: Segment | undefined;
  /** Milliseconds into the whole lesson, for the dock's progress bar. */
  position: number;
  total: number;
  /** End of the current step: you cannot scrub past a step you haven't heard. */
  unlocked: number;
  /** True while the audio element owns the clock. */
  driving: boolean;
  /** How long the packet animation takes inside the current step. */
  flight: number;
  narration: Narration;
  seekTo: (ms: number) => void;
}

export function useFlow() {
  const [state, dispatch] = useReducer(reducer, undefined, initialState);
  const [startAt, setStartAt] = useState(0);
  const timeline = useMemo(
    () => timelineFor(state.returning),
    [state.returning],
  );
  const total = useMemo(() => totalMs(timeline), [timeline]);
  const index = timeline.findIndex((segment) => segment.stage === state.stage);
  const segment = index < 0 ? undefined : timeline[index];
  const clip = clipFor(state);
  const nextClip = clipOf(timeline[index + 1]?.cue);
  const held = state.paused || !!state.inspector || state.review !== null;
  const { run, stage } = state;

  const onClock = useCallback(
    (elapsed: number) => dispatch({ type: 'CLOCK', elapsed, run, stage }),
    [run, stage],
  );
  const onEnded = useCallback(
    () => dispatch({ type: 'ADVANCE', run, stage }),
    [run, stage],
  );
  const narration = useNarration({
    clip,
    nextClip,
    active: !held,
    startAt,
    onClock,
    onEnded,
  });

  // Audio owns the clock whenever a clip exists and can decode. A clip that is
  // merely waiting for a user gesture still owns it — the flow holds rather than
  // racing ahead of narration that has not started.
  const audioDriving = narration.supported && !narration.failed && !!clip;
  useEffect(() => {
    if (audioDriving || held || !steps[stage].duration) return;
    let frame: number;
    let last = performance.now();
    const tick = (now: number) => {
      const delta = now - last;
      last = now;
      dispatch({ type: 'TICK', delta, run, stage });
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [stage, run, held, audioDriving]);

  useEffect(() => {
    const hide = () => {
      if (document.hidden) dispatch({ type: 'PAUSE' });
    };
    document.addEventListener('visibilitychange', hide);
    return () => document.removeEventListener('visibilitychange', hide);
  }, []);

  const stageRef = useRef(stage);
  stageRef.current = stage;
  const seekTo = useCallback(
    (ms: number) => {
      const current = timeline.find((s) => s.stage === stageRef.current);
      const limit = current ? current.start + current.ms : Infinity;
      const capped = Math.min(Math.max(0, ms), limit);
      const target =
        [...timeline].reverse().find((s) => capped >= s.start) ?? timeline[0];
      if (!target) return;
      const offset = Math.min(Math.max(0, capped - target.start), target.ms);
      if (target.stage === stageRef.current) narration.seek(offset);
      else setStartAt(offset);
      dispatch({ type: 'SEEK', stage: target.stage, offset });
    },
    [timeline, narration],
  );

  const position = segment
    ? segment.start + Math.min(state.elapsed, segment.ms)
    : 0;
  const playback: Playback = {
    timeline,
    segment,
    position,
    total,
    unlocked: segment ? segment.start + segment.ms : total,
    driving: audioDriving,
    flight: flightMs(stage, audioDriving ? clip?.ms : undefined),
    narration,
    seekTo,
  };
  return { state, dispatch, playback };
}
