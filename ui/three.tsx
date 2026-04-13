"use client"

import * as React from 'react'
import * as THREE from 'three'

import { cn } from '@/lib/utils'

export interface ThreeStageContext {
    canvas: HTMLCanvasElement
    renderer: THREE.WebGLRenderer
    scene: THREE.Scene
    camera: THREE.PerspectiveCamera
    size: {
        width: number
        height: number
        pixelRatio: number
    }
}

export interface ThreeStageProps extends React.ComponentProps<'div'> {
    canvasClassName?: string
    antialias?: boolean
    alpha?: boolean
    background?: THREE.ColorRepresentation
    camera?: {
        fov?: number
        near?: number
        far?: number
        position?: [number, number, number]
    }
    onReady?: (context: ThreeStageContext) => void | (() => void)
    onFrame?: (context: ThreeStageContext, delta: number, elapsed: number) => void
}

export const ThreeCanvas = React.forwardRef<
    HTMLCanvasElement,
    React.ComponentProps<'canvas'>
>(function ThreeCanvas({ className, ...props }, ref) {
    return <canvas ref={ref} className={cn('block h-full w-full', className)} {...props} />
})

ThreeCanvas.displayName = 'ThreeCanvas'

/**
 * A lightweight Three.js stage that handles renderer setup, resizing, and animation.
 */
export function ThreeStage({
    className,
    canvasClassName,
    antialias = true,
    alpha = true,
    background,
    camera: cameraOptions,
    onReady,
    onFrame,
    ...props
}: ThreeStageProps) {
    const canvasRef = React.useRef<HTMLCanvasElement | null>(null)

    React.useEffect(() => {
        const canvas = canvasRef.current

        if (!canvas) {
            return undefined
        }

        const renderer = new THREE.WebGLRenderer({
            canvas,
            antialias,
            alpha,
            powerPreference: 'high-performance',
        })

        renderer.outputColorSpace = THREE.SRGBColorSpace
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))

        const scene = new THREE.Scene()
        if (background !== undefined) {
            scene.background = new THREE.Color(background)
        }

        const camera = new THREE.PerspectiveCamera(
            cameraOptions?.fov ?? 45,
            1,
            cameraOptions?.near ?? 0.1,
            cameraOptions?.far ?? 1000
        )
        camera.position.set(...(cameraOptions?.position ?? [0, 0, 5]))

        const context: ThreeStageContext = {
            canvas,
            renderer,
            scene,
            camera,
            size: {
                width: 1,
                height: 1,
                pixelRatio: window.devicePixelRatio || 1,
            },
        }

        let disposed = false
        let animationFrame = 0
        let cleanup: (() => void) | undefined

        const getSize = () => {
            const rect = canvas.getBoundingClientRect()
            return {
                width: Math.max(Math.round(rect.width), 1),
                height: Math.max(Math.round(rect.height), 1),
            }
        }

        const resize = () => {
            const { width, height } = getSize()
            const pixelRatio = Math.min(window.devicePixelRatio || 1, 2)

            renderer.setPixelRatio(pixelRatio)
            renderer.setSize(width, height, false)
            camera.aspect = width / height
            camera.updateProjectionMatrix()

            context.size.width = width
            context.size.height = height
            context.size.pixelRatio = pixelRatio
        }

        resize()
        cleanup = onReady?.(context) ?? undefined

        const resizeObserver =
            typeof ResizeObserver !== 'undefined'
                ? new ResizeObserver(() => {
                      resize()
                  })
                : null

        if (resizeObserver) {
            resizeObserver.observe(canvas.parentElement ?? canvas)
        }

        const clock = new THREE.Clock()

        const loop = () => {
            if (disposed) {
                return
            }

            const delta = clock.getDelta()
            const elapsed = clock.getElapsedTime()

            onFrame?.(context, delta, elapsed)
            renderer.render(scene, camera)

            animationFrame = window.requestAnimationFrame(loop)
        }

        animationFrame = window.requestAnimationFrame(loop)

        return () => {
            disposed = true
            window.cancelAnimationFrame(animationFrame)
            resizeObserver?.disconnect()
            cleanup?.()
            renderer.dispose()
            scene.clear()
        }
    }, [antialias, alpha, background, cameraOptions, onFrame, onReady])

    return (
        <div
            className={cn(
                'relative h-full w-full overflow-hidden rounded-2xl border border-border/60 bg-black/5',
                className
            )}
            {...props}
        >
            <ThreeCanvas ref={canvasRef} className={canvasClassName} aria-label="3D scene canvas" />
        </div>
    )
}
