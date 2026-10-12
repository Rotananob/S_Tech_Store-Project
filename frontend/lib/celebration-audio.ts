/**
 * S Tech Store - Real Synthesized Celebration Fanfare Audio
 * Uses HTML5 Web Audio API to produce a bright, crisp celebration chime/fanfare.
 * 100% reliable across browsers without external audio assets.
 */

export function playCelebrationSound() {
  if (typeof window === "undefined") return;

  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }

    // Melodic celebration fanfare chord progression: C5 -> E5 -> G5 -> C6 -> E6
    const notes = [
      { freq: 523.25, time: 0.00, duration: 0.35, gain: 0.25 }, // C5
      { freq: 659.25, time: 0.10, duration: 0.35, gain: 0.28 }, // E5
      { freq: 783.99, time: 0.20, duration: 0.45, gain: 0.32 }, // G5
      { freq: 1046.50, time: 0.32, duration: 0.85, gain: 0.38 }, // C6 (Peak)
      { freq: 1318.51, time: 0.45, duration: 0.95, gain: 0.30 }, // E6 (High sparkle)
    ];

    notes.forEach((n) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "triangle"; // Warm, bright harmonic bell chime
      osc.frequency.setValueAtTime(n.freq, ctx.currentTime + n.time);

      gain.gain.setValueAtTime(0.001, ctx.currentTime + n.time);
      gain.gain.linearRampToValueAtTime(n.gain, ctx.currentTime + n.time + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + n.time + n.duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + n.time);
      osc.stop(ctx.currentTime + n.time + n.duration + 0.05);
    });
  } catch (err) {
    console.warn("Celebration audio could not play:", err);
  }
}
