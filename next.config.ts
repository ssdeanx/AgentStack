import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@mastra/*", "@ai-sdk/*", "@mcpc-tech/*", "@openrouter/*", "@supermemory/*", "playwright-core", "crawlee"],
};

export default nextConfig;