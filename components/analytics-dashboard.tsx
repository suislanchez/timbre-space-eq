"use client"

import { useMemo } from "react"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts"
import { useAudioStore } from "@/lib/audio-store"
import { Card } from "@/components/ui/card"

interface AnalyticsDashboardProps {
  onClose?: () => void
}

export default function AnalyticsDashboard({ onClose }: AnalyticsDashboardProps) {
  const exportComprehensiveAnalysis = useAudioStore((state) => state.exportComprehensiveAnalysis)
  
  const analysisData = useMemo(() => {
    try {
      return exportComprehensiveAnalysis()
    } catch (error) {
      console.error("[v0] Error generating analysis data:", error)
      return null
    }
  }, [exportComprehensiveAnalysis])

  if (!analysisData || !analysisData.timeSeries || analysisData.timeSeries.length === 0) {
    return (
      <Card className="p-6">
        <p className="text-muted-foreground">No analysis data available. Please play a song to generate analytics.</p>
      </Card>
    )
  }

  const { timeSeries, overallStatistics, patterns } = analysisData

  // Prepare data for Graph 1: Timbral-Harmonic Synchronization
  const syncData = timeSeries.map((d) => ({
    time: d.time,
    spectralCentroid: d.spectralCentroid,
    harmonicEnergy: d.harmonicEnergy,
    timbralVariance: d.timbralVariance,
    syncIndex: d.syncIndex,
  }))

  // Prepare data for Graph 2: Instrument Energy Timeline
  const instrumentData = timeSeries.map((d) => ({
    time: d.time,
    ...d.instrumentEnergies,
  }))

  // Prepare data for Graph 3: Harmonic Complexity
  const harmonicData = timeSeries.map((d, idx) => {
    const prev = idx > 0 ? timeSeries[idx - 1] : d
    const chordChanged = d.chord !== prev.chord && d.chord !== "---" ? 1 : 0
    return {
      time: d.time,
      chordChangeRate: chordChanged,
      keyStability: overallStatistics.keyStability || 0,
      harmonicEntropy: d.harmonicEnergy * 0.5, // Simplified
    }
  })

  // Prepare data for Graph 4: Sync Index Over Time
  const syncIndexData = timeSeries.map((d) => ({
    time: d.time,
    syncIndex: d.syncIndex,
  }))

  // Get sync moment times for markers
  const syncMomentTimes = patterns.syncMoments.map((m) => m.time)
  const surpriseTimes = patterns.harmonicSurprises.map((s) => s.time)
  const timbralEventTimes = patterns.timbralEvents.map((e) => e.time)

  return (
    <div className="space-y-6 p-6 max-h-[90vh] overflow-y-auto">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Analytics Dashboard</h2>
        {onClose && (
          <button
            onClick={onClose}
            className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80"
          >
            Close
          </button>
        )}
      </div>

      {/* Statistics Panel */}
      <Card className="p-4">
        <h3 className="text-lg font-semibold mb-4">Overall Statistics</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Sync Index</p>
            <p className="text-2xl font-bold">
              {overallStatistics.syncIndex?.toFixed(3) || "N/A"}
            </p>
            <p className="text-xs text-muted-foreground">
              {overallStatistics.syncIndex && overallStatistics.syncIndex > 0.5
                ? "High coherence"
                : "Complex"}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Timbral Spread</p>
            <p className="text-2xl font-bold">
              {overallStatistics.timbralSpread?.toFixed(3) || "N/A"}
            </p>
            <p className="text-xs text-muted-foreground">
              {overallStatistics.timbralSpread && overallStatistics.timbralSpread > 0.3
                ? "Diverse"
                : "Focused"}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Harmonic Rhythm</p>
            <p className="text-2xl font-bold">
              {overallStatistics.harmonicRhythm?.toFixed(1) || "N/A"}
            </p>
            <p className="text-xs text-muted-foreground">changes/min</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Predictability</p>
            <p className="text-2xl font-bold">
              {overallStatistics.predictability?.toFixed(3) || "N/A"}
            </p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Sync Moments</p>
            <p className="text-xl font-semibold">{patterns.syncMoments.length}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Harmonic Surprises</p>
            <p className="text-xl font-semibold">{patterns.harmonicSurprises.length}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Timbral Events</p>
            <p className="text-xl font-semibold">{patterns.timbralEvents.length}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Structural Boundaries</p>
            <p className="text-xl font-semibold">{patterns.structuralBoundaries.length}</p>
          </div>
        </div>
      </Card>

      {/* Graph 1: Timbral-Harmonic Synchronization */}
      <Card className="p-4">
        <h3 className="text-lg font-semibold mb-4">Timbral-Harmonic Synchronization Over Time</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={syncData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="time" label={{ value: "Time (seconds)", position: "insideBottom", offset: -5 }} />
            <YAxis label={{ value: "Normalized Value", angle: -90, position: "insideLeft" }} />
            <Tooltip />
            <Legend />
            <Line
              type="monotone"
              dataKey="spectralCentroid"
              stroke="#3b82f6"
              name="Spectral Centroid"
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="harmonicEnergy"
              stroke="#ef4444"
              name="Harmonic Energy"
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="timbralVariance"
              stroke="#22c55e"
              name="Timbral Variance"
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="syncIndex"
              stroke="#a855f7"
              name="Sync Index"
              strokeWidth={2}
              dot={false}
            />
            {syncMomentTimes.map((time) => (
              <ReferenceLine key={time} x={time} stroke="#f59e0b" strokeDasharray="2 2" />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </Card>

      {/* Graph 2: Instrument Energy Timeline */}
      <Card className="p-4">
        <h3 className="text-lg font-semibold mb-4">Instrument Energy Over Time</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={instrumentData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="time" label={{ value: "Time (seconds)", position: "insideBottom", offset: -5 }} />
            <YAxis label={{ value: "Energy", angle: -90, position: "insideLeft" }} />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="Kick" stroke="#8b5cf6" name="Kick" dot={false} />
            <Line type="monotone" dataKey="Snare" stroke="#ec4899" name="Snare" dot={false} />
            <Line type="monotone" dataKey="Bass" stroke="#06b6d4" name="Bass" dot={false} />
            <Line type="monotone" dataKey="Vocal" stroke="#f59e0b" name="Vocal" dot={false} />
            <Line type="monotone" dataKey="Guitar" stroke="#10b981" name="Guitar" dot={false} />
            <Line type="monotone" dataKey="Piano" stroke="#6366f1" name="Piano" dot={false} />
            <Line type="monotone" dataKey="Synth" stroke="#f97316" name="Synth" dot={false} />
            <Line type="monotone" dataKey="Hi-Hat" stroke="#84cc16" name="Hi-Hat" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      {/* Graph 3: Harmonic Complexity */}
      <Card className="p-4">
        <h3 className="text-lg font-semibold mb-4">Harmonic Complexity Over Time</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={harmonicData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="time" label={{ value: "Time (seconds)", position: "insideBottom", offset: -5 }} />
            <YAxis label={{ value: "Complexity", angle: -90, position: "insideLeft" }} />
            <Tooltip />
            <Legend />
            <Line
              type="monotone"
              dataKey="chordChangeRate"
              stroke="#ef4444"
              name="Chord Change Rate"
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="keyStability"
              stroke="#3b82f6"
              name="Key Stability"
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="harmonicEntropy"
              stroke="#22c55e"
              name="Harmonic Entropy"
              dot={false}
            />
            {surpriseTimes.map((time) => (
              <ReferenceLine key={time} x={time} stroke="#f59e0b" strokeDasharray="2 2" />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </Card>

      {/* Graph 4: Sync Index Over Time */}
      <Card className="p-4">
        <h3 className="text-lg font-semibold mb-4">Sync Index Over Time</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={syncIndexData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="time" label={{ value: "Time (seconds)", position: "insideBottom", offset: -5 }} />
            <YAxis label={{ value: "Sync Index", angle: -90, position: "insideLeft" }} />
            <Tooltip />
            <Legend />
            <Line
              type="monotone"
              dataKey="syncIndex"
              stroke="#a855f7"
              name="Sync Index"
              strokeWidth={2}
              dot={false}
            />
            {syncMomentTimes.map((time) => (
              <ReferenceLine key={time} x={time} stroke="#f59e0b" strokeDasharray="2 2" />
            ))}
            {timbralEventTimes.map((time) => (
              <ReferenceLine key={time} x={time} stroke="#06b6d4" strokeDasharray="1 1" />
            ))}
          </LineChart>
        </ResponsiveContainer>
        <div className="mt-2 text-xs text-muted-foreground">
          <span className="inline-block w-4 h-0.5 bg-[#f59e0b] mr-1"></span> Sync Moments
          <span className="inline-block w-4 h-0.5 bg-[#06b6d4] ml-4 mr-1"></span> Timbral Events
        </div>
      </Card>
    </div>
  )
}

