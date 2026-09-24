import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Baseline security headers. None of these were previously set, which
  // left the app relying entirely on browser defaults. These are safe
  // defaults for a server-rendered app with no iframe-embedding use case.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
