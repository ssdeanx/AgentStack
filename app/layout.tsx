
import { Inter } from 'next/font/google'
import { Suspense } from 'react'
import type { ReactNode } from 'react'
import { ThemeProvider } from 'next-themes'
import './globals.css'
import { Navbar } from '@/app/components/navbar'
import { PublicPageReveal } from '@/app/components/public-page-reveal'
import { TooltipProvider } from '@/ui/tooltip'
import { QueryProvider } from '@/app/components/query-provider'

const inter = Inter({ subsets: ['latin'] })

export default function RootLayout({
    children,
}: {
    children: ReactNode
}) {
    return (
        <html lang="en" suppressHydrationWarning>
            <head>
                <meta name="robots" content="index,follow" />
                <link rel="canonical" href="https://deanmachines.com/" />
                <meta
                    property="og:title"
                    content="AgentStack | Multi-Agent Framework"
                />
                <meta
                    property="og:description"
                    content="Production-grade multi-agent framework for AI applications with 22+ agents, 30+ tools."
                />
                <meta
                    property="og:image"
                    content="https://deanmachines.com/og-image.png"
                />
                <meta name="twitter:card" content="summary_large_image" />
                <meta name="twitter:site" content="@ssdeanx" />
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{
                        __html: JSON.stringify({
                            '@context': 'https://schema.org',
                            '@graph': [
                                {
                                    '@type': 'Organization',
                                    name: 'AgentStack',
                                    url: 'https://deanmachines.com',
                                    logo: 'https://deanmachines.com/logo.png',
                                    sameAs: ['https://github.com/ssdeanx'],
                                },
                                {
                                    '@type': 'WebSite',
                                    url: 'https://deanmachines.com',
                                    name: 'AgentStack',
                                    potentialAction: {
                                        '@type': 'SearchAction',
                                        target: 'https://deanmachines.com/search?q={search_term_string}',
                                        'query-input':
                                            'required name=search_term_string',
                                    },
                                },
                                {
                                    '@type': 'Person',
                                    name: 'Dean (ssdeanx)',
                                    url: 'https://deanmachines.com',
                                    sameAs: ['https://github.com/ssdeanx'],
                                },
                            ],
                        }),
                    }}
                />
            </head>

            <body className={inter.className}>
                <ThemeProvider
                    attribute="class"
                    defaultTheme="system"
                    enableSystem
                    disableTransitionOnChange
                >
                    <QueryProvider>
                        <TooltipProvider>
                            <div className="relative flex min-h-screen flex-col">
                                <div className="hide-on-focus">
                                    <Suspense
                                        fallback={
                                            <div
                                                aria-hidden="true"
                                                className="fixed top-0 z-50 h-16 w-full border-b border-transparent bg-transparent"
                                            />
                                        }
                                    >
                                        <Navbar />
                                    </Suspense>
                                </div>
                                <div className="flex-1 view-transition-fade">
                                    <Suspense fallback={children}>
                                        <PublicPageReveal>{children}</PublicPageReveal>
                                    </Suspense>
                                </div>
                            </div>
                        </TooltipProvider>
                    </QueryProvider>
                </ThemeProvider>
            </body>
        </html>
    )
}
