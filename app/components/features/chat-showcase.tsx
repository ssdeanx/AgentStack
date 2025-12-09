"use client";

import { BorderBeam } from "@/ui/effects/border-beam";
import { TextGenerateEffect } from "@/ui/effects/text-generate";
import { BotIcon, UserIcon } from "lucide-react";

export function ChatShowcase() {
  return (
    <div className="relative rounded-xl border bg-black/50 p-4 shadow-2xl backdrop-blur-md w-full max-w-2xl mx-auto overflow-hidden">
      <BorderBeam size={250} duration={12} delay={9} />

      <div className="flex flex-col gap-6">
        {/* User Message */}
        <div className="flex gap-4 items-start">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-neutral-800">
            <UserIcon className="size-4 text-neutral-400" />
          </div>
          <div className="flex flex-col gap-1">
            <span className="font-semibold text-sm text-neutral-400">You</span>
            <div className="rounded-lg bg-neutral-800/50 px-3 py-2 text-sm text-neutral-200">
              Analyze the market data for Apple and generate a summary report.
            </div>
          </div>
        </div>

        {/* AI Message */}
        <div className="flex gap-4 items-start">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
            <BotIcon className="size-4 text-primary" />
          </div>
          <div className="flex flex-col gap-1 w-full">
            <span className="font-semibold text-sm text-primary">AgentStack</span>
            <div className="space-y-2">
                 <div className="flex items-center gap-2 text-xs text-neutral-500 animate-pulse">
                    <span className="size-2 rounded-full bg-green-500" />
                    Searching financial databases...
                 </div>
                 <TextGenerateEffect
                    words="Based on the latest market data, Apple (AAPL) is showing strong resilience. Key indicators suggest a bullish trend driven by recent product announcements and services growth. I've compiled the technical analysis and sentiment metrics below."
                    className="text-sm font-normal text-neutral-300"
                    duration={2}
                 />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
