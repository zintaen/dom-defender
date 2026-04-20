"use client";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LandingPage } from "./LandingPage";
import { sfx, warmAudio } from "./sounds";
import "./styles.css";

import { Skin, getSkin } from "@/lib/game/skins";
import { POWER_UPS, PowerUpDef } from "@/lib/game/powerups";
import { ACHIEVEMENTS, RunSummary } from "@/lib/game/achievements";
import { mulberry32 } from "@/lib/game/dailySeed";
import { ReplayRecorder, ReplayLog } from "@/lib/game/replay";

// ============================================================
//  Types & constants
// ============================================================
type ToolId = "tape" | "debugger" | "vacuum";

const TOOLS: Record<ToolId, { label: string; key: string; icon: string; hint: string }> = {
  tape:     { label: "Duct Tape",         key: "1", icon: "🩹", hint: "Drag drifting elements back into place" },
  debugger: { label: "Debugger",          key: "2", icon: "🔨", hint: "Click console errors to smash them" },
  vacuum:   { label: "Garbage Collector", key: "3", icon: "🌀", hint: "Click-sweep memory leaks to absorb them" },
};

type CssBugType = "DRIFT" | "COMIC" | "INVERT" | "CHROMATIC";
const CSS_BUG_VARIANTS: CssBugType[] = ["DRIFT", "COMIC", "INVERT", "CHROMATIC"];

const GARBAGE_CHARS = ["0xFF", "undefined", "NaN", "[object Object]", "0x00", "null", "#&@%!", "<<ERR>>", "404", "{...}", "???", "██▓▒░", "FREE()", "malloc", "0xDEADBEEF"];
const ERROR_MESSAGES = [
  "Uncaught TypeError: Cannot read property 'length' of undefined",
  "ReferenceError: useState is not defined",
  "SyntaxError: Unexpected token '<' in JSON at position 0",
  "Error: Maximum call stack size exceeded",
  "TypeError: Failed to fetch",
  "Warning: Each child in a list should have a unique 'key' prop.",
  "DOMException: Permission denied to access property 'document'",
  "CORS policy: No 'Access-Control-Allow-Origin' header present",
  "RangeError: Invalid array length",
  "Hydration failed because the initial UI does not match what was rendered on the server.",
];

interface BaseBug { id: number; type: string; }
interface CssBug extends BaseBug { type: CssBugType; originalTransform: string; }
interface ConsoleBug extends BaseBug { type: "CONSOLE"; x: number; y: number; hp: number; maxHp: number; message: string; rot: number; }
interface LeakBug extends BaseBug { type: "LEAK"; x: number; y: number; text: string; }
type Bug = CssBug | ConsoleBug | LeakBug;

interface Boss {
  id: number;
  x: number; y: number;
  weakPoints: { id: string; tool: ToolId; broken: boolean; angle: number; }[];
  spawnedAt: number;
  damagePerSec: number;
}

interface PowerUpState {
  id: string;
  cooldownUntil: number; // timestamp
  activeUntil?: number;  // timestamp
}

interface Flash { id: number; x: number; y: number; amount: string; color: string; }
interface ConfettiPiece { id: number; x: number; y: number; fx: number; fy: number; color: string; }

// ============================================================
//  Component
// ============================================================
export interface GameProps {
  mode: "endless" | "daily";
  skin: Skin;
  initialSeed?: number;
  dailyKey?: string;
  onRunEnd?: (summary: RunSummary) => void;
  onReplayReady?: (log: ReplayLog) => void;
  // optional UI extras
  topRightExtra?: React.ReactNode;
}

type Screen = "idle" | "playing" | "over";

export function Game({ mode, skin, initialSeed, dailyKey, onRunEnd, onReplayReady, topRightExtra }: GameProps) {
  const [screen, setScreen] = useState<Screen>("idle");
  const [score, setScore] = useState(0);
  const [crash, setCrash] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [wave, setWave] = useState(1);
  const [tool, setTool] = useState<ToolId>("tape");
  const [bugs, setBugs] = useState<Bug[]>([]);
  const [boss, setBoss] = useState<Boss | null>(null);
  const [flashes, setFlashes] = useState<Flash[]>([]);
  const [confetti, setConfetti] = useState<ConfettiPiece[]>([]);
  const [comboText, setComboText] = useState<string>("");
  const [powerUpStates, setPowerUpStates] = useState<PowerUpState[]>(POWER_UPS.map((p) => ({ id: p.id, cooldownUntil: 0 })));
  const [tickNow, setTickNow] = useState(Date.now());           // re-render driver
  const [activeBuffs, setActiveBuffs] = useState<{ freeze?: number; magnet?: number; shield?: number }>({});

  const pageRef = useRef<HTMLDivElement>(null);
  const bugIdRef = useRef(1);
  const waveRef = useRef(1);
  const startTimeRef = useRef(0);
  const draggingRef = useRef<{ id: number; el: HTMLElement; startX: number; startY: number; offsetX: number; offsetY: number; } | null>(null);
  const cursorRef = useRef({ x: 0, y: 0 });
  const comboRef = useRef({ count: 0, max: 0, lastFix: 0 });
  const runStatsRef = useRef({ bugsFixed: 0, bossesDefeated: 0, powerUpsUsed: 0 });
  const rngRef = useRef<() => number>(Math.random);
  const lastBossSpawnRef = useRef(0);
  const recorderRef = useRef(new ReplayRecorder());
  const scoreRef = useRef(0);
  const crashRef = useRef(0);

  // ============================================================
  //  RNG init per run
  // ============================================================
  const initRng = useCallback(() => {
    // Seed is set for daily challenges and for shared private-seed URLs
    // (e.g. /play?seed=12345). Otherwise fall back to Math.random.
    if (typeof initialSeed === "number") {
      rngRef.current = mulberry32(initialSeed);
    } else {
      rngRef.current = Math.random;
    }
  }, [initialSeed]);

  // ============================================================
  //  Cursor tracking (for magnet)
  // ============================================================
  useEffect(() => {
    const onMove = (e: MouseEvent) => { cursorRef.current = { x: e.clientX, y: e.clientY }; };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  // Mirror score/crash into refs so replay snapshot sampling reads fresh values
  // without forcing the 100ms tick effect to re-register on every tick.
  useEffect(() => { scoreRef.current = score; }, [score]);
  useEffect(() => { crashRef.current = crash; }, [crash]);

  // ============================================================
  //  Cursor class
  // ============================================================
  useEffect(() => {
    document.body.classList.remove("tool-tape", "tool-debugger", "tool-vacuum");
    if (screen === "playing") {
      document.body.classList.add(`tool-${tool}`, "dd-gaming");
    } else {
      document.body.classList.remove("dd-gaming");
    }
    return () => {
      document.body.classList.remove("tool-tape", "tool-debugger", "tool-vacuum", "dd-gaming");
    };
  }, [tool, screen]);

  // ============================================================
  //  Hotkeys
  // ============================================================
  useEffect(() => {
    if (screen !== "playing") return;
    const handler = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      const now = Date.now();
      if (k === "1") { setTool("tape"); sfx("tool"); recorderRef.current.push({ type: "tool", tool: "tape" }, now); }
      if (k === "2") { setTool("debugger"); sfx("tool"); recorderRef.current.push({ type: "tool", tool: "debugger" }, now); }
      if (k === "3") { setTool("vacuum"); sfx("tool"); recorderRef.current.push({ type: "tool", tool: "vacuum" }, now); }
      if (k === "q") tryActivatePowerUp("freeze");
      if (k === "w") tryActivatePowerUp("autofix");
      if (k === "e") tryActivatePowerUp("magnet");
      if (k === "r") tryActivatePowerUp("shield");
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen]);

  // ============================================================
  //  Bug spawner & target picker
  // ============================================================
  const pickRandomTarget = useCallback((): HTMLElement | null => {
    const page = pageRef.current;
    if (!page) return null;
    const candidates = page.querySelectorAll<HTMLElement>('[data-bug-candidate="true"]');
    const healthy = Array.from(candidates).filter((el) => !el.dataset.bugActive);
    if (healthy.length === 0) return null;
    const idx = Math.floor(rngRef.current() * healthy.length);
    return healthy[idx];
  }, []);

  const spawnBug = useCallback(() => {
    if (activeBuffs.freeze && activeBuffs.freeze > Date.now()) return; // frozen
    const r = rngRef.current();
    let typeKey: string;
    if (r < 0.45) typeKey = CSS_BUG_VARIANTS[Math.floor(rngRef.current() * CSS_BUG_VARIANTS.length)];
    else if (r < 0.75) typeKey = "CONSOLE";
    else typeKey = "LEAK";

    const id = bugIdRef.current++;

    if (typeKey === "CONSOLE") {
      const x = 40 + rngRef.current() * (window.innerWidth - 460);
      const y = 100 + rngRef.current() * (window.innerHeight - 280);
      const hp = waveRef.current >= 3 ? 2 : 1;
      const newBug: ConsoleBug = {
        id, type: "CONSOLE", x, y, hp, maxHp: hp,
        message: ERROR_MESSAGES[Math.floor(rngRef.current() * ERROR_MESSAGES.length)],
        rot: (rngRef.current() - 0.5) * 8,
      };
      setBugs((b) => [...b, newBug]);
    } else if (typeKey === "LEAK") {
      const x = 20 + rngRef.current() * (window.innerWidth - 160);
      const y = 120 + rngRef.current() * (window.innerHeight - 220);
      const text = GARBAGE_CHARS[Math.floor(rngRef.current() * GARBAGE_CHARS.length)];
      const newBug: LeakBug = { id, type: "LEAK", x, y, text };
      setBugs((b) => [...b, newBug]);
    } else {
      const target = pickRandomTarget();
      if (!target) return;
      target.dataset.bugActive = String(id);
      const dx = (rngRef.current() - 0.5) * 200;
      const dy = (rngRef.current() - 0.5) * 120;
      const rot = (rngRef.current() - 0.5) * 20;
      const originalTransform = target.style.transform || "";
      if (typeKey === "DRIFT") {
        target.style.setProperty("--dx", `${dx}px`);
        target.style.setProperty("--dy", `${dy}px`);
        target.style.setProperty("--r", `${rot}deg`);
        target.classList.add("dd-bug-drift");
      } else if (typeKey === "COMIC") {
        target.classList.add("dd-bug-comic");
      } else if (typeKey === "INVERT") {
        target.classList.add("dd-bug-invert");
      } else if (typeKey === "CHROMATIC") {
        target.classList.add("dd-bug-chromatic");
      }
      const newBug: CssBug = { id, type: typeKey as CssBugType, originalTransform };
      setBugs((b) => [...b, newBug]);
    }
    sfx("spawn");
  }, [pickRandomTarget, activeBuffs.freeze]);

  const spawnBoss = useCallback(() => {
    const id = bugIdRef.current++;
    const x = window.innerWidth / 2 - 110 + (rngRef.current() - 0.5) * 200;
    const y = window.innerHeight / 2 - 110 + (rngRef.current() - 0.5) * 100;
    const w = waveRef.current;
    const now = Date.now();
    const newBoss: Boss = {
      id, x, y,
      weakPoints: [
        { id: "wp1", tool: "tape",     broken: false, angle: 0 },
        { id: "wp2", tool: "debugger", broken: false, angle: 120 },
        { id: "wp3", tool: "vacuum",   broken: false, angle: 240 },
      ],
      spawnedAt: now,
      damagePerSec: 5 + Math.min(8, w),
    };
    setBoss(newBoss);
    recorderRef.current.push({ type: "boss_spawn" }, now);
    sfx("boss");
  }, []);

  // ============================================================
  //  Removing & scoring
  // ============================================================
  const flashScore = (x: number, y: number, amount: string, color = "#22c55e") => {
    const id = Math.random();
    setFlashes((f) => [...f, { id, x, y, amount, color }]);
    setTimeout(() => setFlashes((f) => f.filter((fl) => fl.id !== id)), 800);
  };
  const burstConfetti = (x: number, y: number, big = false) => {
    const colors = ["#fde047", "#06b6d4", "#a78bfa", "#f472b6", "#22c55e"];
    const n = big ? 30 : 10;
    const pieces: ConfettiPiece[] = [];
    for (let i = 0; i < n; i++) {
      pieces.push({
        id: Math.random(),
        x, y,
        fx: (Math.random() - 0.5) * (big ? 360 : 160),
        fy: -20 - Math.random() * (big ? 200 : 80),
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }
    setConfetti((c) => [...c, ...pieces]);
    const ids = pieces.map(p => p.id);
    setTimeout(() => setConfetti((c) => c.filter((p) => !ids.includes(p.id))), big ? 1300 : 900);
  };

  const removeCssBug = useCallback((id: number) => {
    const page = pageRef.current;
    if (!page) return;
    const el = page.querySelector<HTMLElement>(`[data-bug-active="${id}"]`);
    if (el) {
      el.classList.remove("dd-bug-drift", "dd-bug-comic", "dd-bug-invert", "dd-bug-chromatic");
      el.style.removeProperty("--dx");
      el.style.removeProperty("--dy");
      el.style.removeProperty("--r");
      el.style.transform = "";
      el.style.animation = "";
      delete el.dataset.bugActive;
      el.classList.add("dd-fixed-flash");
      setTimeout(() => el.classList.remove("dd-fixed-flash"), 500);
    }
  }, []);

  const removeBug = useCallback((id: number, bx?: number, by?: number, scoreVal = 100) => {
    let removedType = "";
    setBugs((curr) => {
      const bug = curr.find((b) => b.id === id);
      if (!bug) return curr;
      removedType = bug.type;
      if (CSS_BUG_VARIANTS.includes(bug.type as CssBugType)) removeCssBug(id);
      return curr.filter((b) => b.id !== id);
    });

    // Combo
    const now = Date.now();
    if (now - comboRef.current.lastFix < 1500) comboRef.current.count += 1;
    else comboRef.current.count = 1;
    comboRef.current.lastFix = now;
    comboRef.current.max = Math.max(comboRef.current.max, comboRef.current.count);

    const combo = comboRef.current.count;
    const total = scoreVal + (combo > 1 ? (combo - 1) * 25 : 0);
    setScore((s) => s + total);
    runStatsRef.current.bugsFixed += 1;

    if (removedType) {
      recorderRef.current.push({ type: "fix", bugType: removedType, score: total }, now);
    }

    if (bx != null && by != null) {
      flashScore(bx, by, `+${total}`);
      burstConfetti(bx, by);
    }
    if (combo >= 3 && combo % 3 === 0) {
      setComboText(`x${combo} COMBO!`);
      sfx("combo");
      recorderRef.current.push({ type: "combo", value: combo }, now);
      setTimeout(() => setComboText(""), 900);
    }
    sfx("fix");
  }, [removeCssBug]);

  // Console + leak click handlers
  const onConsoleClick = (bug: ConsoleBug, e: React.MouseEvent) => {
    e.stopPropagation();
    if (tool !== "debugger") { sfx("hit"); return; }
    sfx("hit");
    if (bug.hp <= 1) removeBug(bug.id, bug.x + 160, bug.y + 30);
    else setBugs((curr) => curr.map((b) => b.id === bug.id ? { ...(b as ConsoleBug), hp: (b as ConsoleBug).hp - 1 } : b));
  };
  const onLeakInteract = (bug: LeakBug, e: React.MouseEvent) => {
    e.stopPropagation();
    if (tool !== "vacuum") return;
    sfx("vacuum");
    removeBug(bug.id, bug.x + 20, bug.y + 10);
  };

  // Boss weak point click
  const onWeakPointClick = (wpId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!boss) return;
    const wp = boss.weakPoints.find((w) => w.id === wpId);
    if (!wp || wp.broken) return;
    if (tool !== wp.tool) { sfx("hit"); return; }
    sfx("boss_hit");
    const updated = { ...boss, weakPoints: boss.weakPoints.map((w) => w.id === wpId ? { ...w, broken: true } : w) };
    setBoss(updated);
    setScore((s) => s + 250);
    recorderRef.current.push({ type: "boss_hit" }, Date.now());
    flashScore(boss.x + 110, boss.y + 110, "+250", "#f97316");
    if (updated.weakPoints.every((w) => w.broken)) {
      // Boss down
      setScore((s) => s + 1000);
      recorderRef.current.push({ type: "boss_down" }, Date.now());
      flashScore(boss.x + 110, boss.y + 90, "+1000 BOSS DOWN!", "#fde047");
      burstConfetti(boss.x + 110, boss.y + 110, true);
      runStatsRef.current.bossesDefeated += 1;
      sfx("boss_die");
      setBoss(null);
      // Reduce crash a bit as a reward
      setCrash((c) => Math.max(0, c - 15));
    }
  };

  // ============================================================
  //  Drag & drop for drift bugs
  // ============================================================
  useEffect(() => {
    if (screen !== "playing") return;
    const onMouseDown = (e: MouseEvent) => {
      if (tool !== "tape") return;
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const el = target.closest<HTMLElement>("[data-bug-active]");
      if (!el) return;
      const id = Number(el.dataset.bugActive);
      // Compute current transform offset
      const computed = getComputedStyle(el).transform;
      let mx = 0, my = 0;
      if (computed && computed !== "none") {
        try { const m = new DOMMatrixReadOnly(computed); mx = m.m41; my = m.m42; } catch {}
      }
      el.style.animation = "none";
      el.classList.add("dd-dragging");
      draggingRef.current = { id, el, startX: e.clientX, startY: e.clientY, offsetX: mx, offsetY: my };
      e.preventDefault();
    };
    const onMouseMove = (e: MouseEvent) => {
      const d = draggingRef.current;
      if (!d) return;
      const dx = e.clientX - d.startX + d.offsetX;
      const dy = e.clientY - d.startY + d.offsetY;
      d.el.style.transform = `translate(${dx}px, ${dy}px)`;
      const dist = Math.hypot(dx, dy);
      if (dist < 40) {
        d.el.style.transform = "translate(0,0)";
        const rect = d.el.getBoundingClientRect();
        const bx = rect.left + rect.width / 2;
        const by = rect.top + rect.height / 2;
        d.el.classList.remove("dd-dragging");
        const id = d.id;
        draggingRef.current = null;
        removeBug(id, bx, by);
      }
    };
    const onMouseUp = () => {
      const d = draggingRef.current;
      if (!d) return;
      d.el.classList.remove("dd-dragging");
      d.el.style.animation = "";
      draggingRef.current = null;
    };
    window.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [screen, tool, removeBug]);

  // ============================================================
  //  Game tick — damage, magnet drift, expirations
  // ============================================================
  useEffect(() => {
    if (screen !== "playing") return;
    const interval = setInterval(() => {
      const now = Date.now();
      setTickNow(now);
      const secs = (now - startTimeRef.current) / 1000;
      setElapsed(secs);

      // Damage from active bugs (paused if shield is up)
      const shieldActive = (activeBuffs.shield ?? 0) > now;
      if (!shieldActive) {
        let totalDmg = 0;
        const cur = bugs;
        for (const b of cur) {
          if (b.type === "CONSOLE") totalDmg += 1.8;
          else if (b.type === "LEAK") totalDmg += 1.0;
          else totalDmg += 1.3;
        }
        if (boss) totalDmg += boss.damagePerSec;
        setCrash((c) => Math.min(100, c + totalDmg * 0.1));
      }

      // Wave progression
      const newWave = Math.floor(secs / 15) + 1;
      if (newWave !== waveRef.current) {
        waveRef.current = newWave;
        setWave(newWave);
        recorderRef.current.push({ type: "wave", wave: newWave }, now);
        sfx("wave");
      }

      // Per-second snapshot (reads fresh values via refs)
      recorderRef.current.tick(now, {
        score: scoreRef.current,
        crash: crashRef.current,
        wave: waveRef.current,
        bugs: bugs.length,
      });

      // Magnet pull on bugs
      if ((activeBuffs.magnet ?? 0) > now) {
        const cx = cursorRef.current.x, cy = cursorRef.current.y;
        setBugs((curr) => curr.map((b) => {
          if (b.type === "CONSOLE") {
            const cb = b as ConsoleBug;
            const dx = cx - (cb.x + 170), dy = cy - (cb.y + 30);
            return { ...cb, x: cb.x + dx * 0.08, y: cb.y + dy * 0.08 };
          }
          if (b.type === "LEAK") {
            const lb = b as LeakBug;
            const dx = cx - (lb.x + 25), dy = cy - (lb.y + 8);
            return { ...lb, x: lb.x + dx * 0.12, y: lb.y + dy * 0.12 };
          }
          return b;
        }));
      }

      // Boss spawn pacing — wave 4+, every 30s
      if (waveRef.current >= 4 && !boss) {
        const sinceLast = (now - lastBossSpawnRef.current) / 1000;
        if (sinceLast > 30) {
          lastBossSpawnRef.current = now;
          spawnBoss();
        }
      }
    }, 100);
    return () => clearInterval(interval);
  }, [screen, bugs, boss, activeBuffs, spawnBoss]);

  // ============================================================
  //  Bug spawn timing
  // ============================================================
  useEffect(() => {
    if (screen !== "playing") return;
    let t: ReturnType<typeof setTimeout> | null = null;
    const scheduleNext = () => {
      const w = waveRef.current;
      const base = Math.max(600, 3200 - w * 600);
      const jitter = rngRef.current() * 400;
      t = setTimeout(() => {
        spawnBug();
        if (w >= 3 && rngRef.current() < 0.25) setTimeout(spawnBug, 200);
        if (w >= 5 && rngRef.current() < 0.30) setTimeout(spawnBug, 400);
        scheduleNext();
      }, base + jitter);
    };
    scheduleNext();
    return () => { if (t) clearTimeout(t); };
  }, [screen, spawnBug]);

  // ============================================================
  //  Crash check → game over
  // ============================================================
  useEffect(() => {
    if (screen !== "playing") return;
    if (crash >= 100) {
      sfx("crash");
      setScreen("over");
      const durationSec = Math.floor(elapsed);
      const summary: RunSummary = {
        score,
        durationSec,
        wave: waveRef.current,
        bugsFixed: runStatsRef.current.bugsFixed,
        bossesDefeated: runStatsRef.current.bossesDefeated,
        maxCombo: comboRef.current.max,
        powerUpsUsed: runStatsRef.current.powerUpsUsed,
        skinUsed: skin.id,
      };
      onRunEnd?.(summary);

      if (onReplayReady) {
        const log = recorderRef.current.build({
          mode,
          seed: typeof initialSeed === "number" ? initialSeed : undefined,
          dailyKey: mode === "daily" ? dailyKey : undefined,
          skinId: skin.id,
          durationSec,
          summary: {
            score,
            wave: waveRef.current,
            bugsFixed: runStatsRef.current.bugsFixed,
            bossesDefeated: runStatsRef.current.bossesDefeated,
            maxCombo: comboRef.current.max,
          },
        });
        onReplayReady(log);
      }
    }
  }, [crash, screen, score, elapsed, skin.id, onRunEnd, onReplayReady, mode, initialSeed, dailyKey]);

  // ============================================================
  //  Power-ups
  // ============================================================
  function tryActivatePowerUp(id: string) {
    const def = POWER_UPS.find((p) => p.id === id);
    if (!def) return;
    const state = powerUpStates.find((s) => s.id === id);
    if (!state) return;
    const now = Date.now();
    if (state.cooldownUntil > now) return;

    runStatsRef.current.powerUpsUsed += 1;
    recorderRef.current.push({ type: "powerup", id }, now);

    if (id === "freeze") {
      const until = now + (def.durationSec ?? 4) * 1000;
      setActiveBuffs((b) => ({ ...b, freeze: until }));
      sfx("freeze");
    } else if (id === "autofix") {
      // Clear all CSS bugs currently in state
      setBugs((curr) => {
        const remaining: Bug[] = [];
        for (const b of curr) {
          if (CSS_BUG_VARIANTS.includes(b.type as CssBugType)) {
            removeCssBug(b.id);
          } else {
            remaining.push(b);
          }
        }
        return remaining;
      });
      // Bonus score
      setScore((s) => s + 50);
      sfx("autofix");
    } else if (id === "magnet") {
      const until = now + (def.durationSec ?? 5) * 1000;
      setActiveBuffs((b) => ({ ...b, magnet: until }));
      sfx("magnet");
    } else if (id === "shield") {
      const until = now + (def.durationSec ?? 6) * 1000;
      setActiveBuffs((b) => ({ ...b, shield: until }));
      sfx("shield");
    }

    setPowerUpStates((s) => s.map((p) => p.id === id ? { ...p, cooldownUntil: now + def.cooldownSec * 1000 } : p));
  }

  // Power-up "ready" beep when cooldown expires
  const prevReadyRef = useRef<Record<string, boolean>>({});
  useEffect(() => {
    const now = Date.now();
    powerUpStates.forEach((p) => {
      const ready = p.cooldownUntil <= now;
      if (ready && prevReadyRef.current[p.id] === false) sfx("powerup_ready");
      prevReadyRef.current[p.id] = ready;
    });
  }, [tickNow, powerUpStates]);

  // ============================================================
  //  Start/restart
  // ============================================================
  const startGame = () => {
    // Cleanup old DOM
    const page = pageRef.current;
    if (page) {
      page.querySelectorAll<HTMLElement>("[data-bug-active]").forEach((el) => {
        el.classList.remove("dd-bug-drift", "dd-bug-comic", "dd-bug-invert", "dd-bug-chromatic");
        el.style.transform = "";
        el.style.animation = "";
        el.style.removeProperty("--dx");
        el.style.removeProperty("--dy");
        el.style.removeProperty("--r");
        delete el.dataset.bugActive;
      });
    }
    setBugs([]);
    setBoss(null);
    setScore(0);
    setCrash(0);
    setElapsed(0);
    setWave(1);
    setTool("tape");
    setActiveBuffs({});
    setPowerUpStates(POWER_UPS.map((p) => ({ id: p.id, cooldownUntil: 0 })));
    waveRef.current = 1;
    comboRef.current = { count: 0, max: 0, lastFix: 0 };
    runStatsRef.current = { bugsFixed: 0, bossesDefeated: 0, powerUpsUsed: 0 };
    lastBossSpawnRef.current = Date.now();
    startTimeRef.current = Date.now();
    scoreRef.current = 0;
    crashRef.current = 0;
    recorderRef.current.reset(startTimeRef.current);
    // Seed the first tool selection so playback has a starting tool.
    recorderRef.current.push({ type: "tool", tool: "tape" }, startTimeRef.current);
    initRng();
    warmAudio();
    setScreen("playing");
  };

  // ============================================================
  //  Render
  // ============================================================
  const danger = crash > 70;

  return (
    <div className="dd-crt min-h-screen">
      <LandingPage ref={pageRef} skin={skin} />

      {screen === "playing" && <div className="dd-scanline" />}
      {(activeBuffs.freeze ?? 0) > tickNow && <div className="dd-freeze-veil" style={{ ["--dur" as any]: `${POWER_UPS.find(p=>p.id==="freeze")?.durationSec ?? 4}s` }} />}
      {(activeBuffs.shield ?? 0) > tickNow && <div className="dd-shield-veil" style={{ ["--dur" as any]: `${POWER_UPS.find(p=>p.id==="shield")?.durationSec ?? 6}s` }} />}

      {/* Bug overlays */}
      {screen === "playing" && bugs.map((bug) => {
        if (bug.type === "CONSOLE") {
          const cb = bug as ConsoleBug;
          return (
            <div key={cb.id} className="dd-console-popup"
                 style={{ left: cb.x, top: cb.y, transform: `rotate(${cb.rot}deg)` }}
                 onClick={(e) => onConsoleClick(cb, e)}>
              <div className="title">
                <span>⚠ Console Error</span>
                <span style={{ cursor: "pointer" }}>✕</span>
              </div>
              <div className="body">
                {cb.message}
                {cb.maxHp > 1 && (
                  <div className="hp-bar">
                    <div className="hp-fill" style={{ width: `${(cb.hp / cb.maxHp) * 100}%` }} />
                  </div>
                )}
              </div>
            </div>
          );
        }
        if (bug.type === "LEAK") {
          const lb = bug as LeakBug;
          return (
            <div key={lb.id} className="dd-memory-leak"
                 style={{ left: lb.x, top: lb.y }}
                 onMouseDown={(e) => onLeakInteract(lb, e)}
                 onMouseEnter={(e) => { if (tool === "vacuum") onLeakInteract(lb, e); }}>
              {lb.text}
            </div>
          );
        }
        return null;
      })}

      {/* Boss */}
      {screen === "playing" && boss && (
        <div className="dd-boss" style={{ left: boss.x, top: boss.y }}>
          <div className="dd-boss-orbit">
            {boss.weakPoints.map((wp) => {
              const angle = (wp.angle * Math.PI) / 180;
              const r = 100;
              const x = 110 + Math.cos(angle) * r - 16;
              const y = 110 + Math.sin(angle) * r - 16;
              return (
                <div key={wp.id}
                     className={`dd-boss-weak ${wp.tool} ${wp.broken ? "broken" : ""}`}
                     style={{ left: x, top: y }}
                     onClick={(e) => onWeakPointClick(wp.id, e)}>
                  {wp.tool === "tape" ? "1" : wp.tool === "debugger" ? "2" : "3"}
                </div>
              );
            })}
          </div>
          <div className="dd-boss-core">👾</div>
          <div className="dd-boss-hpbar">
            <div className="fill" style={{ width: `${(boss.weakPoints.filter(w => !w.broken).length / boss.weakPoints.length) * 100}%` }} />
          </div>
        </div>
      )}

      {/* HUD */}
      {screen === "playing" && (
        <HUD
          score={score} crash={crash} elapsed={elapsed} wave={wave}
          tool={tool} setTool={(t) => { setTool(t); sfx("tool"); recorderRef.current.push({ type: "tool", tool: t }, Date.now()); }}
          mode={mode}
          powerUpStates={powerUpStates}
          activeBuffs={activeBuffs}
          tickNow={tickNow}
          onActivate={tryActivatePowerUp}
          danger={danger}
          topRightExtra={topRightExtra}
        />
      )}

      {/* Score flashes */}
      {flashes.map((f) => (
        <div key={f.id} className="dd-floating-score" style={{ left: f.x, top: f.y, color: f.color }}>{f.amount}</div>
      ))}
      {confetti.map((c) => (
        <div key={c.id} className="dd-confetti-piece"
             style={{ left: c.x, top: c.y, background: c.color, ["--fx" as any]: `${c.fx}px`, ["--fy" as any]: `${c.fy}px` }} />
      ))}
      {comboText && <div className="dd-combo-flash">{comboText}</div>}

      {screen === "idle" && <StartOverlay onStart={startGame} mode={mode} skin={skin} />}
      {screen === "over" && (
        <GameOverOverlay
          score={score}
          elapsed={Math.floor(elapsed)}
          wave={waveRef.current}
          bugsFixed={runStatsRef.current.bugsFixed}
          bossesDefeated={runStatsRef.current.bossesDefeated}
          maxCombo={comboRef.current.max}
          onRestart={startGame}
        />
      )}
    </div>
  );
}

// ============================================================
//  HUD
// ============================================================
function HUD(props: {
  score: number; crash: number; elapsed: number; wave: number;
  tool: ToolId; setTool: (t: ToolId) => void;
  mode: "endless" | "daily";
  powerUpStates: PowerUpState[]; activeBuffs: { freeze?: number; magnet?: number; shield?: number };
  tickNow: number;
  onActivate: (id: string) => void;
  danger: boolean;
  topRightExtra?: React.ReactNode;
}) {
  const { score, crash, elapsed, wave, tool, setTool, mode, powerUpStates, activeBuffs, tickNow, onActivate, danger, topRightExtra } = props;
  return (
    <div className="fixed top-0 left-0 right-0 z-50 pointer-events-none">
      <div className="px-6 py-3 flex items-center justify-between gap-4 bg-slate-950/90 border-b border-slate-800 backdrop-blur-md pointer-events-auto">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-gradient-to-br from-violet-500 to-cyan-400 flex items-center justify-center font-black text-slate-900 text-sm">D</div>
            <span className="font-black tracking-tight">DOM DEFENDER</span>
            {mode === "daily" && <span className="ml-1 px-2 py-0.5 text-xs rounded bg-yellow-500/20 text-yellow-300 border border-yellow-500/30">DAILY</span>}
          </div>
          <div className="flex items-center gap-5">
            <Stat label="Score" value={score.toLocaleString()} />
            <Stat label="Time"  value={`${Math.floor(elapsed)}s`} />
            <Stat label="Wave"  value={String(wave)} valueClass="text-violet-300" />
          </div>
        </div>
        <div className="flex-1 max-w-xl">
          <div className="flex items-center justify-between mb-1">
            <span className={`text-[10px] uppercase tracking-widest ${danger ? "text-red-400" : "text-slate-400"}`}>Server Crash</span>
            <span className={`text-xs font-mono ${danger ? "text-red-300" : "text-slate-300"}`}>{Math.floor(crash)}%</span>
          </div>
          <div className="dd-meter-bg h-3 rounded-full">
            <div className={`dd-meter-fill h-full rounded-full ${danger ? "danger" : ""}`} style={{ width: `${crash}%` }} />
          </div>
        </div>
        <div className="flex items-center gap-2">
          {(["tape", "debugger", "vacuum"] as ToolId[]).map((id) => {
            const t = TOOLS[id];
            return (
              <button key={id} onClick={() => setTool(id)}
                      className={`dd-toolbar-btn px-3 py-2 rounded-lg border border-white/10 flex items-center gap-2 text-sm ${tool === id ? "active text-white" : "text-slate-300 bg-slate-900/60"}`}
                      title={t.hint}>
                <span className="text-lg">{t.icon}</span>
                <span className="font-semibold hidden md:inline">{t.label}</span>
                <span className="text-[10px] uppercase bg-black/30 px-1.5 py-0.5 rounded">{t.key}</span>
              </button>
            );
          })}
          {topRightExtra}
        </div>
      </div>

      {/* Power-ups bar */}
      <div className="px-6 py-2 bg-slate-950/70 border-b border-slate-900/60 pointer-events-auto flex items-center gap-3 justify-center">
        {POWER_UPS.map((p) => {
          const st = powerUpStates.find((s) => s.id === p.id);
          const remaining = Math.max(0, ((st?.cooldownUntil ?? 0) - tickNow) / 1000);
          const ready = remaining <= 0;
          let activeFor = 0;
          if (p.id === "freeze") activeFor = Math.max(0, ((activeBuffs.freeze ?? 0) - tickNow) / 1000);
          if (p.id === "magnet") activeFor = Math.max(0, ((activeBuffs.magnet ?? 0) - tickNow) / 1000);
          if (p.id === "shield") activeFor = Math.max(0, ((activeBuffs.shield ?? 0) - tickNow) / 1000);
          return (
            <button key={p.id} onClick={() => onActivate(p.id)}
                    disabled={!ready}
                    title={p.desc}
                    className={`relative flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs ${ready ? "border-cyan-400/50 bg-cyan-400/10 hover:bg-cyan-400/20 text-cyan-100" : "border-slate-700 bg-slate-900/60 text-slate-500"}`}>
              <span className="text-base">{p.icon}</span>
              <span className="font-semibold">{p.name}</span>
              <span className="text-[10px] uppercase bg-black/30 px-1.5 py-0.5 rounded">{p.key}</span>
              {!ready && <span className="ml-1 font-mono">{remaining.toFixed(1)}s</span>}
              {activeFor > 0 && (
                <span className="absolute -top-1 -right-1 bg-emerald-400 text-slate-900 text-[10px] px-1.5 rounded font-black">
                  {activeFor.toFixed(1)}s
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="px-6 py-1 text-center text-xs text-slate-500 bg-slate-950/60 border-b border-slate-900/60">
        {TOOLS[tool].hint}
      </div>
    </div>
  );
}

function Stat({ label, value, valueClass = "" }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex flex-col items-start leading-tight">
      <span className="text-[10px] uppercase tracking-widest text-slate-500">{label}</span>
      <span className={`font-mono font-bold text-sm ${valueClass}`}>{value}</span>
    </div>
  );
}

// ============================================================
//  Start / Game over overlays (in-game)
// ============================================================
function StartOverlay({ onStart, mode, skin }: { onStart: () => void; mode: "endless" | "daily"; skin: Skin }) {
  return (
    <div className="dd-overlay-modal">
      <div className="max-w-2xl w-full mx-6 bg-slate-950 border border-slate-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full" style={{ background: `${skin.accent}33`, filter: "blur(80px)" }} />
        <div className="absolute -bottom-20 -left-20 w-64 h-64 rounded-full" style={{ background: `${skin.accent2}33`, filter: "blur(80px)" }} />
        <div className="relative">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center font-black text-slate-900 text-2xl"
                 style={{ background: `linear-gradient(135deg, ${skin.accent}, ${skin.accent2})` }}>D</div>
            <div>
              <div className="text-xs text-cyan-300 uppercase tracking-widest">{mode === "daily" ? "Daily Challenge" : "Endless Mode"}</div>
              <h1 className="text-3xl font-black tracking-tight">DOM Defender</h1>
            </div>
          </div>
          <p className="text-slate-300 mt-3 mb-5 leading-relaxed text-sm">
            Patch the DOM before the server crash meter hits 100%. Use <kbd className="px-1 py-0.5 bg-slate-800 rounded">1/2/3</kbd> for tools and <kbd className="px-1 py-0.5 bg-slate-800 rounded">Q/W/E/R</kbd> for power-ups. Watch out for <span className="text-red-300 font-semibold">boss bugs</span> after wave 4.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-5">
            {POWER_UPS.map((p) => (
              <div key={p.id} className="rounded-lg p-2 bg-slate-900/60 border border-slate-800">
                <div className="flex items-center gap-1 mb-1">
                  <span>{p.icon}</span>
                  <span className="font-semibold text-xs">{p.name}</span>
                  <span className="ml-auto text-[10px] bg-black/40 px-1 rounded">{p.key}</span>
                </div>
                <p className="text-[11px] text-slate-400">{p.desc}</p>
              </div>
            ))}
          </div>
          <button onClick={onStart}
                  className="w-full text-slate-900 font-black text-lg py-3 rounded-xl hover:scale-[1.01] transition-transform shadow-xl"
                  style={{ background: `linear-gradient(135deg, ${skin.accent}, ${skin.accent2})` }}>
            DEPLOY DEFENDER →
          </button>
        </div>
      </div>
    </div>
  );
}

function GameOverOverlay({ score, elapsed, wave, bugsFixed, bossesDefeated, maxCombo, onRestart }:
  { score: number; elapsed: number; wave: number; bugsFixed: number; bossesDefeated: number; maxCombo: number; onRestart: () => void; }) {
  return (
    <div className="dd-overlay-modal">
      <div className="max-w-md w-full mx-6 bg-slate-950 border-2 border-red-500/50 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute inset-x-0 top-0 bg-red-500 text-slate-950 font-black text-xs text-center py-1 tracking-widest overflow-hidden whitespace-nowrap">
          <span className="dd-marquee">⚠ SERVER CRASH ⚠ ROLLBACK FAILED ⚠ ALL HANDS ON DECK ⚠ </span>
        </div>
        <div className="mt-8">
          <div className="text-6xl mb-2 text-center">💥</div>
          <h2 className="text-3xl font-black text-center mb-1">SYSTEM DOWN</h2>
          <p className="text-slate-400 text-center text-sm mb-6">Your run has ended.</p>

          <div className="grid grid-cols-3 gap-2 mb-3">
            <SmallStat label="Score" value={score.toLocaleString()} color="text-cyan-300" />
            <SmallStat label="Survived" value={`${elapsed}s`} color="text-violet-300" />
            <SmallStat label="Wave" value={String(wave)} color="text-yellow-300" />
          </div>
          <div className="grid grid-cols-3 gap-2 mb-6">
            <SmallStat label="Fixed" value={String(bugsFixed)} color="text-emerald-300" />
            <SmallStat label="Bosses" value={String(bossesDefeated)} color="text-orange-300" />
            <SmallStat label="Best Combo" value={`x${maxCombo}`} color="text-pink-300" />
          </div>

          <button onClick={onRestart}
                  className="w-full bg-gradient-to-r from-violet-500 to-cyan-400 text-slate-900 font-black text-lg py-3 rounded-xl hover:scale-[1.02] transition-transform">
            RESTART SERVER ↻
          </button>
        </div>
      </div>
    </div>
  );
}

function SmallStat({ label, value, color = "text-white" }: { label: string; value: string; color?: string }) {
  return (
    <div className="rounded-xl p-3 text-center bg-slate-900/60 border border-slate-800">
      <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">{label}</div>
      <div className={`font-mono font-black text-lg ${color}`}>{value}</div>
    </div>
  );
}
