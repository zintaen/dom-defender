// Tiny Web Audio helpers — no external deps.
let audioCtx: AudioContext | null = null;

function getAudio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    try { audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)(); } catch { return null; }
  }
  return audioCtx;
}

export function warmAudio() { getAudio(); }

function beep(opts: { freq?: number; dur?: number; type?: OscillatorType; vol?: number; slide?: number } = {}) {
  const { freq = 440, dur = 0.08, type = "square", vol = 0.08, slide = 0 } = opts;
  const ctx = getAudio();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ctx.currentTime);
  if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), ctx.currentTime + dur);
  gain.gain.setValueAtTime(vol, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
  osc.connect(gain); gain.connect(ctx.destination);
  osc.start(); osc.stop(ctx.currentTime + dur);
}

export function sfx(name: string) {
  switch (name) {
    case "fix":
      beep({ freq: 660, dur: 0.1, type: "square", slide: 440, vol: 0.1 });
      setTimeout(() => beep({ freq: 880, dur: 0.08, type: "square", vol: 0.08 }), 60); break;
    case "hit":     beep({ freq: 200, dur: 0.05, type: "square", slide: -80, vol: 0.07 }); break;
    case "spawn":   beep({ freq: 120, dur: 0.12, type: "sawtooth", slide: 60, vol: 0.05 }); break;
    case "tool":    beep({ freq: 500, dur: 0.04, type: "triangle", vol: 0.06 }); break;
    case "crash":
      beep({ freq: 300, dur: 0.3, type: "sawtooth", slide: -280, vol: 0.15 });
      setTimeout(() => beep({ freq: 80, dur: 0.8, type: "sawtooth", slide: -60, vol: 0.2 }), 150); break;
    case "combo":
      beep({ freq: 800, dur: 0.08, type: "square", vol: 0.1 });
      setTimeout(() => beep({ freq: 1000, dur: 0.08, type: "square", vol: 0.1 }), 80);
      setTimeout(() => beep({ freq: 1200, dur: 0.12, type: "square", vol: 0.1 }), 160); break;
    case "wave":
      beep({ freq: 300, dur: 0.1, type: "triangle", vol: 0.08 });
      setTimeout(() => beep({ freq: 500, dur: 0.15, type: "triangle", vol: 0.08 }), 100); break;
    case "vacuum":  beep({ freq: 180, dur: 0.05, type: "sawtooth", vol: 0.04 }); break;
    case "freeze":
      beep({ freq: 1200, dur: 0.1, type: "sine", slide: -800, vol: 0.08 }); break;
    case "autofix":
      beep({ freq: 700, dur: 0.06, type: "square", vol: 0.08 });
      setTimeout(() => beep({ freq: 900, dur: 0.06, type: "square", vol: 0.08 }), 60);
      setTimeout(() => beep({ freq: 1100, dur: 0.1, type: "square", vol: 0.08 }), 120); break;
    case "shield":
      beep({ freq: 200, dur: 0.3, type: "sine", slide: 200, vol: 0.1 }); break;
    case "magnet":
      beep({ freq: 400, dur: 0.15, type: "triangle", slide: 200, vol: 0.08 }); break;
    case "boss":
      beep({ freq: 80, dur: 0.4, type: "sawtooth", vol: 0.15 });
      setTimeout(() => beep({ freq: 60, dur: 0.6, type: "sawtooth", vol: 0.15 }), 200); break;
    case "boss_hit":
      beep({ freq: 300, dur: 0.08, type: "square", slide: -200, vol: 0.1 }); break;
    case "boss_die":
      for (let i = 0; i < 8; i++) {
        setTimeout(() => beep({ freq: 800 - i * 80, dur: 0.08, type: "square", vol: 0.1 }), i * 50);
      }
      break;
    case "powerup_ready":
      beep({ freq: 600, dur: 0.04, type: "sine", vol: 0.05 });
      setTimeout(() => beep({ freq: 900, dur: 0.06, type: "sine", vol: 0.05 }), 50); break;
  }
}
