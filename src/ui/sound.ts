/**
 * Tiny synthesized sound effects (Web Audio, no asset files). The AudioContext is
 * created lazily on the first sound, which always follows a user gesture.
 */
export type Sfx = 'place' | 'rotate' | 'erase' | 'deny' | 'depart' | 'chuff' | 'pickup' | 'thanks' | 'arrive' | 'crash' | 'pop' | 'star1' | 'star2' | 'star3';

const MUTE_KEY = 'rail-tiles:muted';

let ctx: AudioContext | null = null;
let muted = readMuted();

function readMuted(): boolean {
  try {
    return typeof localStorage !== 'undefined' && localStorage.getItem(MUTE_KEY) === '1';
  } catch {
    return false;
  }
}

export function isMuted(): boolean {
  return muted;
}

export function setMuted(value: boolean): void {
  muted = value;
  try {
    localStorage.setItem(MUTE_KEY, value ? '1' : '0');
  } catch {
    // Storage unavailable: the setting just won't persist.
  }
}

function audio(): AudioContext | null {
  if (muted || typeof window === 'undefined') return null;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  ctx ??= new Ctor();
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

/** One enveloped oscillator note. */
function tone(ac: AudioContext, freq: number, start: number, dur: number, opts: { type?: OscillatorType; gain?: number; slideTo?: number } = {}) {
  const osc = ac.createOscillator();
  const amp = ac.createGain();
  osc.type = opts.type ?? 'sine';
  osc.frequency.setValueAtTime(freq, start);
  if (opts.slideTo) osc.frequency.exponentialRampToValueAtTime(opts.slideTo, start + dur);
  const peak = opts.gain ?? 0.15;
  amp.gain.setValueAtTime(0.0001, start);
  amp.gain.exponentialRampToValueAtTime(peak, start + 0.012);
  amp.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  osc.connect(amp).connect(ac.destination);
  osc.start(start);
  osc.stop(start + dur + 0.02);
}

/** Filtered noise burst (steam chuff, crash thud). */
function noise(ac: AudioContext, start: number, dur: number, opts: { freq: number; gain: number }) {
  const len = Math.ceil(ac.sampleRate * dur);
  const buf = ac.createBuffer(1, len, ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  const src = ac.createBufferSource();
  src.buffer = buf;
  const filter = ac.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = opts.freq;
  const amp = ac.createGain();
  amp.gain.setValueAtTime(opts.gain, start);
  amp.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  src.connect(filter).connect(amp).connect(ac.destination);
  src.start(start);
}

export function play(sfx: Sfx): void {
  const ac = audio();
  if (!ac) return;
  const t = ac.currentTime;
  switch (sfx) {
    case 'place':
      tone(ac, 520, t, 0.09, { type: 'triangle', gain: 0.18, slideTo: 760 });
      break;
    case 'rotate':
      tone(ac, 880, t, 0.05, { type: 'square', gain: 0.05 });
      break;
    case 'erase':
      tone(ac, 600, t, 0.1, { type: 'triangle', gain: 0.14, slideTo: 300 });
      break;
    case 'deny':
      tone(ac, 180, t, 0.12, { type: 'square', gain: 0.06 });
      tone(ac, 150, t + 0.08, 0.12, { type: 'square', gain: 0.05 });
      break;
    case 'depart':
      // Two-note steam whistle.
      tone(ac, 740, t, 0.32, { type: 'sine', gain: 0.1 });
      tone(ac, 932, t, 0.32, { type: 'sine', gain: 0.07 });
      tone(ac, 740, t + 0.36, 0.42, { type: 'sine', gain: 0.1 });
      tone(ac, 932, t + 0.36, 0.42, { type: 'sine', gain: 0.07 });
      break;
    case 'chuff':
      noise(ac, t, 0.12, { freq: 900, gain: 0.05 });
      break;
    case 'pickup':
      tone(ac, 1046, t, 0.12, { type: 'sine', gain: 0.14 });
      tone(ac, 1568, t + 0.08, 0.2, { type: 'sine', gain: 0.12 });
      break;
    case 'thanks':
      // A chirpy little "thank you!": two quick rising blips.
      tone(ac, 880, t, 0.08, { type: 'sine', gain: 0.12, slideTo: 1175 });
      tone(ac, 1175, t + 0.11, 0.12, { type: 'sine', gain: 0.12, slideTo: 1568 });
      break;
    case 'arrive':
      [523, 659, 784, 1046].forEach((f, i) => tone(ac, f, t + i * 0.1, 0.28, { type: 'triangle', gain: 0.15 }));
      break;
    case 'pop':
      // Confetti popper: a bright burst with a quick upward chirp.
      noise(ac, t, 0.09, { freq: 5000, gain: 0.12 });
      tone(ac, 660, t + 0.02, 0.18, { type: 'triangle', gain: 0.1, slideTo: 1320 });
      break;
    case 'star1':
    case 'star2':
    case 'star3': {
      // One ping per star, climbing a major triad.
      const f = { star1: 1046, star2: 1318, star3: 1568 }[sfx];
      tone(ac, f, t, 0.35, { type: 'sine', gain: 0.13 });
      tone(ac, f * 2, t, 0.18, { type: 'sine', gain: 0.04 });
      break;
    }
    case 'crash':
      noise(ac, t, 0.3, { freq: 400, gain: 0.3 });
      tone(ac, 140, t, 0.25, { type: 'sine', gain: 0.2, slideTo: 60 });
      break;
  }
}
