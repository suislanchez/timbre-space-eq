"use client"

import { Suspense } from "react"
import TimbreSpaceVisualizer from "@/components/timbre-space-visualizer"
import AudioControls from "@/components/audio-controls"
import PredictabilityPanel from "@/components/predictability-panel"
import FrequencyGraphOverlay from "@/components/frequency-graph-overlay"

export default function Page() {
  return (
    <div className="relative w-full h-screen overflow-hidden">
      <FrequencyGraphOverlay />
      <Suspense fallback={<div className="w-full h-screen bg-background" />}>
        <TimbreSpaceVisualizer />
      </Suspense>
      <AudioControls />
      <PredictabilityPanel />
    </div>
  )
}
