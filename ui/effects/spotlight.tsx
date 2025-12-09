"use client";

import React, { useRef, useState, useCallback, useEffect } from "react";
import { motion, useSpring, useTransform, MotionValue } from "framer-motion";
import { cn } from "@/lib/utils";

type SpotlightProps = {
  className?: string;
  fill?: string;
};

export function Spotlight({ className, fill = "white" }: SpotlightProps) {
  const divRef = useRef<HTMLDivElement>(null);
  const [isMounted, setIsMounted] = useState(false);
  
  const mouseX = useSpring(0, { stiffness: 500, damping: 100 });
  const mouseY = useSpring(0, { stiffness: 500, damping: 100 });

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleMouseMove = useCallback(
    ({ currentTarget, clientX, clientY }: React.MouseEvent) => {
      const { left, top } = currentTarget.getBoundingClientRect();
      const x = clientX - left;
      const y = clientY - top;
      mouseX.set(x);
      mouseY.set(y);
    },
    [mouseX, mouseY]
  );
  
  // Create a portal-like effect or just huge blur
  // Actually, for a pure decorative spotlight usually placed in a container:
  // we need the parent to handle mouse move if it's "following".
  // BUT the common "Spotlight" component (Aceternity style) is fixed and just animates into view.
  // Wait, the USER asked for "Aceternity UI" Spotlight specifically. 
  // Aceternity's "Spotlight" is actually a fixed SVG that creates a dramatic cone of light.
  // Aceternity's "HoverBorderGradient" or "CardSpotlight" is what follows the mouse.
  // I will implement the "Dramatic Cone" Spotlight first as requested for the HERO sections.

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1.5 }}
      className={cn(
        "pointer-events-none absolute z-30 -top-40 -left-10 h-[169%] w-[138%] opacity-0 lg:w-[84%]",
        className
      )}
    >
      <svg
        className="animate-spotlight pointer-events-none absolute z-[1] h-[160%] w-[138%] lg:w-[84%] opacity-0"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 3787 2842"
        fill="none"
      >
        <g filter="url(#filter)">
          <ellipse
            cx="1924.71"
            cy="273.501"
            rx="1924.71"
            ry="273.501"
            transform="matrix(-0.822377 -0.568943 -0.568943 0.822377 3631.88 2291.09)"
            fill={fill}
            fillOpacity="0.21"
          />
        </g>
        <defs>
          <filter
            id="filter"
            x="0.860352"
            y="0.838989"
            width="3785.16"
            height="2840.26"
            filterUnits="userSpaceOnUse"
            colorInterpolationFilters="sRGB"
          >
            <feFlood floodOpacity="0" result="BackgroundImageFix" />
            <feBlend
              mode="normal"
              in="SourceGraphic"
              in2="BackgroundImageFix"
              result="shape"
            />
            <feGaussianBlur
              stdDeviation="151"
              result="effect1_foregroundBlur_1065_8"
            />
          </filter>
        </defs>
      </svg>
    </motion.div>
  );
}
