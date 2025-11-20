"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChevronDown, ChevronUp } from "lucide-react"
import { useAudioStore } from "@/lib/audio-store"

export default function PredictabilityPanel() {
  const [isExpanded, setIsExpanded] = useState(false)
  const predictability = useAudioStore((state) => state.predictability)
  const chordTransitions = useAudioStore((state) => state.chordTransitions)

  // Calculate most common transitions
  const topTransitions = []
  for (const [fromChord, toChords] of chordTransitions.entries()) {
    for (const [toChord, count] of toChords.entries()) {
      topTransitions.push({ from: fromChord, to: toChord, count })
    }
  }
  topTransitions.sort((a, b) => b.count - a.count)
  const top5 = topTransitions.slice(0, 5)

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 w-96 z-10 pointer-events-auto">
      <Card className="bg-card/90 backdrop-blur-xl border-border/50">
        <div
          className="flex items-center justify-between p-3 cursor-pointer"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center gap-3">
            <div className="text-sm font-semibold">Predictability Analysis</div>
            <div className="text-xs text-muted-foreground">{(predictability * 100).toFixed(1)}% predictable</div>
          </div>
          <Button size="icon" variant="ghost" className="h-6 w-6">
            {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </Button>
        </div>

        {isExpanded && (
          <div className="px-3 pb-3 space-y-3 border-t border-border/50 pt-3">
            <div>
              <div className="text-xs font-medium mb-2">Markov Chain Analysis</div>
              <div className="text-xs text-muted-foreground mb-2">
                Chord transitions observed: {chordTransitions.size}
              </div>

              <div className="w-full bg-muted rounded-full h-2 mb-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all"
                  style={{ width: `${predictability * 100}%` }}
                />
              </div>

              <div className="text-xs text-muted-foreground">
                {predictability > 0.7 && "High predictability - conventional chord progressions"}
                {predictability > 0.4 && predictability <= 0.7 && "Moderate predictability - balanced variety"}
                {predictability <= 0.4 && "Low predictability - unconventional progressions"}
              </div>
            </div>

            {top5.length > 0 && (
              <div>
                <div className="text-xs font-medium mb-2">Most Common Transitions</div>
                <div className="space-y-1">
                  {top5.map((trans, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs">
                      <span className="font-mono">
                        {trans.from} → {trans.to}
                      </span>
                      <span className="text-muted-foreground">{trans.count}x</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-2 border-t border-border/50">
              <div className="text-xs text-muted-foreground">
                Empirical entropy: {(-Math.log2(Math.max(0.001, 1 - predictability))).toFixed(2)} bits
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
