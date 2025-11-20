"use client"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Download, Sparkles } from "lucide-react"
import { useAudioStore } from "@/lib/audio-store"
import { useToast } from "@/hooks/use-toast"

const INSTRUMENTS = ["All", "Kick", "Snare", "Hi-Hat", "Bass", "Synth", "Vocal", "Guitar", "Piano"]

export default function AdvancedControls() {
  const {
    showTrails,
    isolatedInstrument,
    showClusters,
    showSpectralOverlay,
    showFrequencyGraph,
    aiDescription,
    toggleTrails,
    setIsolatedInstrument,
    toggleClusters,
    toggleSpectralOverlay,
    toggleFrequencyGraph,
    generateAIDescription,
    exportTimbreData,
  } = useAudioStore()

  const { toast } = useToast()

  const handleExport = () => {
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
      description: "Timbre analysis data has been downloaded.",
    })
  }

  const handleFrequencyToggle = () => {
    console.log("[v0] Toggling frequency graph - current state:", showFrequencyGraph)
    toggleFrequencyGraph()
    console.log("[v0] Frequency graph toggled - new state:", !showFrequencyGraph)
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold mb-4">Advanced Visualization</h3>

        <div className="space-y-4">
          {/* Timbre Trails */}
          <div className="flex items-center justify-between">
            <Label htmlFor="trails" className="text-sm">
              Timbre Trajectories
            </Label>
            <Switch id="trails" checked={showTrails} onCheckedChange={toggleTrails} />
          </div>

          {/* Dynamic Clustering */}
          <div className="flex items-center justify-between">
            <Label htmlFor="clusters" className="text-sm">
              Dynamic Clustering
            </Label>
            <Switch id="clusters" checked={showClusters} onCheckedChange={toggleClusters} />
          </div>

          {/* Spectral Overlay */}
          <div className="flex items-center justify-between">
            <Label htmlFor="spectral" className="text-sm">
              Spectral Waterfall
            </Label>
            <Switch id="spectral" checked={showSpectralOverlay} onCheckedChange={toggleSpectralOverlay} />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="frequency" className="text-sm">
              Frequency Graph
            </Label>
            <Switch id="frequency" checked={showFrequencyGraph} onCheckedChange={handleFrequencyToggle} />
          </div>

          {/* Instrument Isolation */}
          <div className="space-y-2">
            <Label htmlFor="instrument" className="text-sm">
              Isolate Instrument
            </Label>
            <Select
              value={isolatedInstrument || "All"}
              onValueChange={(value) => setIsolatedInstrument(value === "All" ? null : value)}
            >
              <SelectTrigger id="instrument">
                <SelectValue placeholder="All Instruments" />
              </SelectTrigger>
              <SelectContent>
                {INSTRUMENTS.map((inst) => (
                  <SelectItem key={inst} value={inst}>
                    {inst}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold">AI Analysis</h3>

        <Button onClick={generateAIDescription} variant="outline" className="w-full bg-transparent" size="sm">
          <Sparkles className="w-4 h-4 mr-2" />
          Generate Description
        </Button>

        {aiDescription && <div className="text-xs bg-muted p-3 rounded-md">{aiDescription}</div>}
      </div>

      <div>
        <Button onClick={handleExport} variant="outline" className="w-full bg-transparent" size="sm">
          <Download className="w-4 h-4 mr-2" />
          Export Analytics
        </Button>
      </div>
    </div>
  )
}
