import { useCallback, useEffect, useRef, useState } from 'react';
import type { NarrationClip } from './narration/manifest';

const FADE_MS = 140;
const RATE_KEY = 'vibe-narration-rate';
export const rates = [0.75, 1, 1.25, 1.5, 2];

/**
 * jsdom and any browser without AAC support report an empty canPlayType; those
 * environments fall back to the wall clock instead of creating an element.
 */
function mediaSupported(): boolean {
  if (typeof window === 'undefined' || typeof Audio === 'undefined')
    return false;
  try {
    return !!new Audio().canPlayType('audio/mp4');
  } catch {
    return false;
  }
}

// Storage can throw (Safari private mode) or be stubbed out, so never trust it.
function storedRate(): number {
  try {
    const saved = Number(localStorage.getItem(RATE_KEY));
    return rates.includes(saved) ? saved : 1;
  } catch {
    return 1;
  }
}

export interface Narration {
  /** False when this environment cannot play the clips at all. */
  supported: boolean;
  /** True once the browser refused playback for lack of a user gesture. */
  blocked: boolean;
  /** True when the clip itself will not load or decode. */
  failed: boolean;
  speaking: boolean;
  rate: number;
  setRate: (rate: number) => void;
  muted: boolean;
  toggleMuted: () => void;
  seek: (ms: number) => void;
  /** Retry playback from a user gesture after autoplay was refused. */
  resume: () => void;
}

/**
 * Owns the single <audio> element the whole lesson plays through — one element
 * because iOS only keeps the one unlocked by the original user gesture.
 * The element is the clock: callers derive every animation from onClock.
 */
export function useNarration({
  clip,
  nextClip,
  active,
  startAt = 0,
  onClock,
  onEnded,
}: {
  clip?: NarrationClip;
  nextClip?: NarrationClip;
  active: boolean;
  /** Offset to resume the next loaded clip at, used when a seek changes step. */
  startAt?: number;
  onClock: (ms: number) => void;
  onEnded: () => void;
}): Narration {
  const [supported] = useState(mediaSupported);
  const [blocked, setBlocked] = useState(false);
  const [failed, setFailed] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [rate, setRate] = useState(storedRate);
  const [muted, setMuted] = useState(false);
  const elementRef = useRef<HTMLAudioElement | null>(null);
  const preloadRef = useRef<HTMLAudioElement | null>(null);
  const fadeRef = useRef(0);
  const clockRef = useRef(onClock);
  const endedRef = useRef(onEnded);
  const activeRef = useRef(active);
  const startAtRef = useRef(startAt);
  const rateRef = useRef(rate);
  const mutedRef = useRef(muted);
  clockRef.current = onClock;
  endedRef.current = onEnded;
  activeRef.current = active;
  startAtRef.current = startAt;
  rateRef.current = rate;
  mutedRef.current = muted;

  const ensure = useCallback(() => {
    if (!supported) return null;
    if (!elementRef.current) {
      const el = new Audio();
      el.preload = 'auto';
      el.dataset.role = 'narration';
      elementRef.current = el;
    }
    return elementRef.current;
  }, [supported]);

  const play = useCallback((el: HTMLAudioElement) => {
    const started = el.play();
    if (started && typeof started.then === 'function')
      started.then(
        () => {
          setBlocked(false);
          setSpeaking(true);
        },
        () => {
          setBlocked(true);
          setSpeaking(false);
        },
      );
    else setSpeaking(true);
  }, []);

  useEffect(() => {
    const el = ensure();
    if (!el) return;
    const ended = () => {
      setSpeaking(false);
      endedRef.current();
    };
    const broke = () => setFailed(true);
    el.addEventListener('ended', ended);
    el.addEventListener('error', broke);
    return () => {
      el.removeEventListener('ended', ended);
      el.removeEventListener('error', broke);
    };
  }, [ensure]);

  // Swap clips, fading out anything still speaking so an early click on an
  // interactive button never cuts the narrator off mid-word.
  const src = clip?.src;
  useEffect(() => {
    const el = ensure();
    if (!el) return;
    cancelAnimationFrame(fadeRef.current);
    if (!src) {
      el.pause();
      setSpeaking(false);
      return;
    }
    const load = () => {
      const offset = startAtRef.current;
      setFailed(false);
      el.volume = 1;
      el.muted = mutedRef.current;
      el.src = src;
      el.playbackRate = rateRef.current;
      if (offset > 0)
        el.addEventListener(
          'loadedmetadata',
          () => {
            el.currentTime = offset / 1000;
          },
          { once: true },
        );
      if (activeRef.current) play(el);
    };
    if (!el.paused && el.currentTime > 0.05) {
      const from = el.volume;
      const start = performance.now();
      const fade = (now: number) => {
        const done = Math.min(1, (now - start) / FADE_MS);
        el.volume = from * (1 - done);
        if (done < 1) fadeRef.current = requestAnimationFrame(fade);
        else {
          el.pause();
          load();
        }
      };
      fadeRef.current = requestAnimationFrame(fade);
    } else load();
    return () => cancelAnimationFrame(fadeRef.current);
  }, [src, ensure, play]);

  useEffect(() => {
    const el = elementRef.current;
    if (!el || !src) return;
    if (active) play(el);
    else {
      el.pause();
      setSpeaking(false);
    }
  }, [active, src, play]);

  // The audio element drives every animation: read it, never a wall clock.
  useEffect(() => {
    if (!supported || !active || !src) return;
    let frame = 0;
    const read = () => {
      const el = elementRef.current;
      if (el) clockRef.current(el.currentTime * 1000);
      frame = requestAnimationFrame(read);
    };
    frame = requestAnimationFrame(read);
    return () => cancelAnimationFrame(frame);
  }, [supported, active, src]);

  useEffect(() => {
    const el = elementRef.current;
    if (el) el.playbackRate = rate;
    try {
      localStorage.setItem(RATE_KEY, String(rate));
    } catch {
      /* storage unavailable */
    }
  }, [rate]);

  useEffect(() => {
    const el = elementRef.current;
    if (el) el.muted = muted;
  }, [muted]);

  const preloadSrc = nextClip?.src;
  useEffect(() => {
    if (!supported || !preloadSrc) return;
    if (!preloadRef.current) {
      const el = new Audio();
      el.preload = 'auto';
      el.dataset.role = 'narration-preload';
      preloadRef.current = el;
    }
    preloadRef.current.src = preloadSrc;
  }, [supported, preloadSrc]);

  const seek = useCallback((ms: number) => {
    const el = elementRef.current;
    if (el && Number.isFinite(ms)) el.currentTime = Math.max(0, ms) / 1000;
  }, []);

  const toggleMuted = useCallback(() => setMuted((on) => !on), []);

  const resume = useCallback(() => {
    const el = elementRef.current;
    if (el) play(el);
  }, [play]);

  return {
    supported,
    blocked,
    failed,
    speaking: speaking && active,
    rate,
    setRate,
    muted,
    toggleMuted,
    seek,
    resume,
  };
}
