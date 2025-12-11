import type { NextConfig } from "next";
import createMDX from "@next/mdx";

const nextConfig: NextConfig = {
  pageExtensions: ["js", "jsx", "md", "mdx", "ts", "tsx"],
  serverExternalPackages: ["@mastra/*", "cheerio", "pdf-parse", "svgjson", "convert-csv-to-json", "csv-parse", "jose", "marked", "ai-sdk-provider-gemini-cli", "@mcpc-tech/*", "@openrouter/*", "@supermemory/*", "playwright-core", "crawlee"],
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
    styledJsx: true,
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
 //   webpackMemoryOptimizations: true,
 //7   webpackBuildWorker: true,
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
//const withBundleAnalyzer = require('@next/bundle-analyzer')({
//  enabled: process.env.ANALYZE === 'true',
//})
//module.exports = withBundleAnalyzer({})

const withMDX = createMDX({
  extension: /\.mdx?$/,
  // Turbopack requires loader options be serializable. Passing
  // plugin functions (remarkGfm, rehypeHighlight) causes an error
  // because functions are not serializable across worker boundaries.
  // Use specifier strings so the loader can resolve them at runtime.
  options: {
    // Enable frontmatter parsing so MDX frontmatter is not rendered as page content
    // and is instead exposed to the MDX module as exports.
    // Keep MDX remark plugins minimal and stable in development to avoid
    // loader/preset interop issues with Turbopack. `remark-gfm` is sufficient
    // for most docs formatting. Frontmatter parsing can be handled separately
    // if needed (e.g. server-side gray-matter extraction), which avoids
    // depending on unified plugin resolution in the dev bundler.
    remarkPlugins: ["remark-gfm"],
    rehypePlugins: ["rehype-highlight"],
  },
});

export default withMDX(nextConfig);
