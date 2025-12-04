import type { NextConfig } from "next";
import createMDX from "@next/mdx";

const nextConfig: NextConfig = {
  pageExtensions: ["js", "jsx", "md", "mdx", "ts", "tsx"],
  serverExternalPackages: ["@mastra/*", "cheerio", "jsdom", "ai-sdk-provider-gemini-cli", "@mcpc-tech/*", "@openrouter/*", "@supermemory/*", "playwright-core", "crawlee"],
  allowedDevOrigins: ['http://localhost:4111', '**'],
  typedRoutes: false,
  reactStrictMode: true,
  distDir: ".next",
  typescript: {
    ignoreBuildErrors: true,
    tsconfigPath: "./tsconfig.json",
  },
  cacheComponents: true,
  cacheMaxMemorySize: 128 * 1024 * 1024, // 128 MB
  compiler: {
    emotion: true,
    styledComponents: true,
    styledJsx: {
//      useLightningcss: true,
    }
  },
  // TODO: enable this when we have a proper domain
  compress: true,
  poweredByHeader: false,
  trailingSlash: false,
//  exportPathMap: async function () {
//    return {
//      "/": { page: "/" },
//    };
//  },
  experimental: {
    useSkewCookie: true,
    multiZoneDraftMode: true,
    appNavFailHandling: true,
    prerenderEarlyExit: true,
    linkNoTouchStart: true,
    caseSensitiveRoutes: true,
    dynamicOnHover: true,
    preloadEntriesOnStart: true,
    isrFlushToDisk: true,
    workerThreads: true,
    disableOptimizedLoading: true,
    hideLogsAfterAbort: true,
//    optimizeCss: true,
    esmExternals: true,
    scrollRestoration: true,
    cpus: 16,
//    cssChunking: true,
 //   craCompat: true,
//    validateRSCRequestHeaders: true,
    webpackMemoryOptimizations: true,
    webpackBuildWorker: true,
 //   turbopackTreeShaking: true,
//    turbopackMinify: true,
//    turbopackImportTypeBytes: true,
//    turbopackMemoryLimit: 8192,
//    turbopackRemoveUnusedExports: true,
    turbopackFileSystemCacheForDev: true,
  //  turbopackFileSystemCacheForBuild: true,
    useCache: true,
//    useLightningcss: true,
    useWasmBinary: true,
//    swcTraceProfiling: true,
//    forceSwcTransforms: true,
    ppr: false,
  },
};

const withMDX = createMDX({
  extension: /\.mdx?$/,
});

export default withMDX(nextConfig);