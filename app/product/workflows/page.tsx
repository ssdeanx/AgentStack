"use client";

import Link from "next/link";
import { Button } from "@/ui/button";
import { WorkflowVisualizer } from "@/app/components/features/workflow-visualizer";
import { BentoGrid } from "@/ui/effects/bento-grid";
import { CardSpotlight } from "@/ui/effects/card-spotlight";
import { GitBranchIcon, ClockIcon, GlobeIcon } from "lucide-react";
import { Spotlight } from "@/ui/effects/spotlight";

export default function WorkflowsProductPage() {
  return (
    <main className="min-h-screen bg-black text-white overflow-hidden relative selection:bg-indigo-500/30">
        <Spotlight className="-top-40 left-0 md:left-60 md:-top-20" fill="#6366f1" />

        <div className="h-16" />

        <section className="relative z-10 container mx-auto px-4 py-20 lg:py-32 flex flex-col items-center text-center gap-8">
             <h1 className="text-5xl md:text-7xl font-bold tracking-tight bg-clip-text text-transparent bg-linear-to-b from-indigo-200 to-indigo-500 animate-fade-in-up [animation-delay:200ms]">
                Automate Anything.
            </h1>

            <p className="text-lg md:text-xl text-neutral-400 max-w-2xl animate-fade-in-up [animation-delay:400ms]">
                Build complex, multi-step workflows visually. Connect agents, tools, and data sources into powerful pipelines.
            </p>

            <div className="flex gap-4 animate-fade-in-up [animation-delay:600ms]">
                <Button size="lg" className="rounded-full bg-indigo-600 text-white hover:bg-indigo-500 border-none" asChild>
                    <Link href="/workflows">Open Studio</Link>
                </Button>
            </div>
        </section>

        <section className="relative z-10 container mx-auto px-4 pb-20">
             <WorkflowVisualizer />
        </section>

         <section className="relative z-10 container mx-auto px-4 py-20">
             <BentoGrid>
                <CardSpotlight className="md:col-span-2 p-8 flex flex-row items-center gap-8 h-full bg-neutral-900/50">
                     <div className="flex-1">
                        <h3 className="text-2xl font-bold mb-4 text-white">Visual Logic Builder</h3>
                        <p className="text-neutral-400">Drag and drop nodes to create branching logic, loops, and conditional execution. No code required.</p>
                     </div>
                     <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
                         <GitBranchIcon className="size-12 text-indigo-400" />
                     </div>
                </CardSpotlight>
                 <CardSpotlight className="md:col-span-1 p-6 flex flex-col items-start gap-4 h-full">
                      <div className="p-3 rounded-lg bg-neutral-900 border border-neutral-800">
                        <ClockIcon className="text-green-400 size-6" />
                     </div>
                     <div>
                        <h3 className="text-xl font-bold mb-2 text-white">Cron Scheduling</h3>
                        <p className="text-neutral-400 text-sm">Run workflows on a schedule. Daily reports, hourly checks, or monthly audits.</p>
                     </div>
                </CardSpotlight>
             </BentoGrid>
        </section>
    </main>
  );
}
