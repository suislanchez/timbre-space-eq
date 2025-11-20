"use client"

import { useEffect, useRef } from "react"
import { useAudioStore } from "@/lib/audio-store"

export default function FrequencyGraphOverlay() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationFrameRef = useRef<number>()
  const frequencyData = useAudioStore((state) => state.frequencyData)
  const showFrequencyGraph = useAudioStore((state) => state.showFrequencyGraph)

  useEffect(() => {
    console.log("[v0] FrequencyGraph mounted - showFrequencyGraph:", showFrequencyGraph)

    if (!showFrequencyGraph) {
      console.log("[v0] FrequencyGraph hidden")
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      return
    }

    if (!canvasRef.current) {
      console.log("[v0] Canvas ref not ready")
      return
    }

    console.log("[v0] FrequencyGraph rendering enabled")
    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")
    if (!ctx) {
      console.error("[v0] Could not get canvas 2d context")
      return
    }

    const draw = () => {
      if (!frequencyData || !showFrequencyGraph) {
        animationFrameRef.current = requestAnimationFrame(draw)
        return
      }

      const width = canvas.width
      const height = canvas.height

      ctx.clearRect(0, 0, width, height)

      // Draw frequency bars
      const barWidth = width / frequencyData.length
      const gradient = ctx.createLinearGradient(0, height, 0, 0)
      gradient.addColorStop(0, "rgba(139, 92, 246, 0.2)")
      gradient.addColorStop(1, "rgba(236, 72, 153, 0.2)")

      for (let i = 0; i < frequencyData.length; i++) {
        const barHeight = (frequencyData[i] / 255) * height * 0.8
        const x = barWidth * i

        ctx.fillStyle = gradient
        ctx.fillRect(x, height - barHeight, barWidth - 1, barHeight)
      }

      animationFrameRef.current = requestAnimationFrame(draw)
    }

    draw()

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [frequencyData, showFrequencyGraph])

  if (!showFrequencyGraph) {
    console.log("[v0] FrequencyGraph not rendering - showFrequencyGraph is false")
    return null
  }

  console.log("[v0] FrequencyGraph component rendering canvas element")

  return (
    <canvas
      ref={canvasRef}
      width={1920}
      height={1080}
      className="absolute inset-0 w-full h-full pointer-events-none z-0"
      style={{ display: "block" }}
    />
  )
}
