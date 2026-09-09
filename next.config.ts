import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone", // imagem Docker enxuta no Coolify
  poweredByHeader: false,
  redirects() {
    return [{
      // Consolidate public pages only. Webhooks/jobs retain their existing URLs.
      source: "/:path((?!api(?:/|$)|_next(?:/|$)).*)",
      has: [{ type: "host", value: "www.pedreirosbr.com.br" }],
      destination: "https://pedreirosbr.com.br/:path",
      permanent: true,
    }];
  },
  headers() {
    return [{ source: "/:path*", headers: [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
      { key: "Strict-Transport-Security", value: "max-age=31536000" },
      { key: "Content-Security-Policy", value: "frame-ancestors 'none'; base-uri 'self'; object-src 'none'" },
    ] }];
  },
};

export default nextConfig;
