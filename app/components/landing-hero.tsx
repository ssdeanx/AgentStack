'use client'

import { useGSAP } from '@gsap/react'
import { gsap } from 'gsap'
import { useRef, useEffect } from 'react'
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'
import { ensureGsapRegistered } from '@/app/components/gsap/registry'
import { AnimatedOrbitalLogo } from '@/app/components/gsap/animated-orbital-logo'
import { AnimatedQuantumLattice, AnimatedNeuralMesh } from '@/app/components/gsap/svg-suite'
import { NetworkBackground } from './network-background'

export function LandingHero() {
    const sectionRef = useRef<HTMLElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    
    // Mouse Parallax values
    const mouseX = useMotionValue(0)
    const mouseY = useMotionValue(0)

    // Smooth springs for fluid motion
    const springConfig = { damping: 25, stiffness: 150 }
    const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [5, -5]), springConfig)
    const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-5, 5]), springConfig)
    
    // Deeper layers move more
    const layer1RotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [10, -10]), springConfig)
    const layer1RotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-10, 10]), springConfig)

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!containerRef.current) {
                return
            }
            const rect = containerRef.current.getBoundingClientRect()
            const x = (e.clientX - rect.left) / rect.width - 0.5
            const y = (e.clientY - rect.top) / rect.height - 0.5
            mouseX.set(x)
            mouseY.set(y)
        }

        window.addEventListener('mousemove', handleMouseMove)
        return () => window.removeEventListener('mousemove', handleMouseMove)
    }, [mouseX, mouseY])

    useGSAP(
        () => {
            ensureGsapRegistered()

            if (!sectionRef.current) {
                return
            }

            const tl = gsap.timeline()

            // Initial "Big Bang" entry
            tl.fromTo(
                '.hero-3d-node',
                { opacity: 0, scale: 0.5, z: -500, rotateX: 45, rotateY: -45 },
                {
                    opacity: 1,
                    scale: 1,
                    z: 0,
                    rotateX: 0,
                    rotateY: 0,
                    duration: 1.2,
                    ease: 'expo.out',
                    stagger: 0.1,
                }
            )

            tl.fromTo(
                '.hero-text-shimmer',
                { opacity: 0, y: 40, filter: 'blur(10px)' },
                {
                    opacity: 1,
                    y: 0,
                    filter: 'blur(0px)',
                    duration: 0.8,
                    ease: 'power3.out',
                    stagger: 0.1,
                },
                '-=0.8'
            )
        },
        { scope: sectionRef }
    )

    return (
        <section
            ref={sectionRef}
            className="relative h-[100vh] min-h-[800px] w-full overflow-hidden bg-background mesh-gradient"
        >
            {/* 3D Stage Background */}
            <div className="absolute inset-0 z-0 opacity-40">
                <NetworkBackground />
            </div>

            {/* Decorative Ambient Glows */}
            <div className="absolute -left-[10%] -top-[10%] size-[60%] rounded-full bg-primary/10 blur-[120px] animate-ambient-pulse" />
            <div className="absolute -right-[5%] bottom-[10%] size-[50%] rounded-full bg-cyan-500/5 blur-[100px]" />

            <div 
                ref={containerRef}
                className="container relative z-10 mx-auto flex h-full items-center justify-center px-4 pt-20"
            >
                <motion.div 
                    style={{ rotateX, rotateY }}
                    className="relative flex w-full flex-col items-center justify-center text-center stage-3d"
                >
                    {/* Background Layer: Floating Grid element */}
                    <motion.div 
                        style={{ rotateX: layer1RotateX, rotateY: layer1RotateY, translateZ: -100 }}
                        className="pointer-events-none absolute -right-20 -top-40 z-0 hidden opacity-20 xl:block layer-3d"
                    >
                         <div className="size-[500px] rounded-full border border-primary/20 bg-[radial-gradient(circle_at_center,var(--primary-foreground)_0%,transparent_70%)]" />
                    </motion.div>

                    {/* Floating 3D Cards */}
                    <div className="absolute inset-0 -z-10 pointer-events-none">
                        <motion.div 
                            style={{ rotateX: layer1RotateX, rotateY: layer1RotateY, translateZ: 50 }}
                            className="absolute right-[10%] top-[15%] hero-3d-node"
                        >
                            <div className="glass-ultra p-6 rounded-3xl border-white/20 shadow-2xl spatial-depth">
                                <AnimatedQuantumLattice size={160} className="text-cyan-300" animate />
                            </div>
                        </motion.div>

                        <motion.div
                            style={{ rotateX, rotateY, translateZ: 120 }}
                            className="absolute left-[5%] bottom-[20%] hero-3d-node hidden lg:block"
                        >
                            <div className="glass-morphism p-8 rounded-[2.5rem] border-primary/10 shadow-xl">
                                <AnimatedNeuralMesh size={180} className="text-primary/40" animate />
                            </div>
                        </motion.div>
                    </div>

                    {/* Main Content Layer */}
                    <motion.div 
                        style={{ translateZ: 150 }}
                        className="mx-auto max-w-5xl layer-3d"
                    >
                        <div className="mb-8 inline-flex items-center rounded-full glass-ultra px-4 py-1.5 text-sm shadow-xl hero-text-shimmer">
                            <AnimatedOrbitalLogo size={40} className="me-3 text-cyan-400" />
                            <div className="flex items-center gap-2">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                                </span>
                                <span className="font-mono text-[10px] tracking-[0.2em] text-foreground/80 uppercase">
                                    Nexus Core Online
                                </span>
                            </div>
                        </div>

                        <h1 className="mb-10 text-6xl font-black tracking-tighter text-foreground sm:text-8xl lg:text-[10rem] leading-[0.85] hero-text-shimmer">
                            AGENT
                            <br />
                            <span className="text-transparent bg-clip-text bg-linear-to-b from-foreground via-foreground/80 to-foreground/20">
                                DYNAMICS
                            </span>
                        </h1>

                        <p className="mx-auto mb-14 max-w-2xl text-xl leading-relaxed text-muted-foreground/90 font-medium hero-text-shimmer">
                            Architecting high-fidelity autonomous swarms. 
                            Experience the next generation of 
                            <span className="text-foreground border-b border-primary/30 mx-1">multi-agent orchestration</span> 
                            with real-time spatial visualization.
                        </p>

                        <div className="flex flex-col sm:flex-row items-center justify-center gap-6 hero-text-shimmer">
                            <button className="group relative h-14 overflow-hidden rounded-2xl bg-primary px-10 text-lg font-bold text-primary-foreground shadow-2xl transition-all hover:scale-105 active:scale-95">
                                <span className="relative z-10 flex items-center gap-2">
                                    Launch Interface
                                    <svg 
                                        viewBox="0 0 24 24" 
                                        fill="none" 
                                        stroke="currentColor" 
                                        strokeWidth="2" 
                                        strokeLinecap="round" 
                                        strokeLinejoin="round" 
                                        className="size-5 transition-transform group-hover:translate-x-1"
                                    >
                                        <line x1="5" y1="12" x2="19" y2="12"></line>
                                        <polyline points="12 5 19 12 12 19"></polyline>
                                    </svg>
                                </span>
                                <div className="absolute inset-0 bg-linear-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                            </button>
                            
                            <button className="h-14 rounded-2xl border border-border glass-morphism px-10 text-lg font-semibold transition-all hover:bg-foreground/5 dark:hover:bg-white/5">
                                Read the Docs
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            </div>

            {/* Custom Floating Animation for 3D elements */}
            <style jsx global>{`
                @keyframes float-hero {
                    0%, 100% { transform: translateY(0) rotateX(var(--rotate-x)) rotateY(var(--rotate-y)); }
                    50% { transform: translateY(-20px) rotateX(var(--rotate-x)) rotateY(var(--rotate-y)); }
                }
                .hero-3d-node {
                    animation: float-hero 6s ease-in-out infinite;
                }
            `}</style>

            {/* Stage Floor Shadow */}
            <div className="absolute bottom-0 left-0 right-0 h-40 bg-linear-to-t from-background to-transparent pointer-events-none" />
        </section>
    )
}
