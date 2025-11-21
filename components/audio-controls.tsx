"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Card } from "@/components/ui/card"
import { Play, Pause, Upload, Volume2, ChevronUp, ChevronDown, Download } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { useAudioStore } from "@/lib/audio-store"
import { useToast } from "@/hooks/use-toast"
import EQControls from "./eq-controls"
import AdvancedControls from "./advanced-controls"
import InstrumentVisualizer from "./instrument-visualizer"

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || isNaN(seconds)) return "0:00"
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, "0")}`
}

export default function AudioControls() {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const lyricsInputRef = useRef<HTMLInputElement>(null)
  const {
    isPlaying,
    volume,
    currentFileName,
    currentTime,
    duration,
    spectralCentroid,
    rhythmMetrics, // Get rhythm metrics
    isTranscribingLyrics, // Added transcription state
    transcriptionProgress, // Added transcription progress
    setVolume,
    initAudio,
    togglePlayback,
    loadAudioFile,
    transcribeLyrics, // Added transcribe function
    loadLyricsFile,
    lyricsData,
    showTrails,
    showClusters,
    showSpectralOverlay,
    toggleTrails,
    toggleClusters,
    toggleSpectralOverlay,
    exportTimbreData,
  } = useAudioStore()
  const { toast } = useToast()

  useEffect(() => {
    initAudio()
  }, [initAudio])

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsLoading(true)
    const success = await loadAudioFile(file)

    if (success) {
      toast({
        title: "Audio loaded",
        description: `${file.name} is ready to play`,
      })
    } else {
      toast({
        title: "Failed to load audio",
        description: "Please try a different audio file (MP3, WAV, OGG)",
        variant: "destructive",
      })
    }

    setIsLoading(false)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleLyricsUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    console.log("[v0] Uploading lyrics file:", file.name)
    const success = await loadLyricsFile(file)

    if (success) {
      toast({
        title: "Lyrics loaded",
        description: `${file.name} loaded successfully`,
      })
    } else {
      toast({
        title: "Failed to load lyrics",
        description: "Please upload a valid .lrc file",
        variant: "destructive",
      })
    }

    if (lyricsInputRef.current) {
      lyricsInputRef.current.value = ""
    }
  }

  const handleExportJSON = () => {
    const data = exportTimbreData()
    const blob = new Blob([data], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `timbre-analysis-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)

    toast({
      title: "Data Exported",
      description: "Timbre analysis data has been downloaded as JSON.",
    })
  }

  const handleExportCSV = () => {
    const state = useAudioStore.getState()
    const data = JSON.parse(exportTimbreData())
    
    // Create CSV header
    let csv = "Timestamp,Instrument,Energy,SpectralCentroid,Brightness,Roughness,Frequency,Chord,Note,Key,Degree\n"
    
    // Add timbre features
    if (data.instruments && data.instruments.length > 0) {
      data.instruments.forEach((inst: any) => {
        const timestamp = data.timestamp || new Date().toISOString()
        csv += `${timestamp},"${inst.name}",${inst.energy},${inst.features.spectralCentroid},${inst.features.brightness},${inst.features.roughness},${inst.features.spectralCentroid},"${data.currentChord || "---"}","${data.currentNote || "---"}","${data.songKey || "---"}","${data.chordDegree || "---"}"\n`
      })
    }
    
    // Add current state if no instruments
    if (!data.instruments || data.instruments.length === 0) {
      const timestamp = data.timestamp || new Date().toISOString()
      csv += `${timestamp},"Current",${data.currentTime || 0},${data.spectralCentroid || 0},${((data.spectralCentroid || 0) / 11025) * 100},0,${data.spectralCentroid || 0},"${data.currentChord || "---"}","${data.currentNote || "---"}","${data.songKey || "---"}","${data.chordDegree || "---"}"\n`
    }
    
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `timbre-analysis-${Date.now()}.csv`
    a.click()
    URL.revokeObjectURL(url)

    toast({
      title: "Data Exported",
      description: "Timbre analysis data has been downloaded as CSV.",
    })
  }

  const handleTranscribe = async () => {
    console.log("[v0] ===== TRANSCRIBE BUTTON CLICKED =====")
    console.log("[v0] Current file name:", currentFileName)
    console.log("[v0] Is playing:", isPlaying)
    console.log("[v0] Is already transcribing:", isTranscribingLyrics)

    if (!currentFileName) {
      console.warn("[v0] ❌ No audio file loaded")
      toast({
        title: "No audio loaded",
        description: "Please upload an audio file first",
        variant: "destructive",
      })
      return
    }

    console.log("[v0] ✓ Starting transcription process...")
    toast({
      title: "Starting transcription",
      description: "Using OpenAI Whisper to generate timestamped lyrics...",
    })

    console.log("[v0] Calling transcribeLyrics()...")
    await transcribeLyrics()
    console.log("[v0] transcribeLyrics() completed")

    const state = useAudioStore.getState()
    console.log("[v0] Current state after transcription:")
    console.log("[v0] - lyricsData length:", state.lyricsData.length)
    console.log("[v0] - isTranscribingLyrics:", state.isTranscribingLyrics)
    console.log("[v0] - transcriptionProgress:", state.transcriptionProgress)

    if (state.lyricsData.length > 0 && !state.isTranscribingLyrics) {
      console.log("[v0] ✅ Transcription successful!")
      toast({
        title: "Transcription complete",
        description: `Generated ${state.lyricsData.length} lyric phrases`,
      })
    }
  }

  return (
    <>
      <div className="absolute top-0 left-0 right-0 p-4 pointer-events-none z-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Timbre Space EQ</h1>
            <p className="text-xs text-muted-foreground mt-0.5">{currentFileName || "Upload a track to begin"}</p>
          </div>
        </div>
      </div>

      <div className="absolute top-20 left-4 pointer-events-none z-10">
        <Card className="bg-card/80 backdrop-blur-xl border-border/50 p-3 w-48">
          <h3 className="text-xs font-semibold mb-1.5">Spectral Analysis</h3>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Centroid</span>
              <span className="font-mono">{Math.round(spectralCentroid)} Hz</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Brightness</span>
              <span className="font-mono">{((spectralCentroid / 11025) * 100).toFixed(1)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tempo</span>
              <span className="font-mono">{rhythmMetrics.tempo} BPM</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Beat</span>
              <span className="font-mono">{(rhythmMetrics.beatStrength * 100).toFixed(0)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Syncopation</span>
              <span className="font-mono">{(rhythmMetrics.syncopation * 100).toFixed(0)}%</span>
            </div>
          </div>
        </Card>
      </div>

      <div className="absolute bottom-24 left-4 pointer-events-none z-10">
        <Card className="bg-card/80 backdrop-blur-xl border-border/50 p-2.5 w-44">
          <h3 className="text-xs font-semibold mb-1.5">Instruments</h3>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
            {[
              { name: "Kick", color: "#8b5cf6" },
              { name: "Snare", color: "#ec4899" },
              { name: "Hi-Hat", color: "#06b6d4" },
              { name: "Bass", color: "#8b5cf6" },
              { name: "Synth", color: "#10b981" },
              { name: "Vocal", color: "#f59e0b" },
              { name: "Guitar", color: "#ef4444" },
              { name: "Piano", color: "#14b8a6" },
            ].map((inst) => (
              <div key={inst.name} className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: inst.color }} />
                <span className="text-muted-foreground truncate">{inst.name}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {isCollapsed && (
        <div className="absolute bottom-4 right-4 pointer-events-auto z-10">
          <InstrumentVisualizer />
        </div>
      )}

      <div className="absolute bottom-4 left-4 right-4 pointer-events-none z-10">
        <div className="pointer-events-auto">
          <Card className="bg-card/90 backdrop-blur-xl border-border/50 p-3">
            {isCollapsed ? (
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 flex-1">
                  <Button
                    size="icon"
                    variant="default"
                    onClick={togglePlayback}
                    className="h-9 w-9 rounded-full"
                    disabled={!currentFileName || isLoading || isTranscribingLyrics}
                  >
                    {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
                  </Button>

                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="font-mono">{formatTime(currentTime)}</span>
                    <div className="w-32 bg-muted rounded-full h-1.5">
                      <div
                        className="bg-primary h-1.5 rounded-full transition-all"
                        style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                      />
                    </div>
                    <span className="font-mono">{formatTime(duration)}</span>
                  </div>

                  <div className="flex items-center gap-2 w-24">
                    <Volume2 className="h-3.5 w-3.5 text-muted-foreground" />
                    <Slider
                      value={[volume * 100]}
                      onValueChange={([v]) => setVolume(v / 100)}
                      max={100}
                      step={1}
                      className="flex-1"
                    />
                  </div>

                  <div className="text-xs text-muted-foreground">
                    <span className="font-mono">{Math.round(spectralCentroid)} Hz</span>
                  </div>
                </div>

                {/* Toggles for collapsed state - desktop only */}
                <div className="hidden md:flex items-center gap-4 flex-shrink-0">
                  <div className="flex items-center gap-2">
                    <label htmlFor="trails-collapsed" className="text-xs text-muted-foreground cursor-pointer">
                      Trails
                    </label>
                    <Switch
                      id="trails-collapsed"
                      checked={showTrails}
                      onCheckedChange={toggleTrails}
                      className="scale-75"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <label htmlFor="clusters-collapsed" className="text-xs text-muted-foreground cursor-pointer">
                      Clusters
                    </label>
                    <Switch
                      id="clusters-collapsed"
                      checked={showClusters}
                      onCheckedChange={toggleClusters}
                      className="scale-75"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <label htmlFor="spectral-collapsed" className="text-xs text-muted-foreground cursor-pointer">
                      Waterfall
                    </label>
                    <Switch
                      id="spectral-collapsed"
                      checked={showSpectralOverlay}
                      onCheckedChange={toggleSpectralOverlay}
                      className="scale-75"
                    />
                  </div>

                  <div className="flex items-center gap-2 border-l border-border/50 pl-4">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleExportJSON}
                      className="h-7 px-2 text-xs"
                      title="Export as JSON"
                    >
                      <Download className="h-3 w-3 mr-1" />
                      JSON
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleExportCSV}
                      className="h-7 px-2 text-xs"
                      title="Export as CSV"
                    >
                      <Download className="h-3 w-3 mr-1" />
                      CSV
                    </Button>
                  </div>
                </div>

                <Button size="icon" variant="ghost" onClick={() => setIsCollapsed(false)} className="h-8 w-8">
                  <ChevronUp className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Button
                      size="icon"
                      variant="default"
                      onClick={togglePlayback}
                      className="h-10 w-10 rounded-full"
                      disabled={!currentFileName || isLoading || isTranscribingLyrics}
                    >
                      {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
                    </Button>

                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      className="h-10 w-10 rounded-full"
                      disabled={isLoading || isTranscribingLyrics}
                    >
                      <Upload className="h-4 w-4" />
                    </Button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="audio/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />

                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={handleTranscribe}
                      disabled={!currentFileName || isLoading || isTranscribingLyrics || isPlaying}
                      className="h-10 px-3 text-xs relative"
                    >
                      {isTranscribingLyrics ? (
                        <>
                          <span className="opacity-0">Transcribe Lyrics</span>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="text-xs font-medium">{transcriptionProgress}%</div>
                          </div>
                        </>
                      ) : (
                        "Transcribe Lyrics"
                      )}
                    </Button>

                    {isTranscribingLyrics && (
                      <div className="w-32 bg-muted rounded-full h-1.5">
                        <div
                          className="bg-primary h-1.5 rounded-full transition-all duration-300"
                          style={{ width: `${transcriptionProgress}%` }}
                        />
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-0.5 w-48">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{formatTime(currentTime)}</span>
                      <span>{formatTime(duration)}</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-1.5">
                      <div
                        className="bg-primary h-1.5 rounded-full transition-all"
                        style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex-1">
                    <EQControls />
                  </div>

                  <div className="flex-1">
                    <AdvancedControls />
                  </div>
                </div>

                <Button size="icon" variant="ghost" onClick={() => setIsCollapsed(true)} className="h-8 w-8">
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </div>
            )}
          </Card>
        </div>
      </div>
    </>
  )
}
