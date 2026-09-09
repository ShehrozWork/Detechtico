import type { NextConfig } from "next";

/**
 * When API_PROXY_TARGET is set (Vercel), browser calls stay on the Vercel origin
 * and Next.js rewrites proxy them to the Paisol API — no separate API domain needed.
 *
 * Local dev: leave API_PROXY_TARGET unset; use NEXT_PUBLIC_API_URL=http://localhost:8000.
 *
 * Admin is special: the UI lives at /admin/* pages AND the API uses /admin/*.
 * Default (afterFiles) rewrites lose to those pages, so JSON fetches would get HTML
 * and crash on `.items`. Proxy admin API in beforeFiles only when Accept includes
 * application/json (apiFetch always sets that; browser navigation does not).
 */
const API_PROXY_TARGET = (process.env.API_PROXY_TARGET ?? "").replace(/\/$/, "");

const jsonAccept = {
  type: "header" as const,
  key: "accept",
  value: "(?<accept>.*application/json.*)",
};

const nextConfig: NextConfig = {
  async rewrites() {
    if (!API_PROXY_TARGET) return [];

    return {
      beforeFiles: [
        {
          source: "/admin",
          has: [jsonAccept],
          destination: `${API_PROXY_TARGET}/admin`,
        },
        {
          source: "/admin/:path*",
          has: [jsonAccept],
          destination: `${API_PROXY_TARGET}/admin/:path*`,
        },
      ],
      afterFiles: [
        { source: "/auth/:path*", destination: `${API_PROXY_TARGET}/auth/:path*` },
        { source: "/health", destination: `${API_PROXY_TARGET}/health` },
        { source: "/jobs", destination: `${API_PROXY_TARGET}/jobs` },
        { source: "/jobs/:path*", destination: `${API_PROXY_TARGET}/jobs/:path*` },
        { source: "/documents", destination: `${API_PROXY_TARGET}/documents` },
        { source: "/documents/:path*", destination: `${API_PROXY_TARGET}/documents/:path*` },
        // Explicit trailing-slash variants — Vercel can normalize these and
        // FastAPI slash-redirects to http://IP break HTTPS pages.
        { source: "/transactions", destination: `${API_PROXY_TARGET}/transactions` },
        { source: "/transactions/", destination: `${API_PROXY_TARGET}/transactions` },
        { source: "/transactions/:path*", destination: `${API_PROXY_TARGET}/transactions/:path*` },
        { source: "/network/:path*", destination: `${API_PROXY_TARGET}/network/:path*` },
        { source: "/learning/:path*", destination: `${API_PROXY_TARGET}/learning/:path*` },
        { source: "/risk-settings", destination: `${API_PROXY_TARGET}/risk-settings` },
        { source: "/risk-settings/", destination: `${API_PROXY_TARGET}/risk-settings` },
        { source: "/risk-settings/:path*", destination: `${API_PROXY_TARGET}/risk-settings/:path*` },
        { source: "/findings/:path*", destination: `${API_PROXY_TARGET}/findings/:path*` },
        { source: "/billing/:path*", destination: `${API_PROXY_TARGET}/billing/:path*` },
      ],
    };
  },
};

export default nextConfig;
