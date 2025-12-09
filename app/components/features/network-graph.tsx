"use client";

import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

export const NetworkGraph = () => {
  const nodes = [
    { top: "20%", left: "20%", delay: 0 },
    { top: "30%", left: "60%", delay: 1 },
    { top: "60%", left: "30%", delay: 2 },
    { top: "70%", left: "70%", delay: 0.5 },
    { top: "40%", left: "45%", delay: 1.5, main: true },
  ];

  return (
    <div className="relative w-full h-[400px] bg-black/40 rounded-xl overflow-hidden border backdrop-blur-sm">
        <div className="absolute inset-0 z-0">
             <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20" />
        </div>

        {nodes.map((node, i) => (
            <motion.div
                key={i}
                className={cn(
                    "absolute size-4 rounded-full bg-white shadow-[0_0_15px_rgba(255,255,255,0.5)] z-10",
                    node.main ? "size-6 bg-primary shadow-[0_0_30px_rgba(var(--primary),0.6)]" : "bg-neutral-400"
                )}
                style={{ top: node.top, left: node.left }}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: node.delay, duration: 1, type: "spring" }}
            >
                <div className="absolute -inset-4 bg-white/20 rounded-full animate-pulse-glow" />
                {/* Connecting lines mocked for visual */}
                {!(node.main ?? false) && (
                     <svg className="absolute top-1/2 left-1/2 w-[500px] h-[500px] pointer-events-none opacity-20 overflow-visible" style={{ transform: 'translate(-50%, -50%)' }}>
                        <line x1="250" y1="250" x2={node.left > "50%" ? "100" : "400"} y2={node.top > "50%" ? "100" : "400"} stroke="white" strokeWidth="1" />
                     </svg>
                )}
            </motion.div>
        ))}

        {/* Central Hub Connector Lines would be better with AnimatedBeam but this is a quick spatial mock */}
    </div>
  );
};
