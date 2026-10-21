import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Dev only (ignored in production). Next blocks its dev websocket (HMR) for any
  // host that is not "localhost"; when that happens the page is server-rendered but
  // NEVER hydrates, so every client component (hero video, 3D carousel, smooth
  // scroll) silently does nothing. Opening the dev server by LAN/VM/WSL address
  // (e.g. http://10.0.208.10:3000) therefore needs those hosts allowed. Private
  // address ranges only, so the DHCP address can change without breaking this.
  allowedDevOrigins: ["127.0.0.1", "10.*.*.*", "192.168.*.*", "172.*.*.*"],
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
