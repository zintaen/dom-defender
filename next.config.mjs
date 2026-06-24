/** @type {import('next').NextConfig} */

// Response security headers (NFR-DOM-004 / BACKLOG L1-T4).
// The non-CSP headers are enforced. CSP ships as report-only first so it cannot
// break the game or the BYO iframe; review the violation reports, then switch the
// key to `Content-Security-Policy` (and move to a nonce-based script-src) to
// enforce - that nonce work also clears the CSP-nonce advisory tracked in L1-T15.
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
  { key: "Strict-Transport-Security", value: "max-age=15552000; includeSubDomains" },
  {
    key: "Content-Security-Policy-Report-Only",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "connect-src 'self' https:",
      "frame-src https:", // BYO mode embeds third-party https sites in a sandboxed iframe
      "frame-ancestors 'self'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  },
];

const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // mongoose uses node-only APIs, mark it external for the server bundle
    serverComponentsExternalPackages: ["mongoose"],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
