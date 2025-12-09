"use client";

import Link from "next/link";
import { Button } from "@/ui/button";
import { NetworkGraph } from "@/app/components/features/network-graph";
import { Spotlight } from "@/ui/effects/spotlight";
import { NetworkIcon, Share2Icon, LayersIcon } from "lucide-react";

export default function NetworksProductPage() {
  return (
    <main className="min-h-screen bg-black text-white overflow-hidden relative selection:bg-pink-500/30">
        <Spotlight className="-top-40 left-10 md:left-80 md:-top-20" fill="#ec4899" />

        <div className="h-16" />

        <section className="relative z-10 container mx-auto px-4 py-20 lg:py-32 flex flex-col items-center text-center gap-8">
             <h1 className="text-5xl md:text-7xl font-bold tracking-tight bg-clip-text text-transparent bg-linear-to-b from-pink-200 to-pink-500 animate-fade-in-up [animation-delay:200ms]">
                Swarm Intelligence.
            </h1>

            <p className="text-lg md:text-xl text-neutral-400 max-w-2xl animate-fade-in-up [animation-delay:400ms]">
                Orchestrate multiple agents working in concert. Delegate tasks, share context, and solve complex problems faster.
            </p>

            <div className="flex gap-4 animate-fade-in-up [animation-delay:600ms]">
                <Button size="lg" className="rounded-full bg-pink-600 text-white hover:bg-pink-500 border-none" asChild>
                    <Link href="/networks">View Networks</Link>
                </Button>
            </div>
        </section>

        <section className="relative z-10 container mx-auto px-4 pb-20 max-w-4xl">
             <NetworkGraph />
        </section>

        <section className="relative z-10 container mx-auto px-4 py-20 grid md:grid-cols-3 gap-8">
            <div className="flex flex-col gap-4 p-6 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm">
                <NetworkIcon className="size-8 text-pink-500" />
                <h3 className="text-xl font-bold">Hierarchical Swarms</h3>
                <p className="text-neutral-400">Design manager-worker topologies where a lead agent delegates subtasks to specialized workers.</p>
            </div>
            <div className="flex flex-col gap-4 p-6 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm">
                <Share2Icon className="size-8 text-pink-500" />
                <h3 className="text-xl font-bold">Shared Memory</h3>
                <p className="text-neutral-400">Agents share a common vector database, allowing instant knowledge transfer across the swarm.</p>
            </div>
            <div className="flex flex-col gap-4 p-6 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm">
                <LayersIcon className="size-8 text-pink-500" />
                <h3 className="text-xl font-bold">Parallel Execution</h3>
                <p className="text-neutral-400">Scale your throughput by running multiple agent instances simultaneously on the same problem.</p>
            </div>
        </section>
    </main>
  );
}
