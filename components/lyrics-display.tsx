"use client"

import { useAudioStore } from "@/lib/audio-store"
import { Card } from "@/components/ui/card"
import { useEffect, useState } from "react"

const CHORD_COLORS: Record<string, string> = {
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
  "A#": "#6366f1",
  B: "#8b5cf6",
}

function getChordColor(chord: string): string {
  if (chord === "---") return "#ffffff"
  const rootNote = chord.match(/^[A-G]#?/)?.[0] || ""
  return CHORD_COLORS[rootNote] || "#ffffff"
}

export default function LyricsDisplay() {
  const currentLyrics = useAudioStore((state) => state.currentLyrics)
  const isPlaying = useAudioStore((state) => state.isPlaying)
  const currentTime = useAudioStore((state) => state.currentTime)
  const lyricsData = useAudioStore((state) => state.lyricsData)
  const currentChord = useAudioStore((state) => state.currentChord)
  const spectralCentroid = useAudioStore((state) => state.spectralCentroid)
  const [displayLyrics, setDisplayLyrics] = useState(currentLyrics)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [countdown, setCountdown] = useState<number | null>(null)
  const [currentWordIndex, setCurrentWordIndex] = useState(0)

  useEffect(() => {
    if (isPlaying && lyricsData.length > 0) {
      const currentIndex = lyricsData.findIndex((lyric, idx) => {
        const nextLyric = lyricsData[idx + 1]
        return currentTime >= lyric.time && (!nextLyric || currentTime < nextLyric.time)
      })

      if (currentIndex !== -1) {
        setCountdown(null)

        const currentLyric = lyricsData[currentIndex].text

        if (currentLyric !== displayLyrics) {
          setIsTransitioning(true)
          setTimeout(() => {
            setDisplayLyrics(currentLyric)
            setIsTransitioning(false)
            setCurrentWordIndex(0)
          }, 100)
        } else {
          const lyricData = lyricsData[currentIndex]

          if (lyricData.words && lyricData.words.length > 0) {
            const currentWordIdx = lyricData.words.findIndex((word, idx) => {
              const nextWord = lyricData.words![idx + 1]
              return currentTime >= word.start && (!nextWord || currentTime < nextWord.start)
            })

            if (currentWordIdx !== -1) {
              setCurrentWordIndex(currentWordIdx)
            }
          } else {
            const timeSinceStart = currentTime - lyricData.time
            const nextLyricTime = lyricsData[currentIndex + 1]?.time || currentTime + 5
            const lyricDuration = nextLyricTime - lyricData.time
            const words = currentLyric.split(" ")
            const avgTimePerWord = lyricDuration / words.length
            const estimatedWordIndex = Math.floor(timeSinceStart / avgTimePerWord)
            setCurrentWordIndex(Math.min(estimatedWordIndex, words.length - 1))
          }
        }
      } else {
        const nextLyricIndex = lyricsData.findIndex((lyric) => lyric.time > currentTime)

        if (nextLyricIndex !== -1) {
          const nextLyric = lyricsData[nextLyricIndex]
          const timeUntilNext = nextLyric.time - currentTime

          if (timeUntilNext <= 3 && timeUntilNext > 0) {
            const countdownValue = Math.ceil(timeUntilNext)
            if (countdownValue !== countdown) {
              setCountdown(countdownValue)
              setDisplayLyrics(`${countdownValue}`)
              setIsTransitioning(true)
              setTimeout(() => setIsTransitioning(false), 100)
            }
          } else if (displayLyrics !== "♫ Instrumental ♫") {
            setCountdown(null)
            setDisplayLyrics("♫ Instrumental ♫")
            setIsTransitioning(true)
            setTimeout(() => setIsTransitioning(false), 150)
          }
        } else if (displayLyrics !== "♫ Instrumental ♫") {
          setCountdown(null)
          setDisplayLyrics("♫ Instrumental ♫")
          setIsTransitioning(true)
          setTimeout(() => setIsTransitioning(false), 150)
        }
      }
    } else if (currentLyrics !== displayLyrics) {
      setCountdown(null)
      setIsTransitioning(true)
      setTimeout(() => {
        setDisplayLyrics(currentLyrics)
        setIsTransitioning(false)
      }, 150)
    }
  }, [currentTime, isPlaying, lyricsData, currentLyrics, displayLyrics, countdown])

  const isActualLyric = !displayLyrics.startsWith("♪") && !displayLyrics.startsWith("♫") && countdown === null
  const isInstrumental = displayLyrics === "♫ Instrumental ♫"
  const isCountdown = countdown !== null

  const centroidNormalized = Math.min(spectralCentroid / 5000, 1)
  const dynamicFontSize = 1.8 + centroidNormalized * 1.2
  const dynamicBrightness = 0.8 + centroidNormalized * 0.2
  const chordColor = getChordColor(currentChord)

  const words = displayLyrics.split(" ")

  return (
    <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
      <Card className="bg-black/80 backdrop-blur-xl border-border/50 px-8 py-4 max-w-3xl">
        <div
          className={`text-center font-semibold transition-opacity duration-150 ${
            isTransitioning ? "opacity-50" : "opacity-100"
          } ${isCountdown ? "text-yellow-400 animate-pulse" : ""} ${isInstrumental ? "text-cyan-400/70 italic" : ""}`}
        >
          {words.map((word, idx) => {
            const isCurrentWord = idx === currentWordIndex && isPlaying && isActualLyric
            const isPastWord = idx < currentWordIndex && isPlaying && isActualLyric
            const isFutureWord = idx > currentWordIndex && isPlaying && isActualLyric

            return (
              <span
                key={`${word}-${idx}`}
                style={{
                  color: isCurrentWord
                    ? chordColor
                    : isPastWord
                      ? "#666666"
                      : isFutureWord
                        ? "#cccccc"
                        : isActualLyric
                          ? "#ffffff"
                          : undefined,
                  fontSize: isCurrentWord ? `${dynamicFontSize}rem` : isCountdown ? "3rem" : "1.5rem",
                  opacity: isCurrentWord ? dynamicBrightness : isPastWord ? 0.4 : isFutureWord ? 0.8 : 1,
                  display: "inline-block",
                  margin: "0 0.25em",
                  transition: "all 0.2s ease-out",
                  textShadow: isCurrentWord ? `0 0 16px ${chordColor}, 0 0 8px ${chordColor}` : "none",
                  fontWeight: isCurrentWord ? "bold" : "normal",
                  transform: isCurrentWord ? "scale(1.05)" : "scale(1)",
                }}
                className={!isActualLyric && !isCountdown ? "text-muted-foreground" : ""}
              >
                {word}
              </span>
            )
          })}
        </div>
        {isActualLyric && (
          <div className="text-xs text-center text-muted-foreground mt-2">Karaoke Mode • Synced Lyrics</div>
        )}
        {isCountdown && <div className="text-xs text-center text-yellow-400 mt-2">Get ready...</div>}
      </Card>
    </div>
  )
}
