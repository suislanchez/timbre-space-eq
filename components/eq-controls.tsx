"use client"

import { Slider } from "@/components/ui/slider"
import { useAudioStore } from "@/lib/audio-store"

const EQ_BANDS = [
  { label: "Sub Bass", freq: 60, id: "low" },
  { label: "Bass", freq: 250, id: "lowMid" },
  { label: "Midrange", freq: 1000, id: "mid" },
  { label: "Upper Mid", freq: 3000, id: "highMid" },
  { label: "Treble", freq: 8000, id: "high" },
]

export default function EQControls() {
  const { eqSettings, updateEQ } = useAudioStore()

  return (
    <div>
      <h3 className="text-sm font-semibold mb-4">{"Frequency Equalizer"}</h3>
      <div className="grid grid-cols-5 gap-6">
        {EQ_BANDS.map((band) => (
          <div key={band.id} className="space-y-3">
            <div className="text-center">
              <div className="text-xs font-medium text-foreground">{band.label}</div>
              <div className="text-xs text-muted-foreground">{band.freq}Hz</div>
            </div>
            <div className="flex flex-col items-center h-32">
              <Slider
                orientation="vertical"
                value={[eqSettings[band.id as keyof typeof eqSettings]]}
                onValueChange={([v]) => updateEQ(band.id as keyof typeof eqSettings, v)}
                min={-12}
                max={12}
                step={0.5}
                className="h-full"
              />
              <div className="text-xs text-muted-foreground mt-2">
                {eqSettings[band.id as keyof typeof eqSettings].toFixed(1)}dB
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
