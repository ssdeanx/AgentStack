import createMDX from '@next/mdx'
import MonacoWebpackPlugin from 'monaco-editor-webpack-plugin'
import type { NextConfig } from 'next'
import type { Configuration } from 'webpack'

const nextConfig: NextConfig = {
    pageExtensions: ['js', 'jsx', 'md', 'mdx', 'ts', 'tsx'],
    serverExternalPackages: [
        '@mcpc-tech/*',
        '@mastra/*',
        '@openrouter/*',
        '@supermemory/*',
        'ai-sdk-provider-gemini-cli',
        'cheerio',
        'convert-csv-to-json',
        'crawlee',
        'csv-parse',
        'jose',
        'marked',
        'pdf-parse',
        'playwright-core',
        're2',
        'svgjson',
        'unpdf',
        'uuid',
        'zod',
        '@e2b/code-interpreter',
        'ai',
        'html-to-image',
        'cytoscape',
        'axios-retry',
        'bottleneck',
        'leaflet',
        'chart.js',
        'technicalindicators',
        'simple-statistics',
    ],
    allowedDevOrigins: ['http://localhost:4111', '**'],
    typedRoutes: false,
    reactStrictMode: true,
    distDir: '.next',
    webpack: (config: Configuration, { isServer }) => {
        if (!isServer) {
            config.plugins = config.plugins ?? []
            config.plugins.push(
                new MonacoWebpackPlugin({
                    languages: [
                        'typescript',
                        'javascript',
                        'json',
                        'css',
                        'markdown',
                    ],
                })
            )

            // Sanitize resolve.alias so values are serializable for Turbopack/worker cloning
            // Ensure resolve exists and normalize alias values to strings/arrays of strings
            const existingResolve = config.resolve ?? {}
            const aliasObj = (existingResolve as unknown as Record<string, unknown>).alias ?? {}
            if (typeof aliasObj === 'object' && aliasObj !== null) {
                const normalized: Record<string, string | string[]> = {}
                for (const [k, v] of Object.entries(aliasObj as Record<string, unknown>)) {
                    if (Array.isArray(v)) {
                        normalized[k] = v.map((x) => String(x))
                    } else if (typeof v === 'object' && v !== null) {
                        // For objects, stringify to avoid '[object Object]' implicit string coercion
                        try {
                            normalized[k] = JSON.stringify(v)
                        } catch {
                            normalized[k] = ''
                        }
                    } else if (typeof v === 'function') {
                        // For functions, prefer the function name to avoid serializing the entire function
                        // Narrow to an object with an optional name property to avoid using the broad Function type
                        const fnName = (v as { name?: string })?.name ?? ''
                        normalized[k] = fnName
                    } else if (v === null || v === undefined) {
                        // Keep null/undefined normalized to an empty string
                        normalized[k] = ''
                    } else {
                        // At this point, expect primitives (string/number/boolean/symbol/bigint).
                        // Guard against objects to avoid default Object stringification '[object Object]'.
                        const t = typeof v
                        if (t === 'string' || t === 'number' || t === 'boolean' || t === 'symbol' || t === 'bigint') {
                            // Narrow the type for the linter to avoid base-to-string coercion warnings
                            normalized[k] = String(v as string | number | boolean | symbol | bigint)
                        } else {
                            // Fallback for unexpected non-serializable values
                            try {
                                normalized[k] = JSON.stringify(v)
                            } catch {
                                normalized[k] = ''
                            }
                        }
                    }
                }
                config.resolve = { ...existingResolve, alias: normalized } as Configuration['resolve']
            }
        }

        return config
    },

    typescript: {
        ignoreBuildErrors: true,
        tsconfigPath: './tsconfig.json',
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
        disableOptimizedLoading: false,
        hideLogsAfterAbort: true,
        //    optimizeCss: true,
        esmExternals: true,
        scrollRestoration: true,
        //        cpus: 16,
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
}
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
        remarkPlugins: ['remark-gfm'],
        rehypePlugins: ['rehype-highlight'],
    },
})

export default withMDX(nextConfig)
