"use client"

import { useEffect, useRef, useState } from "react"
import { motion, useAnimation } from "framer-motion"
import { cn } from "@/lib/utils"

interface Node {
  id: number
  x: number
  y: number
  radius: number
  color: string
  velocity: { x: number; y: number }
  connections: number[]
}

export function NetworkBackground({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [nodes, setNodes] = useState<Node[]>([])
  const requestRef = useRef<number>()
  const mouseRef = useRef<{ x: number; y: number }>({ x: -1000, y: -1000 })

  // Initialize nodes
  useEffect(() => {
    if (!containerRef.current) {return}

    const { width, height } = containerRef.current.getBoundingClientRect()
    const nodeCount = 40
    const newNodes: Node[] = []

    for (let i = 0; i < nodeCount; i++) {
      newNodes.push({
        id: i,
        x: Math.random() * width,
        y: Math.random() * height,
        radius: Math.random() * 2 + 1,
        color: "rgba(255, 255, 255, 0.3)", // Default node color
        velocity: {
          x: (Math.random() - 0.5) * 0.5,
          y: (Math.random() - 0.5) * 0.5,
        },
        connections: [],
      })
    }

    setNodes(newNodes)
  }, [])

  // Animation Loop
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) {return}
    const ctx = canvas.getContext("2d")
    if (!ctx) {return}

    const resizeCanvas = () => {
      if (containerRef.current && canvas) {
        const { width, height } = containerRef.current.getBoundingClientRect()
        canvas.width = width
        canvas.height = height
      }
    }
    window.addEventListener("resize", resizeCanvas)
    resizeCanvas()

    const animate = () => {
      if (!containerRef.current || !canvas) {return}
      const { width, height } = containerRef.current.getBoundingClientRect()

      ctx.clearRect(0, 0, width, height)

      // Update and draw nodes
      nodes.forEach((node) => {
        // Move
        node.x += node.velocity.x
        node.y += node.velocity.y

        // Bounce
        if (node.x <= 0 || node.x >= width) {node.velocity.x *= -1}
        if (node.y <= 0 || node.y >= height) {node.velocity.y *= -1}

        // Mouse interaction (repel/attract or light up)
        const dx = mouseRef.current.x - node.x
        const dy = mouseRef.current.y - node.y
        const distance = Math.sqrt(dx * dx + dy * dy)
        const interactionRadius = 200

        let nodeColor = node.color
        if (distance < interactionRadius) {
            nodeColor = "rgba(255, 255, 255, 0.8)"
             // Gentle attraction to mouse
            node.x += dx * 0.005
            node.y += dy * 0.005
        }


        // Draw connections
        nodes.forEach((otherNode) => {
          if (node.id === otherNode.id) {return}
          const dxNode = node.x - otherNode.x
          const dyNode = node.y - otherNode.y
          const distNode = Math.sqrt(dxNode * dxNode + dyNode * dyNode)

          if (distNode < 150) {
            const opacity = 1 - distNode / 150
            if (distance < interactionRadius) {
                 ctx.strokeStyle = `rgba(255, 255, 255, ${opacity * 0.8})` // Brighter near mouse
            } else {
                 ctx.strokeStyle = `rgba(255, 255, 255, ${opacity * 0.15})` // Dim otherwise
            }
            ctx.lineWidth = 1
            ctx.beginPath()
            ctx.moveTo(node.x, node.y)
            ctx.lineTo(otherNode.x, otherNode.y)
            ctx.stroke()
          }
        })

        // Draw node
        ctx.beginPath()
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2)
        ctx.fillStyle = nodeColor
        ctx.fill()
      })

      requestRef.current = requestAnimationFrame(animate)
    }

    animate()

    const handleMouseMove = (e: MouseEvent) => {
        if (containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect()
            mouseRef.current = {
                x: e.clientX - rect.left,
                y: e.clientY - rect.top,
            }
        }
    }

     // Use global listener to track mouse even if over other elements in the hero
    containerRef.current?.addEventListener("mousemove", handleMouseMove)

    return () => {
      window.removeEventListener("resize", resizeCanvas)
      if (requestRef.current) {cancelAnimationFrame(requestRef.current)}
      containerRef.current?.removeEventListener("mousemove", handleMouseMove)
    }
  }, [nodes])

  return (
    <div ref={containerRef} className={cn("absolute inset-0 z-0", className)}>
      <canvas ref={canvasRef} className="block size-full" />
    </div>
  )
}
