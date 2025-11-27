import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@mastra/*", "@ai-sdk/*", "@mcpc-tech/*", "@openrouter/*", "@supermemory/*", "playwright-core", "crawlee"],
  allowedDevOrigins: ['http://localhost:3000', 'http://localhost:4111', '**'],
  typedRoutes: true,
  reactStrictMode: true,
  output: undefined,
  distDir: ".next",
  typescript: {
    ignoreBuildErrors: true,
    tsconfigPath: "tsconfig.json",
  },
  cacheComponents: true,
  cacheMaxMemorySize: 128 * 1024 * 1024, // 128 MB
  compiler: {
    emotion: true,
  },
  i18n: {
    locales: ["en-US"],
    defaultLocale: "en-US",
  },
  // TODO: enable this when we have a proper domain
  compress: true,
  poweredByHeader: false,
  basePath: "",
  trailingSlash: false,

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },

  exportPathMap: async function () {
    return {
      "/": { page: "/" },
    };
  },
  experimental: {
//    adapterPath: "./src/adapter/edge.ts",
    useSkewCookie: true,
    multiZoneDraftMode: true,
    appNavFailHandling: true,
    prerenderEarlyExit: true,
    linkNoTouchStart: true,
    caseSensitiveRoutes: true,
    clientParamParsingOrigins: [],
    dynamicOnHover: true,
    preloadEntriesOnStart: true,
    fetchCacheKeyPrefix: "",
    isrFlushToDisk: true,
    urlImports: [],
    workerThreads: true,
    disableOptimizedLoading: true,
    hideLogsAfterAbort: true,
    optimizeCss: true,
//    swcPlugins: [["./src/swc-plugin.js", {}]],
//    forceSwcTransforms: true,
    typedRoutes: true,
    ppr: false,
    serverComponentsExternalPackages: [
      "@mastra/*",
      "@ai-sdk/*",
      "@mcpc-tech/*",
      "@openrouter/*",
      "@supermemory/*",
      "playwright",
      "playwright-core",
      "crawlee"
    ]
  },
};

export default nextConfig;