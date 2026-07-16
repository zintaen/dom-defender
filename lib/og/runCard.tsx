import type { ReactElement } from "react";
import type { OgParams } from "./ogParams";

// The run-card layout for the 1200x630 Open Graph image (TASK-DD-SOC-002).
// Built for satori (next/og): every multi-child box sets display:flex, all
// styling is inline, and colors are solid so the dark CTA text stays readable.
// This file imports nothing from next/og so it can be reasoned about and reused.

const ACCENT: Record<string, string> = {
  default: "#22d3ee",
  terminal: "#4ade80",
  synthwave: "#f472b6",
  cyberpunk: "#a78bfa",
};

function headline(p: OgParams): string {
  switch (p.mode) {
    case "challenge":
      return "Challenge - beat this score";
    case "tournament":
      return "Weekly tournament";
    case "daily":
      return "Daily challenge";
    default:
      return "Endless run";
  }
}

export function runCard(p: OgParams): ReactElement {
  const accent = ACCENT[p.skin] ?? ACCENT.default;
  return (
    <div
      style={{
        width: "1200px",
        height: "630px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "64px",
        backgroundColor: "#020617",
        color: "#e2e8f0",
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ display: "flex", alignItems: "center" }}>
        <div
          style={{
            width: "56px",
            height: "56px",
            borderRadius: "14px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: accent,
            color: "#0f172a",
            fontSize: "38px",
            fontWeight: 800,
            marginRight: "16px",
          }}
        >
          D
        </div>
        <div style={{ fontSize: "34px", fontWeight: 800, letterSpacing: "-1px", display: "flex" }}>
          DOM DEFENDER
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ fontSize: "30px", color: "#94a3b8", display: "flex" }}>{headline(p)}</div>
        <div style={{ fontSize: "176px", fontWeight: 800, lineHeight: "1", display: "flex" }}>
          {p.score.toLocaleString()}
        </div>
        <div style={{ fontSize: "34px", color: "#cbd5e1", display: "flex" }}>
          {p.wave > 0 ? (
            <span style={{ display: "flex", marginRight: "28px" }}>Wave {p.wave}</span>
          ) : null}
          <span style={{ display: "flex" }}>{p.name}</span>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div
          style={{
            fontSize: "40px",
            fontWeight: 800,
            backgroundColor: accent,
            color: "#0f172a",
            padding: "14px 28px",
            borderRadius: "16px",
            display: "flex",
          }}
        >
          {p.cta}
        </div>
        <div style={{ fontSize: "26px", color: "#64748b", display: "flex" }}>
          Patch the web before it crashes
        </div>
      </div>
    </div>
  );
}
