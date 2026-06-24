// Error monitoring behind an env flag (BACKLOG L1-T13).
//
// If ERROR_WEBHOOK_URL is set, reportError POSTs a redacted error payload there;
// otherwise it is a no-op that still writes a server log line. A hosted tool
// (Sentry, etc.) can replace the webhook behind this same interface later.
// reportError never throws into the request path.

export interface ErrorContext {
  route?: string;
  [k: string]: unknown;
}

export async function reportError(err: unknown, context: ErrorContext = {}): Promise<void> {
  const message = err instanceof Error ? err.message : String(err);
  const stack = err instanceof Error ? err.stack : undefined;

  // Always keep a console line so local dev and platform logs still show it.
  console.error(`[error]${context.route ? ` ${context.route}` : ""}`, message);

  const url = process.env.ERROR_WEBHOOK_URL;
  if (!url) return; // no-op until configured

  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        app: "dom-defender",
        at: new Date().toISOString(),
        message,
        stack,
        context,
      }),
    });
  } catch {
    // Reporting must never break the request it is reporting on.
  }
}
