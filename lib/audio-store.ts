import { create } from "zustand"

interface TimbreFeatures {
  spectralCentroid: number
  spectralRolloff: number
  roughness: number
  brightness: number
  zcr: number // Zero-crossing rate
}

interface InstrumentTimbre {
  name: string
  features: TimbreFeatures
  energy: number
  trajectory: Array<[number, number, number]> // 3D position history
}

interface StemTrack {
  element: HTMLAudioElement
  enabled: boolean
  fileName: string
  source: MediaElementAudioSourceNode | null
  gainNode: GainNode | null
  analyser: AnalyserNode | null
}

interface AudioStore {
  audioContext: AudioContext | null
  analyser: AnalyserNode | null
  audioElement: HTMLAudioElement | null
  source: MediaElementAudioSourceNode | null
  frequencyData: Uint8Array | null
  timeData: Uint8Array | null // Added for waveform analysis
  isPlaying: boolean
  volume: number
  currentFileName: string | null
  stems: {
    vocals: StemTrack | null
    drums: StemTrack | null
    bass: StemTrack | null
    other: StemTrack | null
  }
  eqSettings: {
    low: number
    lowMid: number
    mid: number
    highMid: number
    high: number
  }
  eqFilters: BiquadFilterNode[]
  timbreFeatures: Map<string, InstrumentTimbre>
  showTrails: boolean
  isolatedInstrument: string | null
  showClusters: boolean
  showSpectralOverlay: boolean
  aiDescription: string
  currentTime: number
  duration: number
  spectralCentroid: number
  spectralRolloff: number
  roughness: number
  zeroCrossingRate: number
  currentChord: string
  currentNote: string
  currentLyrics: string // Added lyrics support for karaoke display
  lyricsData: Array<{ time: number; text: string; words?: Array<{ word: string; start: number; end: number }> }> // Added timestamped lyrics array
  lyricUpdateInterval: number | null // Added interval ID for cleanup
  songKey: string // Added key detection and chord degree
  chordDegree: string // Added key detection and chord degree
  isTranscribingLyrics: boolean // Added for TTS lyrics generation
  transcriptionProgress: number // Added progress tracking
  rhythmMetrics: {
    tempo: number
    beatStrength: number
    syncopation: number
  }
  chordTransitions: Map<string, Map<string, number>>
  predictability: number
  showFrequencyGraph: boolean
  showKrumhanslMap: boolean
  showLyrics: boolean
  showWater: boolean
  dynamicParticles: Array<{
    id: string
    name: string
    color: string
    position: [number, number, number]
    freqRange: [number, number]
    createdAt: number
    lastActive: number
    isActive: boolean
  }>
  analysisHistory: Array<{
    time: number
    spectralCentroid: number
    spectralRolloff: number
    roughness: number
    zeroCrossingRate: number
    chord: string
    chordDegree: string
    tempo: number
    beatStrength: number
    instrumentEnergies: Record<string, number>
  }>
  seekTo: (positionSeconds: number) => void
  replay: () => void
  ensureAudioContext: () => Promise<void>
}

function calculateSpectralCentroid(frequencyData: Uint8Array, sampleRate: number): number {
  let weightedSum = 0
  let sum = 0
  for (let i = 0; i < frequencyData.length; i++) {
    const freq = (i * sampleRate) / (2 * frequencyData.length)
    weightedSum += freq * frequencyData[i]
    sum += frequencyData[i]
  }
  return sum > 0 ? weightedSum / sum : 0
}

function calculateSpectralRolloff(frequencyData: Uint8Array, sampleRate: number, threshold = 0.85): number {
  const totalEnergy = frequencyData.reduce((sum, val) => sum + val, 0)
  const targetEnergy = totalEnergy * threshold
  let cumulativeEnergy = 0
  for (let i = 0; i < frequencyData.length; i++) {
    cumulativeEnergy += frequencyData[i]
    if (cumulativeEnergy >= targetEnergy) {
      return (i * sampleRate) / (2 * frequencyData.length)
    }
  }
  return sampleRate / 2
}

function calculateRoughness(frequencyData: Uint8Array): number {
  let roughness = 0
  for (let i = 1; i < frequencyData.length; i++) {
    roughness += Math.abs(frequencyData[i] - frequencyData[i - 1])
  }
  return roughness / frequencyData.length
}

function calculateZeroCrossingRate(timeData: Uint8Array): number {
  if (timeData.length < 2) return 0
  
  let zeroCrossings = 0
  const center = 128 // Uint8Array center value (0-255 range)
  
  for (let i = 1; i < timeData.length; i++) {
    const prev = timeData[i - 1] - center
    const curr = timeData[i] - center
    
    // Count sign changes (zero crossings)
    if ((prev >= 0 && curr < 0) || (prev < 0 && curr >= 0)) {
      zeroCrossings++
    }
  }
  
  // Return crossings per second (normalized by buffer length)
  return zeroCrossings / timeData.length
}

const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]

function frequencyToNote(frequency: number): string {
  if (frequency < 20) return "---"
  const noteNum = 12 * Math.log2(frequency / 440) + 49
  const octave = Math.floor(noteNum / 12)
  const note = Math.round(noteNum) % 12
  return NOTE_NAMES[note]
}

function detectChord(frequencyData: Uint8Array, sampleRate: number): { chord: string; rootNote: string } {
  // Find peaks in frequency spectrum
  const peaks: Array<{ freq: number; magnitude: number }> = []
  const threshold = 100

  for (let i = 5; i < frequencyData.length / 4; i++) {
    if (
      frequencyData[i] > threshold &&
      frequencyData[i] > frequencyData[i - 1] &&
      frequencyData[i] > frequencyData[i + 1]
    ) {
      const freq = (i * sampleRate) / (2 * frequencyData.length)
      peaks.push({ freq, magnitude: frequencyData[i] })
    }
  }

  if (peaks.length === 0) return { chord: "---", rootNote: "---" }

  // Sort by magnitude and take top 5
  peaks.sort((a, b) => b.magnitude - a.magnitude)
  const topPeaks = peaks.slice(0, 5)

  // Convert to notes
  const notes = topPeaks.map((p) => frequencyToNote(p.freq))
  const uniqueNotes = [...new Set(notes)]

  if (uniqueNotes.length === 0) return { chord: "---", rootNote: "---" }

  const rootNote = uniqueNotes[0]

  // Simple chord detection based on number of unique notes
  if (uniqueNotes.length === 1) {
    return { chord: rootNote, rootNote }
  } else if (uniqueNotes.length === 2) {
    return { chord: `${rootNote}5`, rootNote } // Power chord
  } else if (uniqueNotes.length === 3) {
    // Check for major/minor patterns
    const hasMinorThird = uniqueNotes.some((n) => {
      const rootIdx = NOTE_NAMES.indexOf(rootNote)
      const noteIdx = NOTE_NAMES.indexOf(n)
      return (noteIdx - rootIdx + 12) % 12 === 3
    })
    const hasMajorThird = uniqueNotes.some((n) => {
      const rootIdx = NOTE_NAMES.indexOf(rootNote)
      const noteIdx = NOTE_NAMES.indexOf(n)
      return (noteIdx - rootIdx + 12) % 12 === 4
    })

    if (hasMinorThird) return { chord: `${rootNote}m`, rootNote }
    if (hasMajorThird) return { chord: rootNote, rootNote }
    return { chord: `${rootNote}sus`, rootNote }
  } else {
    // 4+ notes - check for 7th chords
    const hasSeventh = uniqueNotes.some((n) => {
      const rootIdx = NOTE_NAMES.indexOf(rootNote)
      const noteIdx = NOTE_NAMES.indexOf(n)
      const interval = (noteIdx - rootIdx + 12) % 12
      return interval === 10 || interval === 11
    })

    const hasMinorThird = uniqueNotes.some((n) => {
      const rootIdx = NOTE_NAMES.indexOf(rootNote)
      const noteIdx = NOTE_NAMES.indexOf(n)
      return (noteIdx - rootIdx + 12) % 12 === 3
    })

    if (hasSeventh && hasMinorThird) return { chord: `${rootNote}m7`, rootNote }
    if (hasSeventh) return { chord: `${rootNote}7`, rootNote }
    return { chord: `${rootNote}add9`, rootNote }
  }
}

let chordHistory: Array<{ chord: string; note: string; timestamp: number }> = []
const CHORD_CHANGE_THRESHOLD = 800 // ms - only update chord if it's stable for this duration


function detectKey(chordHistory: Array<{ chord: string; note: string }>): string {
  if (chordHistory.length < 10) return "---"

  // Count occurrences of each root note
  const noteCounts = new Map<string, number>()
  chordHistory.forEach((h) => {
    if (h.note !== "---") {
      noteCounts.set(h.note, (noteCounts.get(h.note) || 0) + 1)
    }
  })

  // Find most common note (likely the tonic)
  let maxCount = 0
  let tonic = "---"
  for (const [note, count] of noteCounts.entries()) {
    if (count > maxCount) {
      maxCount = count
      tonic = note
    }
  }

  return tonic
}

function getChordDegree(chord: string, key: string): string {
  if (chord === "---" || key === "---") return "---"

  const rootNote = chord.match(/^[A-G]#?/)?.[0] || ""
  if (!rootNote) return "---"

  const keyIndex = NOTE_NAMES.indexOf(key)
  const chordIndex = NOTE_NAMES.indexOf(rootNote)

  if (keyIndex === -1 || chordIndex === -1) return "---"

  const degree = (chordIndex - keyIndex + 12) % 12
  const romanNumerals = ["I", "♭II", "II", "♭III", "III", "IV", "♭V", "V", "♭VI", "VI", "♭VII", "VII"]

  const isMinor = chord.includes("m") && !chord.includes("maj")
  let numeral = romanNumerals[degree]

  // Make minor chords lowercase
  if (isMinor && degree !== 0) {
    numeral = numeral.toLowerCase()
  }

  return numeral
}

function calculateRhythmMetrics(
  timeData: Uint8Array,
  frequencyData: Uint8Array,
): {
  tempo: number
  beatStrength: number
  syncopation: number
} {
  // Calculate energy from time domain
  let energy = 0
  for (let i = 0; i < timeData.length; i++) {
    const normalized = (timeData[i] - 128) / 128
    energy += normalized * normalized
  }
  energy = energy / timeData.length

  // Estimate tempo using autocorrelation on low frequencies
  const lowFreqEnergy = frequencyData.slice(0, 10).reduce((sum, val) => sum + val, 0) / 10
  const tempo = Math.round(60 + lowFreqEnergy * 0.5) // Simplified tempo estimation

  // Beat strength based on low frequency energy
  const beatStrength = Math.min(1, lowFreqEnergy / 150)

  // Syncopation based on variation in mid-range frequencies
  let variation = 0
  for (let i = 1; i < 50; i++) {
    variation += Math.abs(frequencyData[i] - frequencyData[i - 1])
  }
  const syncopation = Math.min(1, variation / 5000)

  return { tempo, beatStrength, syncopation }
}

function bufferToWave(abuffer: AudioBuffer, len: number): Blob {
  const numOfChan = abuffer.numberOfChannels
  const length = len * numOfChan * 2 + 44
  const buffer = new ArrayBuffer(length)
  const view = new DataView(buffer)
  const channels = []
  let sample: number
  let offset = 0
  let pos = 0

  // Write WAV header
  setUint32(0x46464952) // "RIFF"
  setUint32(length - 8) // file length - 8
  setUint32(0x45564157) // "WAVE"

  setUint32(0x20746d66) // "fmt " chunk
  setUint32(16) // length = 16
  setUint16(1) // PCM (uncompressed)
  setUint16(numOfChan)
  setUint32(abuffer.sampleRate)
  setUint32(abuffer.sampleRate * 2 * numOfChan) // avg. bytes/sec
  setUint16(numOfChan * 2) // block-align
  setUint16(16) // 16-bit

  setUint32(0x61746164) // "data" - chunk
  setUint32(length - pos - 4) // chunk length

  // Write interleaved data
  for (let i = 0; i < abuffer.numberOfChannels; i++) {
    channels.push(abuffer.getChannelData(i))
  }

  while (pos < length) {
    for (let i = 0; i < numOfChan; i++) {
      sample = Math.max(-1, Math.min(1, channels[i][offset])) // clamp
      sample = sample < 0 ? sample * 0x8000 : sample * 0x7fff // scale to 16-bit signed int
      view.setInt16(pos, sample, true) // write 16-bit sample
      pos += 2
    }
    offset++ // next source sample
  }

  return new Blob([buffer], { type: "audio/wav" })

  function setUint16(data: number) {
    view.setUint16(pos, data, true)
    pos += 2
  }

  function setUint32(data: number) {
    view.setUint32(pos, data, true)
    pos += 4
  }
}

export const useAudioStore = create<AudioStore>((set, get) => ({
  audioContext: null,
  analyser: null,
  audioElement: null,
  source: null,
  frequencyData: null,
  timeData: null, // Added
  isPlaying: false,
  volume: 0.7,
  currentFileName: null,
  eqSettings: {
    low: 0,
    lowMid: 0,
    mid: 0,
    highMid: 0,
    high: 0,
  },
  eqFilters: [],
  timbreFeatures: new Map(),
  showTrails: false,
  isolatedInstrument: null,
  showClusters: false,
  showSpectralOverlay: false,
  aiDescription: "",
  currentTime: 0,
  duration: 0,
  spectralCentroid: 0,
  spectralRolloff: 0,
  roughness: 0,
  zeroCrossingRate: 0,
  currentChord: "---",
  currentNote: "---",
  currentLyrics: "♪ Play audio to start",
  lyricsData: [], // Initialize with empty array
  lyricUpdateInterval: null, // Initialize interval ID
  songKey: "---", // Initialize new fields
  chordDegree: "---", // Initialize new fields
  isTranscribingLyrics: false, // Initialize new fields
  transcriptionProgress: 0, // Initialize progress
  rhythmMetrics: {
    tempo: 120,
    beatStrength: 0,
    syncopation: 0,
  },
  chordTransitions: new Map(),
  predictability: 0,
  showFrequencyGraph: false,
  showKrumhanslMap: false,
  showLyrics: false,
  showWater: false,
  dynamicParticles: [], // Initialize dynamic particles array
  analysisHistory: [], // Initialize analysis history
  stems: {
    vocals: null,
    drums: null,
    bass: null,
    other: null,
  },

  initAudio: () => {
    if (typeof window === "undefined") return

    // Don't create AudioContext here - it requires user gesture
    // Just initialize the audio element and event listeners
    const audioElement = new Audio()
    audioElement.crossOrigin = "anonymous"

    audioElement.addEventListener("timeupdate", () => {
      const currentTime = audioElement.currentTime
      const duration = audioElement.duration || 0

      set({ currentTime, duration })

      // Sync all enabled stems with main audio time
      const { stems, isPlaying } = get()
      if (isPlaying) {
        Object.values(stems).forEach((stem) => {
          if (stem && stem.enabled) {
            // Only sync if drift is significant (> 0.1 seconds)
            const drift = Math.abs(stem.element.currentTime - currentTime)
            if (drift > 0.1) {
              stem.element.currentTime = currentTime
            }
          }
        })
      }

      // Update lyrics based on timestamp
      const { lyricsData } = get()
      const currentLyric = lyricsData.filter((lyric) => lyric.time <= currentTime).sort((a, b) => b.time - a.time)[0]

      if (currentLyric && get().isPlaying) {
        set({ currentLyrics: currentLyric.text })
      }
    })

    audioElement.addEventListener("loadedmetadata", () => {
      set({ duration: audioElement.duration || 0 })
    })

    set({
      audioElement,
    })
  },

  ensureAudioContext: async () => {
    if (typeof window === "undefined") return Promise.resolve()

    let { audioContext, audioElement, analyser, source, eqFilters } = get()

    // If AudioContext doesn't exist, create it (lazy initialization on user gesture)
    if (!audioContext) {
      audioContext = new AudioContext()
      analyser = audioContext.createAnalyser()
      analyser.fftSize = 2048
      analyser.smoothingTimeConstant = 0.8

      if (!audioElement) {
        audioElement = new Audio()
        audioElement.crossOrigin = "anonymous"
      }

      source = audioContext.createMediaElementSource(audioElement)
      const gainNode = audioContext.createGain()
      gainNode.gain.value = 0.7

      // Create EQ filters with current settings
      const { eqSettings } = get()
      const frequencies = [60, 250, 1000, 3000, 8000]
      const eqBands: (keyof AudioStore["eqSettings"])[] = ["low", "lowMid", "mid", "highMid", "high"]
      eqFilters = frequencies.map((freq, index) => {
        const filter = audioContext!.createBiquadFilter()
        filter.type = "peaking"
        filter.frequency.value = freq
        filter.Q.value = 1
        filter.gain.value = eqSettings[eqBands[index]] || 0
        return filter
      })

      // Connect audio graph
      source.connect(eqFilters[0])
      for (let i = 0; i < eqFilters.length - 1; i++) {
        eqFilters[i].connect(eqFilters[i + 1])
      }
      eqFilters[eqFilters.length - 1].connect(gainNode)
      gainNode.connect(analyser)
      analyser.connect(audioContext.destination)

      const frequencyData = new Uint8Array(analyser.frequencyBinCount)
      const timeData = new Uint8Array(analyser.frequencyBinCount)

      const updateData = () => {
        if (!analyser || !audioContext) return

        analyser.getByteFrequencyData(frequencyData)
        analyser.getByteTimeDomainData(timeData)

        // Merge frequency data from enabled stems
        try {
          const { stems } = get()
          const enabledStems = Object.values(stems).filter(s => s && s.enabled && s.analyser)
          
          if (enabledStems.length > 0) {
            const stemFrequencyData = new Uint8Array(analyser.frequencyBinCount)
            let stemCount = 0
            
            enabledStems.forEach(stem => {
              if (stem && stem.analyser) {
                try {
                  const stemData = new Uint8Array(stem.analyser.frequencyBinCount)
                  stem.analyser.getByteFrequencyData(stemData)
                  
                  // Add stem data to merged array
                  const minLength = Math.min(stemData.length, stemFrequencyData.length)
                  for (let i = 0; i < minLength; i++) {
                    stemFrequencyData[i] += stemData[i]
                  }
                  stemCount++
                } catch (error) {
                  console.warn("[v0] Error reading stem frequency data:", error)
                }
              }
            })
            
            // Average the stem data and blend with main audio
            if (stemCount > 0) {
              for (let i = 0; i < frequencyData.length; i++) {
                const avgStemValue = stemFrequencyData[i] / stemCount
                // Blend 70% stems, 30% main audio
                frequencyData[i] = Math.round(avgStemValue * 0.7 + frequencyData[i] * 0.3)
              }
            }
          }
        } catch (error) {
          console.warn("[v0] Error merging stem frequency data:", error)
        }

        const sampleRate = audioContext.sampleRate
      const spectralCentroid = calculateSpectralCentroid(frequencyData, sampleRate)
      const spectralRolloff = calculateSpectralRolloff(frequencyData, sampleRate)
      const roughness = calculateRoughness(frequencyData)
      const zeroCrossingRate = calculateZeroCrossingRate(timeData)

      const rhythmMetrics = calculateRhythmMetrics(timeData, frequencyData)

      const { chord, rootNote } = detectChord(frequencyData, sampleRate)
      const now = Date.now()

      chordHistory.push({ chord, note: rootNote, timestamp: now })
      chordHistory = chordHistory.filter((h) => now - h.timestamp < 2000)

      // Update chord transitions for Markov chain
      if (chordHistory.length > 1) {
        const prevChord = chordHistory[chordHistory.length - 2].chord
        const currChord = chordHistory[chordHistory.length - 1].chord

        // Only track meaningful chord changes
        if (prevChord !== "---" && currChord !== "---" && prevChord !== currChord) {
          const transitions = get().chordTransitions
          if (!transitions.has(prevChord)) {
            transitions.set(prevChord, new Map())
          }
          const fromChord = transitions.get(prevChord)!
          fromChord.set(currChord, (fromChord.get(currChord) || 0) + 1)

          // Calculate predictability based on transition patterns
          let totalTransitions = 0
          let maxTransitionCount = 0

          for (const [_, nextChords] of transitions.entries()) {
            let fromTotal = 0
            let fromMax = 0
            for (const [_, count] of nextChords.entries()) {
              fromTotal += count
              fromMax = Math.max(fromMax, count)
            }
            totalTransitions += fromTotal
            maxTransitionCount += fromMax
          }

          // Predictability = how often the most common transition happens
          // Higher ratio = more predictable
          const predictability = totalTransitions > 0 ? maxTransitionCount / totalTransitions : 0

          set({ chordTransitions: new Map(transitions), predictability })
        }
      }

      const recentChords = chordHistory.filter((h) => now - h.timestamp < CHORD_CHANGE_THRESHOLD)
      const chordCounts = new Map<string, number>()
      recentChords.forEach((h) => {
        chordCounts.set(h.chord, (chordCounts.get(h.chord) || 0) + 1)
      })

      let stableChord = "---"
      let stableNote = "---"
      let maxCount = 0
      for (const [chordName, count] of chordCounts.entries()) {
        if (count > maxCount && count > 2) {
          maxCount = count
          stableChord = chordName
          stableNote = recentChords.find((h) => h.chord === chordName)?.note || "---"
        }
      }

      const currentChordState = get().currentChord
      if (stableChord !== "---" || currentChordState === "---") {
        const songKey = detectKey(chordHistory)
        const chordDegree = getChordDegree(stableChord, songKey)

        set({
          currentChord: stableChord,
          currentNote: stableNote,
          songKey,
          chordDegree,
        })
      }

      if (get().isPlaying) {
        const currentTime = Date.now()
        const { dynamicParticles } = get()

        const peakThreshold = 120
        const minDistance = 300 // Increased to reduce overlapping particles

        for (let i = 10; i < frequencyData.length / 2; i++) {
          const freq = (i * sampleRate) / (2 * frequencyData.length)
          const magnitude = frequencyData[i]

          if (magnitude > peakThreshold && magnitude > frequencyData[i - 1] && magnitude > frequencyData[i + 1]) {
            const existingParticle = dynamicParticles.find((p) => {
              const avgFreq = (p.freqRange[0] + p.freqRange[1]) / 2
              return Math.abs(avgFreq - freq) < minDistance
            })

            if (existingParticle) {
              existingParticle.lastActive = currentTime
              existingParticle.isActive = true
            } else {
              const freqRange: [number, number] = [Math.max(20, freq - 100), Math.min(20000, freq + 100)]

              // Brightness (X-axis): mapped to spectral centroid position
              // Low freq (20-200Hz) -> left (-2.5), High freq (8000-20000Hz) -> right (+2.5)
              const freqNormalized = Math.log10(freq / 20) / Math.log10(20000 / 20) // Logarithmic scale 0-1
              const brightness = freqNormalized * 5 - 2.5 // Map to -2.5 to +2.5

              const energyNormalized = magnitude / 255

              // Height (Y-axis): primarily mapped from frequency so higher Hz sit higher
              const minHeight = -2
              const maxHeight = 3
              const frequencyHeight = minHeight + freqNormalized * (maxHeight - minHeight)
              const energyLift = (energyNormalized - 0.5) * 0.6 // subtle modulation
              const height = frequencyHeight + energyLift

              // Warmth (Z-axis): inverse relationship with frequency
              // Low frequencies are "warm" (positive Z), high frequencies are "cool" (negative Z)
              const warmthNormalized = 1 - freqNormalized // Invert
              const warmth = warmthNormalized * 4 - 2 // Map to -2 to +2

              // Add slight randomization to prevent exact overlaps while maintaining general positioning
              const jitterX = (Math.random() - 0.5) * 0.3
              const jitterY = (Math.random() - 0.5) * 0.3
              const jitterZ = (Math.random() - 0.5) * 0.3

              const hue = Math.floor(freqNormalized * 300) // 0-300 hue range for better color variety
              const saturation = 60 + energyNormalized * 30 // Higher energy = more saturated
              const lightness = 50 + energyNormalized * 20 // Higher energy = brighter
              const color = `hsl(${hue}, ${saturation}%, ${lightness}%)`

              const newParticle = {
                id: `dynamic-${freq.toFixed(0)}-${currentTime}`,
                name: `${freq.toFixed(0)}Hz`,
                color,
                position: [brightness + jitterX, height + jitterY, warmth + jitterZ] as [number, number, number],
                freqRange,
                createdAt: currentTime,
                lastActive: currentTime,
                isActive: true,
              }

              console.log(
                `[v0] 🎵 New sound: ${newParticle.name} | Position: [${newParticle.position.map((v) => v.toFixed(2)).join(", ")}] | Color: ${color}`,
              )

              set({
                dynamicParticles: [...dynamicParticles, newParticle],
              })
            }
          }
        }

        const updatedParticles = dynamicParticles
          .map((p) => {
            const timeSinceActive = currentTime - p.lastActive
            // Mark inactive after 300ms of silence
            if (timeSinceActive > 300) {
              return { ...p, isActive: false }
            }
            return p
          })
          .filter((p) => {
            // Keep particles for 20 seconds after last activity
            const timeSinceActive = currentTime - p.lastActive
            return timeSinceActive < 20000
          })

        if (updatedParticles.length !== dynamicParticles.length) {
          set({ dynamicParticles: updatedParticles })
        }
      }

        // Record analysis history every 0.5 seconds for export
        const stateToUpdate: any = {
          frequencyData: new Uint8Array(frequencyData),
          timeData: new Uint8Array(timeData),
          spectralCentroid,
          spectralRolloff,
          roughness,
          zeroCrossingRate,
          rhythmMetrics, // Update rhythm metrics
        }
        
        try {
          const { analysisHistory, currentTime: audioTime, currentChord, chordDegree } = get()
          const lastRecordTime = analysisHistory.length > 0 ? analysisHistory[analysisHistory.length - 1].time : -1
          
          if (audioTime - lastRecordTime >= 0.5 && frequencyData && frequencyData.length > 0) {
            // Calculate instrument energies
            const instrumentEnergies: Record<string, number> = {}
            const instruments = [
              { name: "Kick", freqRange: [20, 150] },
              { name: "Snare", freqRange: [150, 400] },
              { name: "Hi-Hat", freqRange: [3000, 8000] },
              { name: "Bass", freqRange: [40, 250] },
              { name: "Synth", freqRange: [250, 2000] },
              { name: "Vocal", freqRange: [300, 3000] },
              { name: "Guitar", freqRange: [80, 1200] },
              { name: "Piano", freqRange: [27, 4200] },
            ]
            
            instruments.forEach(inst => {
              const minBin = Math.floor((inst.freqRange[0] / 22050) * frequencyData.length)
              const maxBin = Math.floor((inst.freqRange[1] / 22050) * frequencyData.length)
              let energy = 0
              for (let i = minBin; i < maxBin; i++) {
                energy += frequencyData[i] / 255
              }
              instrumentEnergies[inst.name] = energy / (maxBin - minBin)
            })
            
            analysisHistory.push({
              time: audioTime,
              spectralCentroid,
              spectralRolloff,
              roughness,
              zeroCrossingRate,
              chord: currentChord,
              chordDegree,
              tempo: rhythmMetrics.tempo,
              beatStrength: rhythmMetrics.beatStrength,
              instrumentEnergies,
            })
            
            // Keep last 1000 samples (500 seconds at 0.5s intervals)
            if (analysisHistory.length > 1000) {
              analysisHistory.shift()
            }
            
            stateToUpdate.analysisHistory = [...analysisHistory]
          }
        } catch (error) {
          console.warn("[v0] Error recording analysis history:", error)
        }

        set(stateToUpdate)

        requestAnimationFrame(updateData)
      }
      updateData()

      set({
        audioContext,
        analyser,
        audioElement,
        source,
        frequencyData,
        timeData,
        eqFilters,
      })
    }

    // Resume AudioContext if suspended
    if (audioContext.state === "suspended") {
      await audioContext.resume()
    }

    return Promise.resolve()
  },

  togglePlayback: async () => {
    // Ensure AudioContext is created/resumed (requires user gesture)
    await get().ensureAudioContext()

    const { audioElement, audioContext, isPlaying, stems } = get()
    if (!audioElement || !audioContext) {
      console.warn("[v0] AudioContext not initialized. This should not happen.")
      return
    }

    if (!audioElement.src || audioElement.src === "") {
      console.warn("[v0] No audio file loaded. Please upload a file first.")
      return
    }

    if (audioContext.state === "suspended") {
      await audioContext.resume()
    }

    if (isPlaying) {
      audioElement.pause()
      
      // Pause all enabled stems
      Object.values(stems).forEach((stem) => {
        if (stem && stem.enabled && !stem.element.paused) {
          stem.element.pause()
        }
      })
      
      set({ isPlaying: false, currentLyrics: "♪ Paused" })
    } else {
      audioElement
        .play()
        .then(() => {
          console.log("[v0] Playback started successfully")
          
          // Play all enabled stems
          Object.entries(stems).forEach(([type, stem]) => {
            if (stem && stem.enabled) {
              // Sync time before playing
              stem.element.currentTime = audioElement.currentTime
              stem.element.play().catch((error) => {
                console.error(`[v0] Failed to play ${type} stem:`, error)
              })
            }
          })
          
          set({ isPlaying: true })
        })
        .catch((error) => {
          console.error("[v0] Playback failed:", error)
          set({ isPlaying: false })
        })
    }
  },

  seekTo: (positionSeconds: number) => {
    const { audioElement, duration, stems } = get()
    if (!audioElement) {
      console.warn("[v0] seekTo called before audioElement initialized")
      return
    }

    const safeDuration = Number.isFinite(duration) && duration > 0 ? duration : audioElement.duration
    if (!Number.isFinite(positionSeconds) || positionSeconds < 0) {
      console.warn("[v0] Invalid seek position:", positionSeconds)
      return
    }

    const clampedPosition = Math.min(Math.max(positionSeconds, 0), safeDuration || 0)
    audioElement.currentTime = clampedPosition
    
    // Sync all stems to the new position
    Object.values(stems).forEach((stem) => {
      if (stem) {
        stem.element.currentTime = clampedPosition
      }
    })
    
    set({ currentTime: clampedPosition })
  },

  replay: () => {
    const { audioElement, stems } = get()
    if (!audioElement) {
      console.warn("[v0] replay called before audioElement initialized")
      return
    }

    audioElement.currentTime = 0
    
    // Reset all stems to beginning
    Object.values(stems).forEach((stem) => {
      if (stem) {
        stem.element.currentTime = 0
      }
    })
    
    set({ currentTime: 0 })

    if (audioElement.paused) {
      audioElement
        .play()
        .then(() => {
          // Play all enabled stems
          Object.entries(stems).forEach(([type, stem]) => {
            if (stem && stem.enabled) {
              stem.element.play().catch((error) => {
                console.error(`[v0] Failed to play ${type} stem on replay:`, error)
              })
            }
          })
          set({ isPlaying: true })
        })
        .catch((error) => {
          console.error("[v0] Replay failed:", error)
          set({ isPlaying: false })
        })
    }
  },

  setVolume: (volume: number) => {
    const { audioElement } = get()
    if (audioElement) {
      audioElement.volume = volume
    }
    set({ volume })
  },

  loadAudioFile: async (file: File): Promise<boolean> => {
    const { audioElement } = get()
    if (!audioElement) {
      console.error("[v0] Audio element not initialized")
      return false
    }

    // Validate file type
    const validTypes = ["audio/mpeg", "audio/mp3", "audio/wav", "audio/ogg", "audio/webm", "audio/flac", "audio/aac"]
    const isValidType = validTypes.some((type) => file.type.startsWith(type.split("/")[0]))

    if (!isValidType && !file.name.match(/\.(mp3|wav|ogg|webm|flac|aac|m4a)$/i)) {
      console.error("[v0] Invalid file type. Please upload a valid audio file.")
      return false
    }

    // Validate file size (max 100MB)
    if (file.size > 100 * 1024 * 1024) {
      console.error("[v0] File too large. Please upload a file smaller than 100MB.")
      return false
    }

    return new Promise((resolve) => {
      // Stop current playback
      if (!audioElement.paused) {
        audioElement.pause()
        set({ isPlaying: false })
      }

      // Revoke previous object URL
      if (audioElement.src && audioElement.src.startsWith("blob:")) {
        URL.revokeObjectURL(audioElement.src)
      }

      const url = URL.createObjectURL(file)
      audioElement.src = url

      const handleCanPlay = () => {
        console.log("[v0] Audio file loaded successfully:", file.name)
        set({
          currentFileName: file.name,
          isPlaying: false,
          currentLyrics: "♪ Ready to play",
          lyricsData: [],
          songKey: "---",
          chordDegree: "---",
          dynamicParticles: [], // Reset dynamic particles on new file
          rhythmMetrics: {
            tempo: 120,
            beatStrength: 0,
            syncopation: 0,
          },
          chordTransitions: new Map(),
          predictability: 0,
        })
        cleanup()
        resolve(true)
      }

      const handleError = (e: ErrorEvent | Event) => {
        console.error("[v0] Failed to load audio file:", file.name, e)
        URL.revokeObjectURL(url)
        audioElement.src = ""
        set({
          currentFileName: null,
          isPlaying: false,
          currentLyrics: "♪ Failed to load",
          songKey: "---",
          chordDegree: "---",
          rhythmMetrics: {
            tempo: 120,
            beatStrength: 0,
            syncopation: 0,
          },
          chordTransitions: new Map(),
          predictability: 0,
        })
        cleanup()
        resolve(false)
      }

      const cleanup = () => {
        audioElement.removeEventListener("canplay", handleCanPlay)
        audioElement.removeEventListener("error", handleError)
      }

      audioElement.addEventListener("canplay", handleCanPlay)
      audioElement.addEventListener("error", handleError)

      // Start loading
      audioElement.load()
    })
  },

  updateEQ: (band: keyof AudioStore["eqSettings"], value: number) => {
    const { eqSettings, eqFilters } = get()
    const bandIndex = ["low", "lowMid", "mid", "highMid", "high"].indexOf(band)

    if (eqFilters[bandIndex]) {
      eqFilters[bandIndex].gain.value = value
    }

    set({
      eqSettings: {
        ...eqSettings,
        [band]: value,
      },
    })
  },

  toggleTrails: () => set((state) => ({ showTrails: !state.showTrails })),

  setIsolatedInstrument: (name: string | null) => set({ isolatedInstrument: name }),

  toggleClusters: () => set((state) => ({ showClusters: !state.showClusters })),

  toggleSpectralOverlay: () => set((state) => ({ showSpectralOverlay: !state.showSpectralOverlay })),

  generateAIDescription: () => {
    const { frequencyData, eqSettings, timbreFeatures, isPlaying } = get()
    if (!frequencyData || !isPlaying) {
      set({ aiDescription: "Play audio to generate description." })
      return
    }

    const avgFreq = Array.from(frequencyData).reduce((a, b) => a + b, 0) / frequencyData.length
    const dominantBand = Object.entries(eqSettings).reduce((a, b) => (b[1] > a[1] ? b : a))

    let description = "Audio Analysis: "

    if (avgFreq > 150) {
      description += "High energy detected across the spectrum. "
    } else if (avgFreq > 80) {
      description += "Moderate energy levels with balanced mix. "
    } else {
      description += "Low energy, subdued dynamics. "
    }

    if (dominantBand[1] > 3) {
      description += `${dominantBand[0]} frequencies are boosted, adding ${dominantBand[0] === "low" ? "warmth and body" : dominantBand[0] === "high" ? "brightness and air" : "presence"} to the mix. `
    }

    const activeInstruments = Array.from(timbreFeatures.values()).filter((t) => t.energy > 0.3)
    if (activeInstruments.length > 0) {
      description += `Active instruments: ${activeInstruments.map((t) => t.name).join(", ")}.`
    }

    set({ aiDescription: description })
  },

  exportTimbreData: () => {
    const {
      timbreFeatures,
      eqSettings,
      frequencyData,
      currentTime,
      duration,
      spectralCentroid,
      currentChord,
      currentNote,
      currentLyrics,
      songKey,
      chordDegree,
      rhythmMetrics,
      chordTransitions,
      predictability,
      dynamicParticles,
      analysisHistory,
      currentFileName,
    } = get()
    
    // Calculate per-instrument statistics from analysis history
    const instrumentNames = ["Kick", "Snare", "Hi-Hat", "Bass", "Synth", "Vocal", "Guitar", "Piano"]
    const instrumentStats = instrumentNames.map(name => {
      const energies = analysisHistory.map(h => h.instrumentEnergies[name] || 0)
      const avgEnergy = energies.length > 0 ? energies.reduce((a, b) => a + b, 0) / energies.length : 0
      const maxEnergy = energies.length > 0 ? Math.max(...energies) : 0
      const minEnergy = energies.length > 0 ? Math.min(...energies) : 0
      
      // Find peak times (energy > 0.5)
      const peakTimes = analysisHistory
        .filter(h => (h.instrumentEnergies[name] || 0) > 0.5)
        .map(h => h.time)
      
      const freqRanges: Record<string, [number, number]> = {
        "Kick": [20, 150],
        "Snare": [150, 400],
        "Hi-Hat": [3000, 8000],
        "Bass": [40, 250],
        "Synth": [250, 2000],
        "Vocal": [300, 3000],
        "Guitar": [80, 1200],
        "Piano": [27, 4200],
      }
      
      return {
        name,
        freqRange: freqRanges[name],
        statistics: {
          avgEnergy: Number(avgEnergy.toFixed(3)),
          peakEnergy: Number(maxEnergy.toFixed(3)),
          minEnergy: Number(minEnergy.toFixed(3)),
          totalActiveTime: peakTimes.length * 0.5, // 0.5s per sample
          peakCount: peakTimes.length,
          peakTimes: peakTimes.slice(0, 10), // First 10 peaks
        },
        timeSeries: analysisHistory.map(h => ({
          time: Number(h.time.toFixed(2)),
          energy: Number((h.instrumentEnergies[name] || 0).toFixed(3)),
        })),
      }
    })
    
    // Calculate overall statistics
    const avgSpectralCentroid = analysisHistory.length > 0
      ? analysisHistory.reduce((sum, h) => sum + h.spectralCentroid, 0) / analysisHistory.length
      : spectralCentroid
    
    const avgRoughness = analysisHistory.length > 0
      ? analysisHistory.reduce((sum, h) => sum + h.roughness, 0) / analysisHistory.length
      : 0
    
    const avgTempo = analysisHistory.length > 0
      ? analysisHistory.reduce((sum, h) => sum + h.tempo, 0) / analysisHistory.length
      : rhythmMetrics.tempo
    
    // Extract chord progression
    const chordProgression: Array<{ time: number; chord: string; degree: string; duration: number }> = []
    let lastChord = ""
    let lastTime = 0
    
    analysisHistory.forEach((h, idx) => {
      if (h.chord !== lastChord && h.chord !== "---") {
        if (chordProgression.length > 0) {
          chordProgression[chordProgression.length - 1].duration = h.time - lastTime
        }
        chordProgression.push({
          time: Number(h.time.toFixed(2)),
          chord: h.chord,
          degree: h.chordDegree,
          duration: 0,
        })
        lastChord = h.chord
        lastTime = h.time
      }
    })
    
    // Set last chord duration
    if (chordProgression.length > 0) {
      chordProgression[chordProgression.length - 1].duration = duration - lastTime
    }
    
    const data = {
      metadata: {
        fileName: currentFileName || "unknown",
        duration: Number(duration.toFixed(2)),
        analyzedAt: new Date().toISOString(),
        sampleCount: analysisHistory.length,
        sampleInterval: 0.5,
      },
      instruments: instrumentStats,
      chordProgression,
      overallStatistics: {
        avgSpectralCentroid: Number(avgSpectralCentroid.toFixed(2)),
        avgRoughness: Number(avgRoughness.toFixed(2)),
        avgTempo: Number(avgTempo.toFixed(0)),
        predictability: Number(predictability.toFixed(3)),
        songKey,
        totalChordChanges: chordProgression.length,
      },
      currentSnapshot: {
        timestamp: new Date().toISOString(),
        eqSettings,
        currentTime: Number(currentTime.toFixed(2)),
        spectralCentroid,
        currentChord,
        currentNote,
        songKey,
        chordDegree,
        rhythmMetrics,
      },
      chordTransitions: Array.from(chordTransitions.entries()).map(([from, to]) => ({
        from,
        transitions: Array.from(to.entries()).map(([toChord, count]) => ({ toChord, count })),
      })),
    }
    return JSON.stringify(data, null, 2)
  },

  transcribeLyrics: async () => {
    const { audioElement, currentFileName } = get()

    console.log("[v0] ===== TRANSCRIPTION STARTED =====")
    console.log("[v0] Audio element exists:", !!audioElement)
    console.log("[v0] Audio src:", audioElement?.src)
    console.log("[v0] Current file name:", currentFileName)

    if (!audioElement || !audioElement.src || !currentFileName) {
      console.error("[v0] ❌ No audio file loaded - aborting transcription")
      return
    }

    console.log("[v0] ✓ Starting transcription for:", currentFileName)
    set({ isTranscribingLyrics: true, transcriptionProgress: 0, currentLyrics: "♪ Preparing audio..." })

    try {
      // Fetch the audio file as a blob
      console.log("[v0] 📥 Fetching audio blob from:", audioElement.src)

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout for blob fetch

      const response = await fetch(audioElement.src, { signal: controller.signal })
      clearTimeout(timeoutId)

      console.log("[v0] Fetch response status:", response.status, response.statusText)

      let audioBlob = await response.blob()
      console.log(
        "[v0] ✓ Original audio blob created - size:",
        audioBlob.size,
        "bytes",
        `(${(audioBlob.size / 1024 / 1024).toFixed(2)} MB)`,
      )

      const maxSize = 3 * 1024 * 1024 // 3MB absolute max

      console.log("[v0] 🔄 Compressing audio for Whisper API...")
      set({ transcriptionProgress: 10, currentLyrics: "♪ Compressing audio..." })

      try {
        // Create audio context for compression
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
        const arrayBuffer = await audioBlob.arrayBuffer()
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)

        console.log("[v0] Audio decoded - duration:", audioBuffer.duration, "seconds")

        // Start with shorter duration if file is very large
        let targetDuration = audioBuffer.duration
        if (audioBlob.size > 10 * 1024 * 1024) {
          // If over 10MB, start with max 2 minutes
          targetDuration = Math.min(audioBuffer.duration, 120)
          console.log("[v0] Large file detected, limiting to", targetDuration, "seconds")
        } else if (audioBlob.size > 5 * 1024 * 1024) {
          // If over 5MB, start with max 3 minutes
          targetDuration = Math.min(audioBuffer.duration, 180)
          console.log("[v0] Medium file detected, limiting to", targetDuration, "seconds")
        }

        // Convert to mono and downsample to 16kHz (optimal for speech recognition)
        const sampleRate = 16000
        const offlineContext = new OfflineAudioContext(1, targetDuration * sampleRate, sampleRate)
        const source = offlineContext.createBufferSource()
        source.buffer = audioBuffer
        source.connect(offlineContext.destination)
        source.start()

        const renderedBuffer = await offlineContext.startRendering()
        console.log("[v0] Audio resampled to 16kHz mono")

        // Convert to WAV
        audioBlob = bufferToWave(renderedBuffer, renderedBuffer.length)

        console.log(
          "[v0] ✅ Compressed audio - new size:",
          audioBlob.size,
          "bytes",
          `(${(audioBlob.size / 1024 / 1024).toFixed(2)} MB)`,
        )

        if (audioBlob.size > maxSize) {
          console.log("[v0] ⚠️ Still too large after compression, reducing duration...")

          // Calculate how much we need to reduce
          const ratio = maxSize / audioBlob.size
          const newDuration = Math.floor(targetDuration * ratio * 0.9) // 90% of calculated to be safe

          console.log("[v0] Reducing duration from", targetDuration, "to", newDuration, "seconds")

          const reducedContext = new OfflineAudioContext(1, newDuration * sampleRate, sampleRate)
          const reducedSource = reducedContext.createBufferSource()
          reducedSource.buffer = audioBuffer
          reducedSource.connect(reducedContext.destination)
          reducedSource.start()

          const reducedBuffer = await reducedContext.startRendering()
          audioBlob = bufferToWave(reducedBuffer, reducedBuffer.length)

          console.log("[v0] ✅ Final reduced size:", (audioBlob.size / 1024 / 1024).toFixed(2), "MB")
        }

        if (audioBlob.size > maxSize) {
          throw new Error(
            `Audio file is still too large (${(audioBlob.size / 1024 / 1024).toFixed(2)} MB). Maximum size is 3MB. Please try a shorter audio clip or lower quality recording.`,
          )
        }

        console.log("[v0] ✅ File size validated:", (audioBlob.size / 1024 / 1024).toFixed(2), "MB - ready to send")
      } catch (compressError: any) {
        console.error("[v0] ❌ Compression failed:", compressError)
        throw new Error(compressError.message || "Failed to compress audio. Try uploading a smaller file.")
      }

      set({ transcriptionProgress: 20, currentLyrics: "♪ Uploading to OpenAI..." })

      // Create form data
      const formData = new FormData()
      formData.append("audio", audioBlob, currentFileName.replace(/\.[^.]+$/, ".wav"))
      console.log("[v0] ✓ FormData created - final size:", (audioBlob.size / 1024 / 1024).toFixed(2), "MB")

      console.log("[v0] 🚀 Sending POST request to /api/transcribe...")
      console.log("[v0] Request will timeout after 3 minutes...")

      // Add timeout for API request with progress updates
      const apiController = new AbortController()
      const apiTimeoutId = setTimeout(() => {
        console.error("[v0] ❌ API request timed out after 3 minutes")
        apiController.abort()
      }, 180000) // 3 minute timeout for API

      // Simulate progress updates while waiting
      const progressInterval = setInterval(() => {
        const currentProgress = get().transcriptionProgress
        if (currentProgress < 80) {
          set({ transcriptionProgress: currentProgress + 3, currentLyrics: `♪ Transcribing... ${currentProgress}%` })
        }
      }, 3000)

      const transcribeResponse = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
        signal: apiController.signal,
      })

      clearTimeout(apiTimeoutId)
      clearInterval(progressInterval)

      console.log("[v0] API response received - status:", transcribeResponse.status, transcribeResponse.statusText)

      set({ transcriptionProgress: 80, currentLyrics: "♪ Processing transcription..." })

      const responseText = await transcribeResponse.text()
      console.log("[v0] Raw response received, length:", responseText.length)

      if (!transcribeResponse.ok) {
        console.error("[v0] ❌ API returned error status:", transcribeResponse.status)
        console.error("[v0] Response body:", responseText.substring(0, 500))

        let errorMessage = `Server error: ${transcribeResponse.status}`

        // Try to parse as JSON
        try {
          const errorData = JSON.parse(responseText)
          errorMessage = errorData.error || errorMessage
          console.error("[v0] ❌ Parsed error data:", errorData)
        } catch {
          // Not JSON - likely HTML error page
          if (transcribeResponse.status === 413) {
            errorMessage = "File too large for server. Try a smaller or compressed file."
          } else if (transcribeResponse.status === 500) {
            errorMessage = "Server error processing audio. Check API key or try a different file."
          }
        }

        throw new Error(errorMessage)
      }

      // Parse the successful response
      const data = JSON.parse(responseText)
      console.log("[v0] ✅ Transcription successful!")
      console.log("[v0] Received lyric phrases:", data.lyrics.length)
      console.log("[v0] Full transcribed text:", data.fullText)
      console.log("[v0] First few lyrics:", data.lyrics.slice(0, 3))

      set({
        lyricsData: data.lyrics,
        currentLyrics: "♪ Transcription complete - ready to play",
        transcriptionProgress: 100,
        isTranscribingLyrics: false,
      })

      console.log("[v0] ✓ State updated with transcribed lyrics")
      console.log("[v0] ===== TRANSCRIPTION COMPLETE =====")

      // Reset after a delay
      setTimeout(() => {
        set({ transcriptionProgress: 0 })
      }, 2000)
    } catch (error: any) {
      console.error("[v0] ❌ ===== TRANSCRIPTION ERROR =====")
      console.error("[v0] Error type:", error.constructor.name)
      console.error("[v0] Error message:", error.message)
      console.error("[v0] Full error:", error)

      // Provide more user-friendly error messages
      let userMessage = "Transcription failed"
      if (error.name === "AbortError") {
        userMessage = "Request timed out - try a shorter file"
      } else if (error.message) {
        userMessage = error.message
      }

      set({
        isTranscribingLyrics: false,
        transcriptionProgress: 0,
        currentLyrics: `♪ ${userMessage}`,
      })

      // Reset error message after delay
      setTimeout(() => {
        set({ currentLyrics: "♪ Ready to play" })
      }, 5000)
    }
  },

  loadLyricsFile: async (file: File): Promise<boolean> => {
    console.log("[v0] Loading lyrics file:", file.name)

    if (!file.name.endsWith(".lrc") && !file.name.endsWith(".txt")) {
      console.error("[v0] Invalid file type. Please upload a .lrc or .txt file.")
      return false
    }

    return new Promise((resolve) => {
      const reader = new FileReader()

      reader.onload = (e) => {
        const content = e.target?.result as string
        console.log("[v0] Lyrics file content loaded")

        try {
          // Parse .lrc format: [mm:ss.xx] lyrics text
          const lines = content.split("\n")
          const parsedLyrics: Array<{
            time: number
            text: string
            words?: Array<{ word: string; start: number; end: number }>
          }> = []

          for (const line of lines) {
            const match = line.match(/\[(\d+):(\d+)\.?(\d+)?\]\s*(.*)/)
            if (match) {
              const minutes = Number.parseInt(match[1])
              const seconds = Number.parseInt(match[2])
              const centiseconds = match[3] ? Number.parseInt(match[3]) : 0
              const text = match[4].trim()

              const time = minutes * 60 + seconds + centiseconds / 100
              if (text) {
                parsedLyrics.push({ time, text })
              }
            }
          }

          if (parsedLyrics.length > 0) {
            parsedLyrics.sort((a, b) => a.time - b.time)
            console.log(`[v0] Successfully parsed ${parsedLyrics.length} lyric lines`)
            set({
              lyricsData: parsedLyrics,
              currentLyrics: "♪ Lyrics loaded - ready to play",
            })
            resolve(true)
          } else {
            console.warn("[v0] No valid lyrics found in file")
            set({ currentLyrics: "♪ No valid lyrics found in file" })
            resolve(false)
          }
        } catch (error) {
          console.error("[v0] Error parsing lyrics file:", error)
          set({ currentLyrics: "♪ Error parsing lyrics file" })
          resolve(false)
        }
      }

      reader.onerror = () => {
        console.error("[v0] Error reading lyrics file")
        set({ currentLyrics: "♪ Error reading lyrics file" })
        resolve(false)
      }

      reader.readAsText(file)
    })
  },

  toggleFrequencyGraph: () => set((state) => ({ showFrequencyGraph: !state.showFrequencyGraph })),
  toggleKrumhanslMap: () => set((state) => ({ showKrumhanslMap: !state.showKrumhanslMap })),
  toggleLyrics: () => set((state) => ({ showLyrics: !state.showLyrics })),
  toggleWater: () => set((state) => ({ showWater: !state.showWater })),

  loadStemFile: async (stemType: "vocals" | "drums" | "bass" | "other", file: File): Promise<boolean> => {
    const { audioElement, audioContext } = get()
    
    // Validate file type
    const validTypes = ["audio/mpeg", "audio/mp3", "audio/wav", "audio/ogg", "audio/webm", "audio/flac", "audio/aac"]
    const isValidType = validTypes.some((type) => file.type.startsWith(type.split("/")[0]))

    if (!isValidType && !file.name.match(/\.(mp3|wav|ogg|webm|flac|aac|m4a)$/i)) {
      console.error("[v0] Invalid stem file type. Please upload a valid audio file.")
      return false
    }

    return new Promise((resolve) => {
      const stemElement = new Audio()
      stemElement.crossOrigin = "anonymous"
      stemElement.volume = 0.7 // Set default volume
      
      const url = URL.createObjectURL(file)
      stemElement.src = url

      const handleCanPlay = async () => {
        console.log("[v0] Stem loaded successfully:", stemType, file.name)
        
        let stemSource: MediaElementAudioSourceNode | null = null
        let stemGain: GainNode | null = null
        let stemAnalyser: AnalyserNode | null = null
        
        // Connect to AudioContext if it exists
        if (audioContext) {
          try {
            // Check if AudioContext is in a valid state
            if (audioContext.state === "closed") {
              throw new Error("AudioContext is closed")
            }
            
            stemSource = audioContext.createMediaElementSource(stemElement)
            stemGain = audioContext.createGain()
            stemGain.gain.value = 0.7
            
            // Create analyser for this stem
            stemAnalyser = audioContext.createAnalyser()
            stemAnalyser.fftSize = 2048
            stemAnalyser.smoothingTimeConstant = 0.8
            
            // Connect: source -> gain -> analyser -> destination
            stemSource.connect(stemGain)
            stemGain.connect(stemAnalyser)
            stemAnalyser.connect(audioContext.destination)
            
            console.log(`[v0] ${stemType} stem connected to Web Audio API`)
          } catch (error) {
            console.warn(`[v0] Could not connect ${stemType} stem to AudioContext:`, error)
            // Fallback to regular HTML5 audio if Web Audio fails
            stemElement.volume = 0.7
            stemSource = null
            stemGain = null
            stemAnalyser = null
          }
        }
        
        // Sync with main audio if it exists
        if (audioElement) {
          stemElement.currentTime = audioElement.currentTime
        }
        
        set((state) => ({
          stems: {
            ...state.stems,
            [stemType]: {
              element: stemElement,
              enabled: true,
              fileName: file.name,
              source: stemSource,
              gainNode: stemGain,
              analyser: stemAnalyser,
            },
          },
        }))
        
        cleanup()
        resolve(true)
      }

      const handleError = (e: ErrorEvent | Event) => {
        console.error("[v0] Failed to load stem file:", stemType, file.name, e)
        URL.revokeObjectURL(url)
        cleanup()
        resolve(false)
      }

      const cleanup = () => {
        stemElement.removeEventListener("canplay", handleCanPlay)
        stemElement.removeEventListener("error", handleError)
      }

      stemElement.addEventListener("canplay", handleCanPlay)
      stemElement.addEventListener("error", handleError)
      stemElement.load()
    })
  },

  toggleStem: (stemType: "vocals" | "drums" | "bass" | "other") => {
    const { stems, isPlaying } = get()
    const stem = stems[stemType]
    
    if (!stem) return
    
    const newEnabled = !stem.enabled
    
    try {
      // Use gain node for mute/unmute if available, otherwise use pause/play
      if (stem.gainNode && stem.gainNode.context.state !== "closed") {
        // Smooth fade to prevent clicks
        const targetGain = newEnabled ? 0.7 : 0
        stem.gainNode.gain.setTargetAtTime(targetGain, stem.gainNode.context.currentTime, 0.015)
      } else {
        // Fallback to pause/play
        if (!newEnabled && !stem.element.paused) {
          stem.element.pause()
        }
        
        if (newEnabled && isPlaying) {
          stem.element.play().catch((error) => {
            console.error("[v0] Failed to play stem:", stemType, error)
          })
        }
      }
    } catch (error) {
      console.error(`[v0] Error toggling stem ${stemType}:`, error)
    }
    
    set((state) => ({
      stems: {
        ...state.stems,
        [stemType]: {
          ...stem,
          enabled: newEnabled,
        },
      },
    }))
  },

  setStemVolume: (stemType: "vocals" | "drums" | "bass" | "other", volume: number) => {
    const { stems } = get()
    const stem = stems[stemType]
    
    if (!stem) return
    
    const clampedVolume = Math.max(0, Math.min(1, volume))
    
    try {
      // Update gain node if available
      if (stem.gainNode && stem.gainNode.context.state !== "closed" && stem.enabled) {
        stem.gainNode.gain.setTargetAtTime(clampedVolume, stem.gainNode.context.currentTime, 0.015)
      } else {
        // Fallback to element volume
        stem.element.volume = clampedVolume
      }
    } catch (error) {
      console.error(`[v0] Error setting volume for ${stemType}:`, error)
      // Fallback to element volume
      stem.element.volume = clampedVolume
    }
  },

  clearStems: () => {
    const { stems } = get()
    
    // Pause, disconnect, and revoke URLs for all stems
    Object.values(stems).forEach((stem) => {
      if (stem) {
        stem.element.pause()
        
        // Disconnect Web Audio nodes
        if (stem.source) {
          try {
            stem.source.disconnect()
          } catch (e) {
            console.warn("[v0] Error disconnecting stem source:", e)
          }
        }
        if (stem.gainNode) {
          try {
            stem.gainNode.disconnect()
          } catch (e) {
            console.warn("[v0] Error disconnecting stem gain:", e)
          }
        }
        if (stem.analyser) {
          try {
            stem.analyser.disconnect()
          } catch (e) {
            console.warn("[v0] Error disconnecting stem analyser:", e)
          }
        }
        
        if (stem.element.src && stem.element.src.startsWith("blob:")) {
          URL.revokeObjectURL(stem.element.src)
        }
        stem.element.src = ""
      }
    })
    
    set({
      stems: {
        vocals: null,
        drums: null,
        bass: null,
        other: null,
      },
    })
  },
}))
