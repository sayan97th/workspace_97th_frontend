import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Self contained server in .next/standalone, packaged by scripts/deploy.
  // The server has too little memory to build, so releases are built locally.
  output: "standalone",
  // Trace from this folder even if a lockfile exists in a parent folder,
  // so server.js always lands at .next/standalone/server.js.
  outputFileTracingRoot: process.cwd(),
  experimental: {
    agentUpgrade: "security",
  },
  webpack(config) {
    config.module.rules.push({
      test: /\.svg$/,
      use: ["@svgr/webpack"],
    });
    return config;
  },

  turbopack: {
    rules: {
      '*.svg': {
        loaders: ['@svgr/webpack'],
        as: '*.js',
      },
    },
  },

};

export default nextConfig;
