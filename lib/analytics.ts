// Minimal analytics shim. Gated behind an optional webhook — never blocks the UI.
//
// Usage:   track("run_end", { score, wave });
//
// Behavior:
// - Always buffers the last ~200 events in localStorage for debugging.
// - If NEXT_PUBLIC_ANALYTICS_WEBHOOK_URL is set, attempts to ship events via
//   navigator.sendBeacon (falls back to fetch keepalive).
// - If the env var is unset (e.g. local dev), track() is a no-op for network —
//   the localStorage buffer still records events so you can inspect them.
//
// We deliberately do NOT pull in a third-party analytics SDK. If you later
// want PostHog / Amplitude / Mixpanel, swap the `ship()` implementation.

export type TrackProps = Record<string, string | number | boolean | null | undefined>;

const STORAGE_KEY = "dd.analytics.buffer.v1";
const SESSION_KEY = "dd.analytics.session.v1";
const BUFFER_CAP = 200;

function now(): number {
  return typeof performance !== "undefined" && performance.now ? Date.now() : Date.now();
}

function getSessionId(): string {
  if (typeof window === "undefined") return "ssr";
  try {
    let sid = sessionStorage.getItem(SESSION_KEY);
    if (!sid) {
      sid = Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
      sessionStorage.setItem(SESSION_KEY, sid);
    }
    return sid;
  } catch {
    return "nosession";
  }
}

function bufferPush(entry: Record<string, any>) {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const arr = raw ? (JSON.parse(raw) as any[]) : [];
    arr.push(entry);
    while (arr.length > BUFFER_CAP) arr.shift();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
  } catch {
    // Storage may be disabled/full; silently drop.
  }
}

function ship(entry: Record<string, any>) {
  const webhook = process.env.NEXT_PUBLIC_ANALYTICS_WEBHOOK_URL;
  if (!webhook || typeof window === "undefined") return;
  const payload = JSON.stringify(entry);
  try {
    if ("sendBeacon" in navigator) {
      const blob = new Blob([payload], { type: "application/json" });
      navigator.sendBeacon(webhook, blob);
      return;
    }
  } catch {
    // fall through to fetch
  }
  try {
    fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
      keepalive: true,
    }).catch(() => undefined);
  } catch {
    // Non-fatal.
  }
}

export function track(event: string, props: TrackProps = {}) {
  const entry = {
    event,
    props,
    ts: now(),
    sessionId: getSessionId(),
    path: typeof window !== "undefined" ? window.location.pathname : undefined,
  };
  bufferPush(entry);
  ship(entry);
}

// Exposed for an eventual /debug page.
export function recentEvents(): any[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as any[]) : [];
  } catch {
    return [];
  }
}

export function clearEvents() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
