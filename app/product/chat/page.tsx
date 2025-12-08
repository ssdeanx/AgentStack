"use client";

import Link from "next/link";
import { Button } from "@/ui/button";
import { BackgroundBeams } from "@/ui/effects/background-beams";
import { ChatShowcase } from "@/app/components/features/chat-showcase";
import { BentoGrid, BentoGridItem } from "@/ui/effects/bento-grid";
import { CardSpotlight } from "@/ui/effects/card-spotlight";
import { BotIcon, ZapIcon, BrainIcon, CodeIcon } from "lucide-react";

export default function ChatProductPage() {
  return (
    <main className="min-h-screen bg-black text-white overflow-hidden relative selection:bg-primary/30">
        <BackgroundBeams className="z-0" />

        {/* Navigation spacer */}
        <div className="h-16" />

        {/* Hero Section */}
        <section className="relative z-10 container mx-auto px-4 py-20 lg:py-32 flex flex-col items-center text-center gap-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm font-medium text-white backdrop-blur-3xl animate-fade-in-up">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                </span>
                New: Research Agent v2
            </div>

            <h1 className="text-5xl md:text-7xl font-bold tracking-tight bg-clip-text text-transparent bg-linear-to-b from-white to-white/60 animate-fade-in-up [animation-delay:200ms]">
                Chat with Superpowers
            </h1>

            <p className="text-lg md:text-xl text-neutral-400 max-w-2xl animate-fade-in-up [animation-delay:400ms]">
                Experience the next generation of AI agents. With built-in memory, web-browsing capabilities, and code execution environments.
            </p>

            <div className="flex gap-4 animate-fade-in-up [animation-delay:600ms]">
                <Button size="lg" className="rounded-full bg-white text-black hover:bg-neutral-200" asChild>
                    <Link href="/chat">Launch Chat</Link>
                </Button>
                 <Button size="lg" variant="outline" className="rounded-full border-white/20 text-white hover:bg-white/10 backdrop-blur-sm" asChild>
                    <Link href="/manual">Read Docs</Link>
                </Button>
            </div>
        </section>

        {/* Demo Section */}
        <section className="relative z-10 container mx-auto px-4 pb-20">
             <ChatShowcase />
        </section>

        {/* Features Grid */}
        <section className="relative z-10 container mx-auto px-4 py-20">
             <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">Built for Power Users</h2>
             <BentoGrid>
                <CardSpotlight className="md:col-span-1 p-6 flex flex-col items-start gap-4 h-full">
                     <div className="p-3 rounded-lg bg-neutral-900 border border-neutral-800">
                        <BrainIcon className="text-purple-400 size-6" />
                     </div>
                     <div>
                        <h3 className="text-xl font-bold mb-2 text-white">Long-term Memory</h3>
                        <p className="text-neutral-400 text-sm">Agents remember context across sessions. Stop repeating yourself.</p>
                     </div>
                </CardSpotlight>
                <CardSpotlight className="md:col-span-1 p-6 flex flex-col items-start gap-4 h-full">
                      <div className="p-3 rounded-lg bg-neutral-900 border border-neutral-800">
                        <ZapIcon className="text-yellow-400 size-6" />
                     </div>
                     <div>
                        <h3 className="text-xl font-bold mb-2 text-white">Instant Tools</h3>
                        <p className="text-neutral-400 text-sm">Access to 30+ pre-built tools including Search, Stock data, and PDF analysis.</p>
                     </div>
                </CardSpotlight>
                <CardSpotlight className="md:col-span-1 p-6 flex flex-col items-start gap-4 h-full">
                      <div className="p-3 rounded-lg bg-neutral-900 border border-neutral-800">
                        <CodeIcon className="text-blue-400 size-6" />
                     </div>
                     <div>
                        <h3 className="text-xl font-bold mb-2 text-white">Code Execution</h3>
                        <p className="text-neutral-400 text-sm">Sandboxed Python and NodeJS environments for complex calculations.</p>
                     </div>
                </CardSpotlight>
             </BentoGrid>
        </section>
    </main>
  );
}
