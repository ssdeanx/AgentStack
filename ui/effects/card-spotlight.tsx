"use client";

import { useMotionValue, motion, useMotionTemplate } from "framer-motion";
import type { MouseEvent as ReactMouseEvent } from "react";
import React from "react";
import { cn } from "@/lib/utils";

export const CardSpotlight = ({
  children,
  radius = 350,
  color = "#262626",
  className,
  opacity = 1,
  transitionDuration = 300,
  ...props
}: {
  radius?: number;
  color?: string;
  children: React.ReactNode;
  opacity?: number;
  transitionDuration?: number;
} & React.HTMLAttributes<HTMLDivElement>) => {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  function handleMouseMove({
    currentTarget,
    clientX,
    clientY,
  }: ReactMouseEvent) {
    const { left, top } = currentTarget.getBoundingClientRect();

    mouseX.set(clientX - left);
    mouseY.set(clientY - top);
  }

  function handleTouchMove(event: React.TouchEvent) {
    const touch = event.touches[0];
    if (touch) {
      const { currentTarget, clientX, clientY } = { currentTarget: event.currentTarget as HTMLElement, clientX: touch.clientX, clientY: touch.clientY };
      const { left, top } = currentTarget.getBoundingClientRect();

      mouseX.set(clientX - left);
      mouseY.set(clientY - top);
    }
  }

  return (
    <div
      className={cn(
        "group/spotlight relative border border-neutral-800 bg-black overflow-hidden rounded-xl",
        className
      )}
      onMouseMove={handleMouseMove}
      onTouchMove={handleTouchMove}
      {...props}
    >
      <motion.div
        className="pointer-events-none absolute -inset-px rounded-xl opacity-0 transition-opacity"
        style={{
          backgroundColor: color,
          maskImage: useMotionTemplate`
            radial-gradient(
              ${radius}px circle at ${mouseX}px ${mouseY}px,
              white,
              transparent
            )
          `,
          opacity,
          transitionDuration: `${transitionDuration}ms`,
          willChange: 'mask-image',
        }}
      />
      {children}
    </div>
  );
};
