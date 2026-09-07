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
  cueFor,
  flightMs,
  initialState,
  isWaiting,
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
  /**
   * True once the demo is parked on a gate and has finished explaining it —
   * the moment to dim the scene and light up the button to press.
   */
  waiting: boolean;
  /** How long the packet animation takes inside the current step. */
  flight: number;
  /** Milliseconds into the step the scene is showing, off whichever clock drives. */
  stepElapsed: number;
  /** The same, as 0..1 across the whole step, for staging beats inside one. */
  stepProgress: number;
  /** True once the packet has finished crossing, so the scene can react to it. */
  landed: boolean;
  /** Milliseconds into this step's leg; before it starts there is no arrow. */
  legElapsed: number;
  /** Whether the leg has started at all. A step can spend its first half on
   *  something that is not a packet crossing. */
  legActive: boolean;
  narration: Narration;
  seekTo: (ms: number) => void;
  /** Rewind to the very start and play, straight from a user gesture. */
  restart: () => void;
}

export function useFlow() {
  const [state, dispatch] = useReducer(reducer, undefined, initialState);
  // Where a seek asked the next clip to start. Tied to the stage it was meant
  // for, so a later step never inherits a stale offset and opens mid-sentence.
  const [mark, setMark] = useState<{
    run: number;
    stage: number;
    offset: number;
  } | null>(null);
  const timeline = useMemo(
    () => timelineFor(state.returning),
    [state.returning],
  );
  const total = useMemo(() => totalMs(timeline), [timeline]);
  const { run, stage, hand, inspector } = state;
  const index = timeline.findIndex((s) => s.stage === state.audio);
  const segment = index < 0 ? undefined : timeline[index];
  // The clip belongs to the narration pointer, never to wherever the viewer
  // has driven the scene — keeping those apart is the point of the split.
  const clip = clipFor({ ...state, stage: state.audio });
  const nextClip = clipOf(timeline[index + 1]?.cue);
  const audioRef = useRef(state.audio);
  audioRef.current = state.audio;
  const runRef = useRef(run);
  runRef.current = run;

  const onClock = useCallback(
    (elapsed: number) =>
      dispatch({ type: 'CLOCK', elapsed, run, stage: audioRef.current }),
    [run],
  );
  const onEnded = useCallback(
    () => dispatch({ type: 'ADVANCE', run, stage: audioRef.current }),
    [run],
  );
  const narration = useNarration({
    clip,
    nextClip,
    active: !state.paused,
    startAt:
      mark?.run === state.run && mark.stage === state.audio ? mark.offset : 0,
    onClock,
    onEnded,
  });

  // Audio owns the narration clock whenever a clip exists and can decode. A
  // clip merely waiting for a user gesture still owns it — the lesson holds
  // rather than racing ahead of narration that has not started.
  const audioDriving = narration.supported && !narration.failed && !!clip;
  useEffect(() => {
    if (state.narrating !== audioDriving)
      dispatch({ type: 'NARRATING', on: audioDriving });
  }, [audioDriving, state.narrating]);
  // The scene has a clock of its own, and it runs only while the viewer drives.
  useEffect(() => {
    if (inspector || !steps[stage].duration) return;
    if (!hand && (state.narrating || state.paused)) return;
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
  }, [stage, run, hand, inspector, state.narrating, state.paused]);

  useEffect(() => {
    const hide = () => {
      if (document.hidden) dispatch({ type: 'PAUSE' });
    };
    document.addEventListener('visibilitychange', hide);
    return () => document.removeEventListener('visibilitychange', hide);
  }, []);

  const seekTo = useCallback(
    (ms: number) => {
      const last = timeline[timeline.length - 1];
      if (!last) return;
      const capped = Math.max(0, Math.min(ms, last.start + last.ms));
      // Walk forward rather than searching backwards: landing exactly on a
      // segment's start belongs to that segment, not the one before it.
      let i = 0;
      while (timeline[i] !== last && capped >= timeline[i + 1].start) i++;
      const target = timeline[i];
      const offset = Math.min(Math.max(0, capped - target.start), target.ms);
      setMark({ run: runRef.current, stage: target.stage, offset });
      if (target.stage === audioRef.current) narration.seek(offset);
      dispatch({ type: 'SEEK', stage: target.stage, offset });
    },
    [timeline, narration],
  );

  const restart = useCallback(() => {
    const staysOnIntro = cueFor({ ...state, stage: state.audio }) === 'intro';
    dispatch({ type: 'RESET' });
    setMark(null);
    // When the cue changes, loading the new clip already restarts playback;
    // rewinding here too would briefly play the outgoing clip.
    if (staysOnIntro) {
      narration.seek(0);
      narration.resume();
    }
  }, [narration, state]);

  // With narration the bar reads the narration pointer. Without, it follows the
  // scene, whose steps last milliseconds where a clip lasts seconds — so map
  // elapsed onto the segment and the bar sweeps the same ground, only faster.
  const shown = audioDriving
    ? segment
    : timeline.find((s) => s.stage === stage);
  const spent = audioDriving
    ? Math.min(state.audioElapsed, shown?.ms ?? 0)
    : (shown?.ms ?? 0) *
      (steps[stage].duration
        ? Math.min(1, state.elapsed / steps[stage].duration)
        : 0);
  // Whichever pointer is driving owns the animation clock. Narration freezes
  // the scene's own ticker, so reading state.elapsed there would leave every
  // packet parked on its origin for the length of the sentence.
  const live = audioDriving && !hand && stage === state.audio;
  const stepElapsed = live ? state.audioElapsed : state.elapsed;
  // Beats spread across the whole sentence, unlike the packet, which crosses
  // early and then rests at its destination.
  const span = live
    ? (segment?.ms ?? steps[stage].duration)
    : steps[stage].duration;
  // A leg can start partway through its sentence. The flight is then measured
  // against what is left of the clip, so the packet still lands with enough
  // time for the scene to react to its arrival.
  const lead = live ? span * (steps[stage].routeAt ?? 0) : 0;
  const legElapsed = stepElapsed - lead;
  const flight = flightMs(
    stage,
    hand ? undefined : live ? span - lead : clip?.ms,
  );
  const playback: Playback = {
    timeline,
    segment,
    position: shown ? shown.start + spent : 0,
    total,
    waiting: isWaiting(state),
    // A hand-driven step gets the quick flight; a narrated one is stretched to
    // sit inside the sentence describing it.
    flight,
    stepElapsed,
    stepProgress: span ? Math.min(1, stepElapsed / span) : 1,
    landed: legElapsed >= flight,
    legElapsed,
    legActive: legElapsed >= 0,
    narration,
    seekTo,
    restart,
  };
  return { state, dispatch, playback };
}
