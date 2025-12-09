"use client";

import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { BrainIcon, SparklesIcon, ZapIcon } from "lucide-react";
import type { HTMLAttributes, ReactNode } from "react";

export type ThinkingIndicatorVariant = "orbs" | "pulse" | "brain" | "minimal";

export type ThinkingIndicatorProps = HTMLAttributes<HTMLDivElement> & {
  variant?: ThinkingIndicatorVariant;
  message?: string;
  showIcon?: boolean;
  size?: "sm" | "md" | "lg";
};

const sizeClasses = {
  sm: "h-8",
  md: "h-12",
  lg: "h-16",
};

const orbSizes = {
  sm: "size-2",
  md: "size-3",
  lg: "size-4",
};

function GradientOrbs({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  return (
    <div className="relative flex items-center justify-center gap-2">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className={cn(
            orbSizes[size],
            "rounded-full",
            i === 0 && "bg-gradient-to-br from-violet-500 to-purple-600",
            i === 1 && "bg-gradient-to-br from-cyan-400 to-blue-500",
            i === 2 && "bg-gradient-to-br from-pink-500 to-rose-500"
          )}
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.7, 1, 0.7],
            y: [0, -6, 0],
          }}
          transition={{
            duration: 1.2,
            repeat: Infinity,
            delay: i * 0.2,
            ease: "easeInOut",
          }}
          style={{
            boxShadow: `0 0 20px ${
              i === 0
                ? "rgba(139, 92, 246, 0.5)"
                : i === 1
                ? "rgba(34, 211, 238, 0.5)"
                : "rgba(244, 114, 182, 0.5)"
            }`,
          }}
        />
      ))}
    </div>
  );
}

function PulseRings({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const ringSize = size === "sm" ? 24 : size === "md" ? 36 : 48;

  return (
    <div className="relative flex items-center justify-center">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="absolute rounded-full border-2 border-primary/30"
          style={{ width: ringSize, height: ringSize }}
          animate={{
            scale: [1, 2, 2.5],
            opacity: [0.6, 0.3, 0],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            delay: i * 0.6,
            ease: "easeOut",
          }}
        />
      ))}
      <motion.div
        className={cn(
          "rounded-full bg-gradient-to-br from-primary to-primary/60",
          size === "sm" ? "size-3" : size === "md" ? "size-4" : "size-5"
        )}
        animate={{ scale: [1, 1.1, 1] }}
        transition={{ duration: 1, repeat: Infinity }}
      />
    </div>
  );
}

function BrainAnimation({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const iconSize = size === "sm" ? 16 : size === "md" ? 24 : 32;

  return (
    <div className="relative flex items-center justify-center">
      <motion.div
        className="absolute"
        animate={{ rotate: 360 }}
        transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
      >
        {[0, 1, 2, 3].map((i) => (
          <motion.div
            key={i}
            className="absolute"
            style={{
              transform: `rotate(${i * 90}deg) translateY(-${iconSize}px)`,
            }}
          >
            <SparklesIcon
              className="text-yellow-400"
              size={size === "sm" ? 8 : size === "md" ? 10 : 12}
            />
          </motion.div>
        ))}
      </motion.div>
      <motion.div
        animate={{
          scale: [1, 1.1, 1],
          filter: [
            "drop-shadow(0 0 8px rgba(139, 92, 246, 0.3))",
            "drop-shadow(0 0 16px rgba(139, 92, 246, 0.6))",
            "drop-shadow(0 0 8px rgba(139, 92, 246, 0.3))",
          ],
        }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <BrainIcon
          className="text-primary"
          size={iconSize}
        />
      </motion.div>
    </div>
  );
}

function MinimalDots({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  return (
    <div className="flex items-center gap-1">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className={cn(
            "rounded-full bg-muted-foreground",
            size === "sm" ? "size-1" : size === "md" ? "size-1.5" : "size-2"
          )}
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{
            duration: 1,
            repeat: Infinity,
            delay: i * 0.2,
          }}
        />
      ))}
    </div>
  );
}

export const ThinkingIndicator = ({
  variant = "orbs",
  message,
  showIcon = true,
  size = "md",
  className,
  ...props
}: ThinkingIndicatorProps) => {
  const renderVariant = (): ReactNode => {
    switch (variant) {
      case "orbs":
        return <GradientOrbs size={size} />;
      case "pulse":
        return <PulseRings size={size} />;
      case "brain":
        return <BrainAnimation size={size} />;
      case "minimal":
        return <MinimalDots size={size} />;
      default:
        return <GradientOrbs size={size} />;
    }
  };

  return (
    <AnimatePresence>
      <div className={cn(sizeClasses[size], className)} {...props}>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className={cn(
            "flex items-center gap-3 rounded-xl bg-muted/50 px-4 py-3 h-full",
            "border border-border/50 backdrop-blur-sm"
          )}
        >
          {showIcon && variant !== "brain" && (
            <ZapIcon className="size-4 text-muted-foreground" />
          )}
          {renderVariant()}
          {message !== undefined && message !== "" && (
            <motion.span
              className="text-sm text-muted-foreground"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              {message}
            </motion.span>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export type ThinkingStateProps = HTMLAttributes<HTMLDivElement> & {
  state?: "thinking" | "searching" | "analyzing" | "generating";
};

const stateConfig = {
  thinking: { variant: "brain" as const, message: "Thinking..." },
  searching: { variant: "pulse" as const, message: "Searching..." },
  analyzing: { variant: "orbs" as const, message: "Analyzing..." },
  generating: { variant: "minimal" as const, message: "Generating..." },
};

export const ThinkingState = ({
  state = "thinking",
  className,
  ...props
}: ThinkingStateProps) => {
  const config = stateConfig[state];

  return (
    <ThinkingIndicator
      variant={config.variant}
      message={config.message}
      className={className}
      {...props}
    />
  );
};
