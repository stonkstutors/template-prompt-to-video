import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["@elevenlabs/elevenlabs-js"],
  },
  webpack: (config) => {
    config.externals = config.externals || [];
    config.externals.push("zod-to-json-schema");
    return config;
  },
};

export default nextConfig;
