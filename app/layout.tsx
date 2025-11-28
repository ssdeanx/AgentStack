import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ThemeProvider } from "next-themes";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
    title: "AgentStack | Multi-Agent Framework",
    description:
    "Production-grade multi-agent framework for AI applications with 22+ agents, 30+ tools, 10 workflows, and 4 networks.",
    applicationName: "AgentStack",
    authors: [{ name: "AgentStack Team", url: "https://agentstack.ai" }],
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
    viewport: {
        width: "device-width",
        initialScale: 1,
    },
    manifest: "/site.webmanifest",
    openGraph: {
        title: "AgentStack | Multi-Agent Framework",
        description:
            "Production-grade multi-agent framework for AI applications with 22+ agents, 30+ tools, 10 workflows, and 4 networks.",
        url: "https://agentstack.ai/",
        siteName: "AgentStack",
        images: ["/logo.svg"],
        locale: "en_US",
        type: "website",
    },
    colorScheme: "dark",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
