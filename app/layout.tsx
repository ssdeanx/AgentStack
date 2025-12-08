import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ThemeProvider } from "next-themes";
import "./globals.css";
import { Navbar } from "@/app/components/navbar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
    title: "AgentStack | Multi-Agent Framework",
    description:
    "Production-grade multi-agent framework for AI applications with 22+ agents, 30+ tools, 10 workflows, and 4 networks.",
    applicationName: "AgentStack",
    authors: [{ name: "AgentStack Team", url: "https://deanmachines.com" }],
    keywords: [
        "AI",
        "Agents",
        "Multi-Agent Systems",
        "RAG",
        "Observability",
        "Governance",
        "AgentStack",
    ],
    referrer: "origin-when-cross-origin",
    openGraph: {
        title: "AgentStack | Multi-Agent Framework",
        description: "Production-grade multi-agent framework for AI applications with 22+ agents, 30+ tools, 10 workflows, and 4 networks.",
        url: "https://deanmachines.com",
        siteName: "AgentStack",
        images: [
            {
                url: "https://deanmachines.com/og-image.png",
                width: 1200,
                height: 630,
                alt: "AgentStack"
            }
        ],
        type: "website",
    },
    twitter: {
        card: "summary_large_image",
        title: "AgentStack | Multi-Agent Framework",
        description: "Production-grade multi-agent framework for AI applications.",
        images: ["https://deanmachines.com/og-image.png"],
    },
    metadataBase: new URL("https://deanmachines.com"),
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="robots" content="index,follow" />
        <link rel="canonical" href="https://deanmachines.com/" />
        <meta property="og:title" content="AgentStack | Multi-Agent Framework" />
        <meta property="og:description" content="Production-grade multi-agent framework for AI applications with 22+ agents, 30+ tools." />
        <meta property="og:image" content="https://deanmachines.com/og-image.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@ssdeanx" />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "Organization",
              "name": "AgentStack",
              "url": "https://deanmachines.com",
              "logo": "https://deanmachines.com/logo.png",
              "sameAs": ["https://github.com/ssdeanx"]
            },
            {
              "@type": "WebSite",
              "url": "https://deanmachines.com",
              "name": "AgentStack",
              "potentialAction": {
                "@type": "SearchAction",
                "target": "https://deanmachines.com/search?q={search_term_string}",
                "query-input": "required name=search_term_string"
              }
            },
            {
              "@type": "Person",
              "name": "Dean (ssdeanx)",
              "url": "https://deanmachines.com",
              "sameAs": ["https://github.com/ssdeanx"]
            }
          ]
        }) }} />
      </head>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <div className="relative flex min-h-screen flex-col">
            <Navbar />
            <div className="flex-1">{children}</div>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
