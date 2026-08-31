import type { NextConfig } from "next";

/**
 * When API_PROXY_TARGET is set (Vercel), browser calls stay on the Vercel origin
 * and Next.js rewrites proxy them to the Paisol API — no separate API domain needed.
 *
 * Local dev: leave API_PROXY_TARGET unset; use NEXT_PUBLIC_API_URL=http://localhost:8000.
 */
const API_PROXY_TARGET = (process.env.API_PROXY_TARGET ?? "").replace(/\/$/, "");

const nextConfig: NextConfig = {
  async rewrites() {
    if (!API_PROXY_TARGET) return [];

    return [
      { source: "/auth/:path*", destination: `${API_PROXY_TARGET}/auth/:path*` },
      { source: "/health", destination: `${API_PROXY_TARGET}/health` },
      { source: "/jobs", destination: `${API_PROXY_TARGET}/jobs` },
      { source: "/jobs/:path*", destination: `${API_PROXY_TARGET}/jobs/:path*` },
      { source: "/documents", destination: `${API_PROXY_TARGET}/documents` },
      { source: "/documents/:path*", destination: `${API_PROXY_TARGET}/documents/:path*` },
      { source: "/transactions", destination: `${API_PROXY_TARGET}/transactions` },
      { source: "/transactions/:path*", destination: `${API_PROXY_TARGET}/transactions/:path*` },
      { source: "/network/:path*", destination: `${API_PROXY_TARGET}/network/:path*` },
      { source: "/learning/:path*", destination: `${API_PROXY_TARGET}/learning/:path*` },
      { source: "/risk-settings", destination: `${API_PROXY_TARGET}/risk-settings` },
      { source: "/risk-settings/:path*", destination: `${API_PROXY_TARGET}/risk-settings/:path*` },
      { source: "/findings/:path*", destination: `${API_PROXY_TARGET}/findings/:path*` },
    ];
  },
};

export default nextConfig;
