import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Sprint 11: Build config pour la production et Docker */
  output: "standalone",
  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.discordapp.com",
      },
    ],
  }
};

export default nextConfig;
