import type { CueId } from '../flow';
import generated from './clips.generated.json';

export interface NarrationClip {
  src: string;
  ms: number;
  /** Fingerprint of the text that produced this audio, used by the generator. */
  hash: string;
  text: string;
}

/**
 * Clip lengths are baked in at generation time, so the lesson timeline exists
 * before any audio loads. A missing cue simply falls back to the step timer.
 */
export const narration: Partial<Record<CueId, NarrationClip>> =
  generated.clips as Record<string, NarrationClip>;
export const narrationVoice: string = generated.voice;
