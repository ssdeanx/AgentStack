"use client";

import React, { useRef } from "react";

import { AnimatedBeam } from "@/ui/effects/animated-beam";
import { cn } from "@/lib/utils";
import { FileTextIcon, GitBranchIcon, GlobeIcon, DatabaseIcon, BotIcon } from "lucide-react";

const Circle = React.forwardRef<
  HTMLDivElement,
  { className?: string; children?: React.ReactNode }
>(({ className, children }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        "z-10 flex size-12 items-center justify-center rounded-full border-2 bg-white p-3 shadow-[0_0_20px_-12px_rgba(0,0,0,0.8)] dark:bg-black",
        className,
      )}
    >
      {children}
    </div>
  );
});

Circle.displayName = "Circle";

export function WorkflowVisualizer({ className }: { className?: string }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const div1Ref = useRef<HTMLDivElement | null>(null);
  const div2Ref = useRef<HTMLDivElement | null>(null);
  const div3Ref = useRef<HTMLDivElement | null>(null);
  const div4Ref = useRef<HTMLDivElement | null>(null);
  const div5Ref = useRef<HTMLDivElement | null>(null);
  const div6Ref = useRef<HTMLDivElement | null>(null);
  const div7Ref = useRef<HTMLDivElement | null>(null);

  return (
    <div
      className={cn(
        "relative flex h-[350px] w-full items-center justify-center overflow-hidden rounded-lg bg-background p-10",
        className,
      )}
      ref={containerRef}
    >
      <div className="flex size-full flex-row items-stretch justify-between gap-10">
        <div className="flex flex-col justify-center gap-2">
          <Circle ref={div1Ref}>
            <GlobeIcon className="text-black dark:text-white" />
          </Circle>
          <Circle ref={div2Ref}>
            <FileTextIcon className="text-black dark:text-white" />
          </Circle>
          <Circle ref={div3Ref}>
            <DatabaseIcon className="text-black dark:text-white" />
          </Circle>
          <Circle ref={div4Ref}>
            <GitBranchIcon className="text-black dark:text-white" />
          </Circle>
          <Circle ref={div5Ref}>
            <BotIcon className="text-black dark:text-white" />
          </Circle>
        </div>
        <div className="flex flex-col justify-center">
          <Circle ref={div6Ref} className="size-16">
            <div className="text-xs font-bold text-center">Engine</div>
          </Circle>
        </div>
        <div className="flex flex-col justify-center">
          <Circle ref={div7Ref}>
            <BotIcon className="text-black dark:text-white" />
          </Circle>
        </div>
      </div>

      <AnimatedBeam
        containerRef={containerRef as React.RefObject<HTMLElement>}
        fromRef={div1Ref as React.RefObject<HTMLElement>}
        toRef={div6Ref as React.RefObject<HTMLElement>}
      />
      <AnimatedBeam
        containerRef={containerRef as React.RefObject<HTMLElement>}
        fromRef={div2Ref as React.RefObject<HTMLElement>}
        toRef={div6Ref as React.RefObject<HTMLElement>}
      />
      <AnimatedBeam
        containerRef={containerRef as React.RefObject<HTMLElement>}
        fromRef={div3Ref as React.RefObject<HTMLElement>}
        toRef={div6Ref as React.RefObject<HTMLElement>}
      />
      <AnimatedBeam
        containerRef={containerRef as React.RefObject<HTMLElement>}
        fromRef={div4Ref as React.RefObject<HTMLElement>}
        toRef={div6Ref as React.RefObject<HTMLElement>}
      />
      <AnimatedBeam
        containerRef={containerRef as React.RefObject<HTMLElement>}
        fromRef={div5Ref as React.RefObject<HTMLElement>}
        toRef={div6Ref as React.RefObject<HTMLElement>}
      />
      <AnimatedBeam
        containerRef={containerRef as React.RefObject<HTMLElement>}
        fromRef={div6Ref as React.RefObject<HTMLElement>}
        toRef={div7Ref as React.RefObject<HTMLElement>}
      />
    </div>
  );
}
