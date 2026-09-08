import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Os noivos colam URLs de imagem de qualquer loja no painel de presentes,
    // então liberamos https genérico em vez de manter uma allowlist de domínios.
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
};

export default nextConfig;
