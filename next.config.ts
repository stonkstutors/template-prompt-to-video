import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["@elevenlabs/elevenlabs-js"],
  },
};

export default nextConfig;
