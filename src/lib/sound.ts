/** Tiny WebAudio synth, so the game ships with no audio files. Sounds only start after a user gesture. */
export type SoundName = 'dice' | 'step' | 'correct' | 'wrong' | 'ladder' | 'snake' | 'win' | 'tick';

let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  try {
    if (!ctx) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(freq: number, start: number, dur: number, type: OscillatorType = 'sine', gain = 0.18, endFreq?: number) {
  const ac = audio();
  if (!ac) return;
  const t0 = ac.currentTime + start;
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (endFreq) osc.frequency.exponentialRampToValueAtTime(endFreq, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

function noiseBurst(start: number, dur: number, gain = 0.12) {
  const ac = audio();
  if (!ac) return;
  const len = Math.floor(ac.sampleRate * dur);
  const buf = ac.createBuffer(1, len, ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ac.createBufferSource();
  const g = ac.createGain();
  const filter = ac.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 1800;
  g.gain.value = gain;
  src.buffer = buf;
  src.connect(filter).connect(g).connect(ac.destination);
  src.start(ac.currentTime + start);
}

export function playSound(name: SoundName) {
  switch (name) {
    case 'dice':
      for (let i = 0; i < 9; i++) noiseBurst(i * 0.14 + Math.random() * 0.04, 0.05, 0.1);
      break;
    case 'step':
      tone(520, 0, 0.08, 'triangle', 0.12);
      break;
    case 'tick':
      tone(880, 0, 0.05, 'square', 0.04);
      break;
    case 'correct':
      tone(660, 0, 0.14, 'triangle');
      tone(880, 0.12, 0.14, 'triangle');
      tone(1320, 0.24, 0.3, 'triangle', 0.14);
      break;
    case 'wrong':
      tone(220, 0, 0.22, 'sawtooth', 0.09);
      tone(165, 0.2, 0.35, 'sawtooth', 0.09);
      break;
    case 'ladder':
      [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, i * 0.12, 0.16, 'triangle', 0.13));
      break;
    case 'snake':
      tone(900, 0, 0.9, 'sine', 0.14, 120);
      noiseBurst(0, 0.6, 0.05);
      break;
    case 'win':
      [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.16, 0.3, 'triangle', 0.16));
      [784, 1047].forEach((f) => tone(f, 0.7, 0.8, 'triangle', 0.14));
      break;
  }
}
