/**
 * Synthesized Web Audio Notification Engine for Xia Chat Dashboard
 * Uses browser native Web Audio API oscillators — zero external sound assets or mp3/wav files required.
 */

let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  try {
    if (!audioContext && typeof window !== 'undefined') {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtxClass) {
        audioContext = new AudioCtxClass();
      }
    }
    if (audioContext && audioContext.state === 'suspended') {
      audioContext.resume().catch(() => {});
    }
    return audioContext;
  } catch {
    return null;
  }
}

export function playInboxChime(type: 'incoming' | 'outgoing' | 'resolve' | 'pop' = 'incoming'): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    if (type === 'incoming') {
      // Pleasant dual tone chime (F5 698Hz -> A5 880Hz)
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();
      gain.connect(ctx.destination);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(698.46, now);
      osc1.connect(gain);
      osc1.start(now);
      osc1.stop(now + 0.2);

      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(880, now + 0.15);
      osc2.connect(gain);
      osc2.start(now + 0.15);
      osc2.stop(now + 0.45);
    } else if (type === 'outgoing') {
      // Gentle confirmation pop (440Hz -> 660Hz)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      gain.connect(ctx.destination);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(660, now + 0.16);
      osc.connect(gain);
      osc.start(now);
      osc.stop(now + 0.18);
    } else if (type === 'resolve') {
      // Uplifting 3-note resolve arpeggio chord (C5 523Hz -> E5 659Hz -> G5 784Hz)
      [523.25, 659.25, 783.99].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        gain.connect(ctx.destination);
        const start = now + idx * 0.11;
        gain.gain.setValueAtTime(0.08, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.32);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, start);
        osc.connect(gain);
        osc.start(start);
        osc.stop(start + 0.32);
      });
    } else if (type === 'pop') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      gain.connect(ctx.destination);
      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, now);
      osc.connect(gain);
      osc.start(now);
      osc.stop(now + 0.1);
    }
  } catch (err) {
    console.warn('[AudioChime] Play error:', err);
  }
}
