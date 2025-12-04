"use client"

import { useMemo } from "react"
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
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

  // Prepare data for Graph 3: Chord Progression Stacked Area
  const chordProgressionData = useMemo(() => {
    // Group by time windows and count chord occurrences
    const windows: Record<number, Record<string, number>> = {}
    timeSeries.forEach((d) => {
      const window = Math.floor(d.time / 5) * 5 // 5-second windows
      if (!windows[window]) windows[window] = {}
      const chord = d.chord !== "---" ? d.chord : "Silence"
      windows[window][chord] = (windows[window][chord] || 0) + 1
    })
    
    return Object.entries(windows).map(([time, chords]) => ({
      time: Number(time),
      ...chords,
    }))
  }, [timeSeries])

  // Prepare data for Graph 4: Pattern Density Bar Chart
  const patternDensityData = useMemo(() => {
    const bins: Record<number, { sync: number; surprises: number; events: number }> = {}
    const binSize = 10 // 10-second bins
    
    patterns.syncMoments.forEach((m) => {
      const bin = Math.floor(m.time / binSize) * binSize
      if (!bins[bin]) bins[bin] = { sync: 0, surprises: 0, events: 0 }
      bins[bin].sync++
    })
    
    patterns.harmonicSurprises.forEach((s) => {
      const bin = Math.floor(s.time / binSize) * binSize
      if (!bins[bin]) bins[bin] = { sync: 0, surprises: 0, events: 0 }
      bins[bin].surprises++
    })
    
    patterns.timbralEvents.forEach((e) => {
      const bin = Math.floor(e.time / binSize) * binSize
      if (!bins[bin]) bins[bin] = { sync: 0, surprises: 0, events: 0 }
      bins[bin].events++
    })
    
    return Object.entries(bins)
      .map(([time, counts]) => ({
        time: `${Number(time)}-${Number(time) + binSize}s`,
        "Sync Moments": counts.sync,
        "Harmonic Surprises": counts.surprises,
        "Timbral Events": counts.events,
      }))
      .sort((a, b) => a.time.localeCompare(b.time))
  }, [patterns])

  // Prepare data for Radar Chart: Overall Musical Characteristics
  const radarData = [
    {
      subject: "Brightness",
      value: Math.min(1, (overallStatistics.syncIndex || 0) * 1.2),
      fullMark: 1,
    },
    {
      subject: "Complexity",
      value: Math.min(1, 1 - (overallStatistics.predictability || 0)),
      fullMark: 1,
    },
    {
      subject: "Harmony",
      value: Math.min(1, (overallStatistics.harmonicRhythm || 0) / 20),
      fullMark: 1,
    },
    {
      subject: "Diversity",
      value: Math.min(1, (overallStatistics.timbralSpread || 0) * 2),
      fullMark: 1,
    },
    {
      subject: "Coherence",
      value: Math.min(1, (overallStatistics.syncIndex || 0)),
      fullMark: 1,
    },
    {
      subject: "Activity",
      value: Math.min(1, (patterns.syncMoments.length + patterns.timbralEvents.length) / 50),
      fullMark: 1,
    },
  ]

  // Get sync moment times for markers (used in Graph 1)
  const syncMomentTimes = patterns.syncMoments.map((m) => m.time)

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

      {/* Graph 3: Chord Progression Stacked Area */}
      <Card className="p-4">
        <h3 className="text-lg font-semibold mb-4">Chord Progression Over Time</h3>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={chordProgressionData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="time" label={{ value: "Time (seconds)", position: "insideBottom", offset: -5 }} />
            <YAxis label={{ value: "Occurrences", angle: -90, position: "insideLeft" }} />
            <Tooltip />
            <Legend />
            {/* Dynamically render areas for each chord */}
            {Object.keys(chordProgressionData[0] || {})
              .filter((key) => key !== "time")
              .slice(0, 8) // Limit to top 8 chords to avoid clutter
              .map((chord, idx) => {
                const colors = [
                  "#3b82f6",
                  "#ef4444",
                  "#22c55e",
                  "#f59e0b",
                  "#a855f7",
                  "#06b6d4",
                  "#f97316",
                  "#84cc16",
                ]
                return (
                  <Area
                    key={chord}
                    type="monotone"
                    dataKey={chord}
                    stackId="1"
                    stroke={colors[idx % colors.length]}
                    fill={colors[idx % colors.length]}
                    fillOpacity={0.6}
                  />
                )
              })}
          </AreaChart>
        </ResponsiveContainer>
        <p className="text-xs text-muted-foreground mt-2">
          Shows chord distribution in 5-second windows. Top 8 most frequent chords displayed.
        </p>
      </Card>

      {/* Graph 4: Pattern Density Bar Chart */}
      <Card className="p-4">
        <h3 className="text-lg font-semibold mb-4">Pattern Density by Time Segment</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={patternDensityData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="time" angle={-45} textAnchor="end" height={80} />
            <YAxis label={{ value: "Count", angle: -90, position: "insideLeft" }} />
            <Tooltip />
            <Legend />
            <Bar dataKey="Sync Moments" stackId="a" fill="#f59e0b" />
            <Bar dataKey="Harmonic Surprises" stackId="a" fill="#ef4444" />
            <Bar dataKey="Timbral Events" stackId="a" fill="#06b6d4" />
          </BarChart>
        </ResponsiveContainer>
        <p className="text-xs text-muted-foreground mt-2">
          Stacked bars showing pattern occurrences in 10-second time segments.
        </p>
      </Card>

      {/* Graph 5: Hexagonal Radar Chart */}
      <Card className="p-4">
        <h3 className="text-lg font-semibold mb-4">Musical Characteristics Profile</h3>
        <ResponsiveContainer width="100%" height={400}>
          <RadarChart data={radarData}>
            <PolarGrid stroke="#e5e7eb" />
            <PolarAngleAxis
              dataKey="subject"
              tick={{ fill: "#6b7280", fontSize: 12 }}
              className="text-xs"
            />
            <PolarRadiusAxis
              angle={90}
              domain={[0, 1]}
              tick={{ fill: "#9ca3af", fontSize: 10 }}
            />
            <Radar
              name="Song Profile"
              dataKey="value"
              stroke="#3b82f6"
              fill="#3b82f6"
              fillOpacity={0.6}
              strokeWidth={2}
            />
            <Tooltip
              formatter={(value: number) => [(value * 100).toFixed(1) + "%", "Value"]}
            />
            <Legend />
          </RadarChart>
        </ResponsiveContainer>
        <p className="text-xs text-muted-foreground mt-2">
          Hexagonal radar chart showing overall musical characteristics. Each axis represents a different musical dimension.
        </p>
      </Card>
    </div>
  )
}

