"use client"

import { Suspense } from "react"
import TimbreSpaceVisualizer from "@/components/timbre-space-visualizer"
import AudioControls from "@/components/audio-controls"
import LyricsDisplay from "@/components/lyrics-display"
import PredictabilityPanel from "@/components/predictability-panel"
import FrequencyGraphOverlay from "@/components/frequency-graph-overlay"
import { useAudioStore } from "@/lib/audio-store"

export default function Page() {
  const showLyrics = useAudioStore((state) => state.showLyrics)
  
  return (
    <div className="relative w-full h-screen overflow-hidden">
      <FrequencyGraphOverlay />
      <Suspense fallback={<div className="w-full h-screen bg-background" />}>
        <TimbreSpaceVisualizer />
      </Suspense>
      <AudioControls />
      {showLyrics && <LyricsDisplay />}
      <PredictabilityPanel />
    </div>
  )
}
