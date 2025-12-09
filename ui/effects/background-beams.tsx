"use client";
import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export const BackgroundBeams = ({ className }: { className?: string }) => {
  return (
    <div
      className={cn(
        "absolute top-0 left-0 w-full h-full bg-neutral-950 overflow-hidden flex flex-col items-center justify-center opacity-40",
        className
      )}
    >
      <div className="absolute inset-0 bg-linear-to-b from-transparent via-neutral-950 to-neutral-950 z-0 pointer-events-none" />
      <div className="absolute inset-0 z-0 opacity-30">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[50rem] h-[50rem] bg-indigo-500/20 rounded-full blur-[10rem] animate-pulse-glow" />
        <div className="absolute top-1/4 left-1/4 w-[30rem] h-[30rem] bg-pink-500/20 rounded-full blur-[8rem] animate-pulse-glow [animation-delay:2s]" />
      </div>
      {/* Grid Pattern */}
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150" />
      <div
         className="absolute inset-0"
         style={{
            backgroundImage: `linear-gradient(to right, #8882 1px, transparent 1px), linear-gradient(to bottom, #8882 1px, transparent 1px)`,
            backgroundSize: `4rem 4rem`,
            maskImage: `radial-gradient(ellipse 60% 50% at 50% 0%, #000 70%, transparent 100%)`,
         }}
      />
    </div>
  );
};
