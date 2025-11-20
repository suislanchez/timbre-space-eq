"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useAudioStore } from "@/lib/audio-store"
import { Piano, Guitar } from "lucide-react"

// Map notes to piano keys (one octave, starting at C)
const PIANO_NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]

// Map chords to their component notes
function getChordNotes(chord: string): string[] {
  if (!chord || chord === "---") return []

  const rootMatch = chord.match(/^([A-G]#?)/)
  if (!rootMatch) return []

  const root = rootMatch[1]
  const rootIndex = PIANO_NOTES.indexOf(root)
  if (rootIndex === -1) return []

  const notes = [root] // Always include root

  // Determine chord type and add intervals
  if (chord.includes("m7")) {
    // Minor 7th: root, minor 3rd, 5th, minor 7th
    notes.push(PIANO_NOTES[(rootIndex + 3) % 12])
    notes.push(PIANO_NOTES[(rootIndex + 7) % 12])
    notes.push(PIANO_NOTES[(rootIndex + 10) % 12])
  } else if (chord.includes("maj7") || chord.includes("M7")) {
    // Major 7th: root, major 3rd, 5th, major 7th
    notes.push(PIANO_NOTES[(rootIndex + 4) % 12])
    notes.push(PIANO_NOTES[(rootIndex + 7) % 12])
    notes.push(PIANO_NOTES[(rootIndex + 11) % 12])
  } else if (chord.includes("7")) {
    // Dominant 7th: root, major 3rd, 5th, minor 7th
    notes.push(PIANO_NOTES[(rootIndex + 4) % 12])
    notes.push(PIANO_NOTES[(rootIndex + 7) % 12])
    notes.push(PIANO_NOTES[(rootIndex + 10) % 12])
  } else if (chord.includes("m")) {
    // Minor: root, minor 3rd, 5th
    notes.push(PIANO_NOTES[(rootIndex + 3) % 12])
    notes.push(PIANO_NOTES[(rootIndex + 7) % 12])
  } else if (chord.includes("sus4")) {
    // Sus4: root, 4th, 5th
    notes.push(PIANO_NOTES[(rootIndex + 5) % 12])
    notes.push(PIANO_NOTES[(rootIndex + 7) % 12])
  } else if (chord.includes("sus2")) {
    // Sus2: root, 2nd, 5th
    notes.push(PIANO_NOTES[(rootIndex + 2) % 12])
    notes.push(PIANO_NOTES[(rootIndex + 7) % 12])
  } else if (chord.includes("dim")) {
    // Diminished: root, minor 3rd, diminished 5th
    notes.push(PIANO_NOTES[(rootIndex + 3) % 12])
    notes.push(PIANO_NOTES[(rootIndex + 6) % 12])
  } else if (chord.includes("aug")) {
    // Augmented: root, major 3rd, augmented 5th
    notes.push(PIANO_NOTES[(rootIndex + 4) % 12])
    notes.push(PIANO_NOTES[(rootIndex + 8) % 12])
  } else if (chord.match(/^[A-G]#?5$/)) {
    // Power chord: root, 5th
    notes.push(PIANO_NOTES[(rootIndex + 7) % 12])
  } else {
    // Major (default): root, major 3rd, 5th
    notes.push(PIANO_NOTES[(rootIndex + 4) % 12])
    notes.push(PIANO_NOTES[(rootIndex + 7) % 12])
  }

  return notes
}

// Map chords to guitar positions (strings from low to high: E A D G B e)
function getGuitarFrets(chord: string): Array<{ string: number; fret: number }> {
  if (!chord || chord === "---") return []

  const rootMatch = chord.match(/^([A-G]#?)/)
  if (!rootMatch) return []

  const root = rootMatch[1]

  // Common chord shapes (simplified - showing basic open and barre positions)
  const shapes: Record<string, Array<{ string: number; fret: number }>> = {
    C: [
      { string: 5, fret: 3 }, // A string, 3rd fret (C)
      { string: 4, fret: 2 }, // D string, 2nd fret (E)
      { string: 2, fret: 1 }, // B string, 1st fret (C)
    ],
    "C#": [
      { string: 5, fret: 4 },
      { string: 4, fret: 3 },
      { string: 3, fret: 1 },
      { string: 2, fret: 2 },
    ],
    D: [
      { string: 4, fret: 0 }, // D string open
      { string: 3, fret: 2 }, // G string, 2nd fret (A)
      { string: 2, fret: 3 }, // B string, 3rd fret (D)
      { string: 1, fret: 2 }, // e string, 2nd fret (F#)
    ],
    E: [
      { string: 6, fret: 0 }, // E string open
      { string: 5, fret: 2 }, // A string, 2nd fret (B)
      { string: 4, fret: 2 }, // D string, 2nd fret (E)
    ],
    Em: [
      { string: 6, fret: 0 },
      { string: 5, fret: 2 },
      { string: 4, fret: 2 },
    ],
    F: [
      { string: 6, fret: 1 },
      { string: 5, fret: 3 },
      { string: 4, fret: 3 },
      { string: 3, fret: 2 },
      { string: 2, fret: 1 },
      { string: 1, fret: 1 },
    ],
    G: [
      { string: 6, fret: 3 }, // E string, 3rd fret (G)
      { string: 5, fret: 2 }, // A string, 2nd fret (B)
      { string: 1, fret: 3 }, // e string, 3rd fret (G)
    ],
    A: [
      { string: 5, fret: 0 }, // A string open
      { string: 4, fret: 2 }, // D string, 2nd fret (E)
      { string: 3, fret: 2 }, // G string, 2nd fret (A)
      { string: 2, fret: 2 }, // B string, 2nd fret (C#)
    ],
    Am: [
      { string: 5, fret: 0 },
      { string: 4, fret: 2 },
      { string: 3, fret: 2 },
      { string: 2, fret: 1 },
    ],
  }

  // Try to find exact match or fallback to root
  return shapes[chord] || shapes[root] || []
}

export default function InstrumentVisualizer() {
  const [viewMode, setViewMode] = useState<"piano" | "guitar">("piano")
  const currentChord = useAudioStore((state) => state.currentChord)

  const activeNotes = getChordNotes(currentChord)
  const guitarFrets = getGuitarFrets(currentChord)

  return (
    <Card className="bg-card/90 backdrop-blur-xl border-border/50 p-3 w-64">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-semibold">Chord Visualization</h3>
        <div className="flex gap-1">
          <Button
            size="icon"
            variant={viewMode === "piano" ? "default" : "ghost"}
            onClick={() => setViewMode("piano")}
            className="h-6 w-6"
          >
            <Piano className="h-3 w-3" />
          </Button>
          <Button
            size="icon"
            variant={viewMode === "guitar" ? "default" : "ghost"}
            onClick={() => setViewMode("guitar")}
            className="h-6 w-6"
          >
            <Guitar className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {viewMode === "piano" ? (
        <div className="space-y-1">
          <div className="text-xs text-muted-foreground text-center mb-1">
            {currentChord === "---" ? "No chord detected" : currentChord}
          </div>
          {/* Piano keyboard - one octave */}
          <div className="flex h-20 border border-border rounded overflow-hidden">
            {PIANO_NOTES.map((note, index) => {
              const isBlack = note.includes("#")
              const isActive = activeNotes.includes(note)

              return (
                <div
                  key={note}
                  className="relative flex-1"
                  style={{ marginLeft: isBlack ? "-0.5rem" : "0", zIndex: isBlack ? 10 : 1 }}
                >
                  <div
                    className={`
                      h-full rounded-b transition-all duration-150
                      ${isBlack ? "bg-gray-900 w-6 border-r border-gray-700" : "bg-white border-r border-gray-300"}
                      ${isActive && !isBlack ? "bg-orange-100" : ""}
                      ${isActive && isBlack ? "bg-orange-700" : ""}
                    `}
                  >
                    {isActive && (
                      <div
                        className={`
                          absolute bottom-1 left-1/2 -translate-x-1/2
                          w-2 h-2 rounded-full
                          ${isBlack ? "bg-orange-400" : "bg-orange-500"}
                          shadow-lg animate-pulse
                        `}
                      />
                    )}
                  </div>
                  {!isBlack && (
                    <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 text-[8px] text-gray-500">{note}</div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <div className="space-y-1">
          <div className="text-xs text-muted-foreground text-center mb-1">
            {currentChord === "---" ? "No chord detected" : currentChord}
          </div>
          {/* Guitar fretboard - first 4 frets, 6 strings */}
          <div className="space-y-1.5">
            {[6, 5, 4, 3, 2, 1].map((stringNum) => (
              <div key={stringNum} className="flex items-center gap-1">
                <div className="text-[8px] text-muted-foreground w-3">
                  {["E", "A", "D", "G", "B", "e"][6 - stringNum]}
                </div>
                <div className="flex-1 h-1 bg-muted rounded-full relative">
                  {/* Fret markers */}
                  {[0, 1, 2, 3, 4].map((fret) => {
                    const isActive = guitarFrets.some((pos) => pos.string === stringNum && pos.fret === fret)

                    return (
                      <div key={fret} className="absolute top-1/2 -translate-y-1/2" style={{ left: `${fret * 22}%` }}>
                        {isActive && (
                          <div className="w-2.5 h-2.5 rounded-full bg-red-500 border-2 border-red-600 shadow-lg animate-pulse -translate-x-1/2 -translate-y-1/2" />
                        )}
                      </div>
                    )
                  })}
                  {/* Fret lines */}
                  {[1, 2, 3, 4].map((fret) => (
                    <div
                      key={fret}
                      className="absolute top-0 bottom-0 w-px bg-border"
                      style={{ left: `${fret * 22}%` }}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-around text-[8px] text-muted-foreground mt-1">
            <span>0</span>
            <span>1</span>
            <span>2</span>
            <span>3</span>
            <span>4</span>
          </div>
        </div>
      )}
    </Card>
  )
}
