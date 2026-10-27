import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@react-pdf/renderer", "@libsql/client", "cheerio", "undici"],
  poweredByHeader: false,
  // PDF fonts and migrations are read from disk at runtime.
  outputFileTracingIncludes: {
    "/api/quotes/[id]/pdf": ["./assets/fonts/**"],
    "/q/[token]/pdf": ["./assets/fonts/**"],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
        ],
      },
    ];
  },
};

export default nextConfig;
