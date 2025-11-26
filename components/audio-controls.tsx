"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Card } from "@/components/ui/card"
import ChordDisplay from "@/components/chord-display"
import {
  Play,
  Pause,
  Upload,
  Volume2,
  ChevronUp,
  ChevronDown,
  Download,
  RotateCcw,
  Info,
  X,
} from "lucide-react"
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
  const [pendingSeek, setPendingSeek] = useState<number | null>(null)
  const [isInfoOpen, setIsInfoOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const lyricsInputRef = useRef<HTMLInputElement>(null)
  const stemsInputRef = useRef<HTMLInputElement>(null)
  const {
    isPlaying,
    volume,
    currentFileName,
    currentTime,
    duration,
    spectralCentroid,
    spectralRolloff,
    roughness,
    zeroCrossingRate,
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
    showLyrics,
    showWater,
    stems,
    toggleTrails,
    toggleClusters,
    toggleSpectralOverlay,
    toggleLyrics,
    toggleWater,
    loadStemFile,
    toggleStem,
    setStemVolume,
    exportTimbreData,
    seekTo,
    replay,
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
    let csv = "Time,Instrument,AvgEnergy,PeakEnergy,ActiveTime,SpectralCentroid,Roughness,Tempo,Chord,ChordDegree,Key\n"
    
    // Add per-instrument statistics
    if (data.instruments && data.instruments.length > 0) {
      data.instruments.forEach((inst: any) => {
        csv += `"Full Song","${inst.name}",${inst.statistics.avgEnergy},${inst.statistics.peakEnergy},${inst.statistics.totalActiveTime},${data.overallStatistics.avgSpectralCentroid},${data.overallStatistics.avgRoughness},${data.overallStatistics.avgTempo},"${data.overallStatistics.songKey}","","${data.overallStatistics.songKey}"\n`
      })
    }
    
    // Add time-series data for each instrument
    csv += "\n\nTime Series Data\n"
    csv += "Time,Instrument,Energy\n"
    
    if (data.instruments && data.instruments.length > 0) {
      data.instruments.forEach((inst: any) => {
        if (inst.timeSeries && inst.timeSeries.length > 0) {
          inst.timeSeries.forEach((sample: any) => {
            csv += `${sample.time},"${inst.name}",${sample.energy}\n`
          })
        }
      })
    }
    
    // Add chord progression
    csv += "\n\nChord Progression\n"
    csv += "Time,Chord,Degree,Duration\n"
    
    if (data.chordProgression && data.chordProgression.length > 0) {
      data.chordProgression.forEach((chord: any) => {
        csv += `${chord.time},"${chord.chord}","${chord.degree}",${chord.duration}\n`
      })
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
      description: "Comprehensive timbre analysis data has been downloaded as CSV.",
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

  const handleTimelineChange = (value: number[]) => {
    if (!value.length) return
    setPendingSeek(value[0])
  }

  const handleTimelineCommit = (value: number[]) => {
    if (!value.length) return
    const nextPosition = value[0]
    setPendingSeek(null)
    seekTo(nextPosition)
  }

  const handleStemsUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    console.log("[v0] Uploading stems:", files.length, "files")

    // Detect stem type from filename
    const detectStemType = (filename: string): "vocals" | "drums" | "bass" | "other" | null => {
      const lower = filename.toLowerCase()
      if (lower.includes("vocal")) return "vocals"
      if (lower.includes("drum")) return "drums"
      if (lower.includes("bass")) return "bass"
      if (lower.includes("other") || lower.includes("instrument")) return "other"
      return null
    }

    let successCount = 0
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const stemType = detectStemType(file.name)

      if (!stemType) {
        console.warn("[v0] Could not detect stem type from filename:", file.name)
        toast({
          title: "Unknown stem type",
          description: `Could not detect stem type from "${file.name}". Please include "vocals", "drums", "bass", or "other" in the filename.`,
          variant: "destructive",
        })
        continue
      }

      const success = await loadStemFile(stemType, file)
      if (success) {
        successCount++
      } else {
        toast({
          title: "Failed to load stem",
          description: `Could not load ${stemType} stem from "${file.name}"`,
          variant: "destructive",
        })
      }
    }

    if (successCount > 0) {
      toast({
        title: "Stems loaded",
        description: `Successfully loaded ${successCount} stem${successCount > 1 ? "s" : ""}`,
      })
    }

    if (stemsInputRef.current) {
      stemsInputRef.current.value = ""
    }
  }

  const effectiveCurrentTime = pendingSeek ?? currentTime
  const timelineDisabled = !duration || duration <= 0
  const timelineMax = duration > 0 ? duration : 1
  const stemsLoaded = Object.values(stems).some((stem) => stem !== null)

  return (
    <>
      <div className="absolute top-0 left-0 right-0 p-4 pointer-events-none z-10">
        <div className="flex items-center justify-between gap-4">
          <div className="pointer-events-auto">
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Timbre Space EQ</h1>
            <p className="text-xs text-muted-foreground mt-0.5">{currentFileName || "Upload a track to begin"}</p>
          </div>
          <div className="pointer-events-auto">
            <Button
              size="icon"
              variant="ghost"
              className="h-9 w-9 rounded-full"
              onClick={() => setIsInfoOpen((prev) => !prev)}
              aria-label={isInfoOpen ? "Hide project details" : "Show project details"}
            >
              {isInfoOpen ? <X className="h-4 w-4" /> : <Info className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </div>

      {isInfoOpen && (
        <div className="absolute top-16 right-4 max-w-md pointer-events-auto z-20">
          <Card className="bg-card/95 backdrop-blur-2xl border-border/60 p-4 shadow-2xl">
            <div className="mb-3">
              <h2 className="text-lg font-semibold">Timbre Space EQ Visualizer</h2>
              <p className="text-xs text-muted-foreground">
                Real-time psychoacoustic & harmonic intelligence for exploratory music research
              </p>
            </div>
            <div className="space-y-3 text-sm text-muted-foreground">
              {PROJECT_SUMMARY_PARAGRAPHS.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
              <div>
                <h3 className="text-xs font-semibold tracking-wide text-foreground mb-1">Research links</h3>
                <ul className="space-y-1">
                  {RESEARCH_LINKS.map((link) => (
                    <li key={link.url}>
                      <a
                        href={link.url}
                        className="text-primary hover:underline"
                        target="_blank"
                        rel="noreferrer"
                      >
                        {link.title}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Card>
        </div>
      )}

      <div className="absolute top-20 left-4 pointer-events-none z-10 flex flex-wrap gap-3 items-start">
        <Card className="bg-card/80 backdrop-blur-xl border-border/50 p-3 w-52">
          <h3 className="text-xs font-semibold mb-1.5">Spectral Analysis</h3>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Centroid</span>
              <span className="font-mono">{Math.round(spectralCentroid)} Hz</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Rolloff</span>
              <span className="font-mono">{Math.round(spectralRolloff)} Hz</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Brightness</span>
              <span className="font-mono">{((spectralCentroid / 11025) * 100).toFixed(1)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Roughness</span>
              <span className="font-mono">{roughness.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">ZCR</span>
              <span className="font-mono">{(zeroCrossingRate * 100).toFixed(1)}%</span>
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

        <ChordDisplay className="bg-transparent" />
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
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={replay}
                    className="h-9 w-9 rounded-full"
                    disabled={!currentFileName || isLoading || isTranscribingLyrics}
                    title="Replay from beginning"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>

                  <div className="flex items-center gap-2 text-xs text-muted-foreground w-60">
                    <span className="font-mono w-12">{formatTime(effectiveCurrentTime)}</span>
                    <Slider
                      value={[Math.min(effectiveCurrentTime, timelineMax)]}
                      max={timelineMax}
                      step={0.01}
                      onValueChange={handleTimelineChange}
                      onValueCommit={handleTimelineCommit}
                      disabled={timelineDisabled}
                      className="flex-1"
                      aria-label="Timeline"
                    />
                    <span className="font-mono w-12 text-right">{formatTime(duration)}</span>
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

                  <div className="flex items-center gap-2">
                    <label htmlFor="lyrics-collapsed" className="text-xs text-muted-foreground cursor-pointer">
                      Lyrics
                    </label>
                    <Switch
                      id="lyrics-collapsed"
                      checked={showLyrics}
                      onCheckedChange={toggleLyrics}
                      className="scale-75"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <label htmlFor="water-collapsed" className="text-xs text-muted-foreground cursor-pointer">
                      Water
                    </label>
                    <Switch
                      id="water-collapsed"
                      checked={showWater}
                      onCheckedChange={toggleWater}
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
                    variant="ghost"
                    onClick={replay}
                    className="h-10 w-10 rounded-full"
                    disabled={!currentFileName || isLoading || isTranscribingLyrics}
                    title="Replay from beginning"
                  >
                    <RotateCcw className="h-4 w-4" />
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
                      size="icon"
                      variant="outline"
                      onClick={() => stemsInputRef.current?.click()}
                      className="h-10 w-10 rounded-full relative"
                      disabled={isLoading || isTranscribingLyrics}
                      title="Upload separated stems (vocals, drums, bass, other)"
                    >
                      <Upload className="h-4 w-4" />
                      {stemsLoaded && (
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />
                      )}
                    </Button>
                    <input
                      ref={stemsInputRef}
                      type="file"
                      accept="audio/wav,audio/mpeg,audio/mp3"
                      multiple
                      onChange={handleStemsUpload}
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

                  <div className="flex flex-col gap-1 w-60">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{formatTime(effectiveCurrentTime)}</span>
                      <span>{formatTime(duration)}</span>
                    </div>
                    <Slider
                      value={[Math.min(effectiveCurrentTime, timelineMax)]}
                      max={timelineMax}
                      step={0.01}
                      onValueChange={handleTimelineChange}
                      onValueCommit={handleTimelineCommit}
                      disabled={timelineDisabled}
                      aria-label="Timeline"
                    />
                  </div>

                  <div className="flex-1">
                    <EQControls />
                  </div>

                  <div className="flex-1">
                    <AdvancedControls />
                  </div>

                  {stemsLoaded && (
                    <div className="flex-1 border-l border-border/50 pl-4">
                      <div className="text-xs font-semibold mb-2 text-muted-foreground">
                        Stems ({Object.values(stems).filter(s => s !== null).length}/4)
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        {(["vocals", "drums", "bass", "other"] as const).map((stemType) => {
                          const stem = stems[stemType]

                          return (
                            <div key={stemType} className="flex flex-col gap-1">
                              <div className="flex items-center gap-2">
                                <Switch
                                  id={`stem-${stemType}`}
                                  checked={stem?.enabled ?? false}
                                  onCheckedChange={() => toggleStem(stemType)}
                                  disabled={!stem}
                                  className="scale-75"
                                />
                                <label
                                  htmlFor={`stem-${stemType}`}
                                  className={`text-xs cursor-pointer capitalize flex items-center gap-1 ${
                                    stem ? 'text-foreground' : 'text-muted-foreground'
                                  }`}
                                  title={stem?.fileName}
                                >
                                  {stemType}
                                  {stem && <span className="text-green-500 text-[10px]">✓</span>}
                                </label>
                              </div>
                              {stem && (
                                <Slider
                                  value={[stem.gainNode ? stem.gainNode.gain.value * 100 : 70]}
                                  onValueChange={([v]) => setStemVolume(stemType, v / 100)}
                                  max={100}
                                  step={1}
                                  disabled={!stem.enabled}
                                  className="h-1"
                                />
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
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

interface ResearchLink {
  title: string
  url: string
}

const PROJECT_SUMMARY_PARAGRAPHS = [
  "Timbre Space EQ Visualizer turns every instrument into a timbral node that moves through a 3D psychoacoustic field derived from brightness, warmth, depth, and energy cues.",
  "Real-time source separation plus feature clustering surfaces spectral content, rhythm descriptors, and evolving chord structures so researchers can correlate timbre, harmony, and predictability.",
  "Built-in Markov modeling maps transitions across the Circle of Fifths, quantifies harmonic entropy, and exports structured CSV/JSON snapshots for downstream ML training or analytical notebooks.",
]

const RESEARCH_LINKS: ResearchLink[] = [
  {
    title: "Realtime Generation of Harmonic Progressions Using Controlled Markov Models",
    url: "https://www.sfu.ca/~eigenfel/ControlledMarkovSelection.pdf",
  },
  {
    title: "Real-time Timbral Analysis for Musical and Visual Augmentation",
    url: "https://timbreandorchestration.org/writings/project-reports/real-time-timbral-analysis",
  },
  {
    title: "A Probabilistic Model for Chord Progressions - ISMIR 2005",
    url: "https://ismir2005.ismir.net/proceedings/1091.pdf",
  },
  {
    title: "An Exploration of Real-Time Visualizations of Musical Timbre",
    url: "https://cnmat.berkeley.edu/sites/default/files/attachments/2009_An_Exploration_of_Real-Time_Visualizations_of_Musical_Timbre.pdfs",
  },
]
