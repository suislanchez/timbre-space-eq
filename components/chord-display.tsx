"use client"
import { useAudioStore } from "@/lib/audio-store"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

const CIRCLE_OF_FIFTHS = ["C", "G", "D", "A", "E", "B", "F#", "C#", "G#", "D#", "A#", "F"]

const NOTE_COLORS: Record<string, string> = {
  C: "#ef4444",
  "C#": "#f97316",
  D: "#f59e0b",
  "D#": "#eab308",
  E: "#84cc16",
  F: "#22c55e",
  "F#": "#10b981",
  G: "#14b8a6",
  "G#": "#06b6d4",
  A: "#0ea5e9",
  "A#": "#3b82f6",
  B: "#6366f1",
}

interface ChordDisplayProps {
  className?: string
}

export default function ChordDisplay({ className }: ChordDisplayProps = {}) {
  const currentChord = useAudioStore((state) => state.currentChord)
  const currentNote = useAudioStore((state) => state.currentNote)
  const songKey = useAudioStore((state) => state.songKey)
  const chordDegree = useAudioStore((state) => state.chordDegree)

  return (
    <div className={cn("flex gap-2 z-10 pointer-events-auto", className)}>
      <Card className="bg-card/80 backdrop-blur-xl border-border/50 p-3">
        <div className="text-xs text-muted-foreground mb-1">Song Key</div>
        <div className="text-2xl font-bold text-white font-mono">{songKey}</div>
      </Card>

      <Card className="bg-card/80 backdrop-blur-xl border-border/50 p-3">
        <div className="text-xs text-muted-foreground mb-1">Current Chord</div>
        <div className="text-2xl font-bold text-white font-mono">{currentChord}</div>
        {chordDegree !== "---" && (
          <div className="text-sm text-muted-foreground mt-1 font-serif italic">{chordDegree}</div>
        )}
      </Card>

      <Card className="bg-card/80 backdrop-blur-xl border-border/50 p-3">
        <div className="text-xs text-muted-foreground mb-2">Circle of Fifths</div>

        <div className="relative w-32 h-32">
          <svg viewBox="0 0 100 100" className="w-full h-full">
            {CIRCLE_OF_FIFTHS.map((note, index) => {
              const angle = (index * 30 - 90) * (Math.PI / 180)
              const x2 = 50 + 45 * Math.cos(angle)
              const y2 = 50 + 45 * Math.sin(angle)

              const isActive = note === currentNote

              return (
                <g key={note}>
                  {isActive && (
                    <circle cx={x2} cy={y2} r="8" fill={NOTE_COLORS[note]} opacity="0.3" className="animate-pulse" />
                  )}

                  <circle
                    cx={x2}
                    cy={y2}
                    r="6"
                    fill={isActive ? NOTE_COLORS[note] : "#374151"}
                    stroke={isActive ? NOTE_COLORS[note] : "#4b5563"}
                    strokeWidth={isActive ? "2" : "1"}
                    className={isActive ? "transition-all duration-200" : ""}
                  />

                  <text
                    x={x2}
                    y={y2}
                    textAnchor="middle"
                    dominantBaseline="central"
                    className="text-[6px] font-bold fill-white"
                    style={{ pointerEvents: "none" }}
                  >
                    {note}
                  </text>
                </g>
              )
            })}

            <circle cx="50" cy="50" r="20" fill="#1f2937" stroke="#374151" strokeWidth="1" />
            <text
              x="50"
              y="50"
              textAnchor="middle"
              dominantBaseline="central"
              className="text-[8px] font-bold fill-white"
            >
              {currentNote}
            </text>
          </svg>
        </div>
      </Card>
    </div>
  )
}
