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

const DEMO_LYRICS = [
  { time: 0, text: "♪ Audio ready to play" },
  { time: 5, text: "When the music starts playing" },
  { time: 9, text: "Watch the colors dance and sway" },
  { time: 13, text: "In this timbre space we're staying" },
  { time: 17, text: "Where the frequencies convey" },
  { time: 21, text: "Every tone and every feeling" },
  { time: 25, text: "Painted bright across the sky" },
  { time: 29, text: "Audio waves are now revealing" },
  { time: 33, text: "Harmonies that touch the eye" },
  { time: 37, text: "Bass and treble interweaving" },
  { time: 41, text: "Spectral beauty on display" },
]

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
  currentChord: "---",
  currentNote: "---",
  currentLyrics: "♪ Play audio to start",
  lyricsData: DEMO_LYRICS, // Initialize with demo lyrics
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
  dynamicParticles: [], // Initialize dynamic particles array

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

        const sampleRate = audioContext.sampleRate
      const spectralCentroid = calculateSpectralCentroid(frequencyData, sampleRate)

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

              // Energy/Depth (Y-axis): based on magnitude and harmonics
              // Use magnitude to determine vertical position
              const energyNormalized = magnitude / 255
              const energy = energyNormalized * 4 - 1 // Map to -1 to +3

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
                position: [brightness + jitterX, energy + jitterY, warmth + jitterZ] as [number, number, number],
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

        set({
          frequencyData: new Uint8Array(frequencyData),
          timeData: new Uint8Array(timeData),
          spectralCentroid,
          rhythmMetrics, // Update rhythm metrics
        })

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

    const { audioElement, audioContext, isPlaying } = get()
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
      set({ isPlaying: false, currentLyrics: "♪ Paused" })
    } else {
      audioElement
        .play()
        .then(() => {
          console.log("[v0] Playback started successfully")
          set({ isPlaying: true })
        })
        .catch((error) => {
          console.error("[v0] Playback failed:", error)
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
          lyricsData: DEMO_LYRICS,
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
    } = get()
    const data = {
      timestamp: new Date().toISOString(),
      eqSettings,
      instruments: Array.from(timbreFeatures.entries()).map(([name, timbre]) => ({
        name,
        features: timbre.features,
        energy: timbre.energy,
        trajectory: timbre.trajectory,
      })),
      frequencySnapshot: frequencyData ? Array.from(frequencyData) : [],
      currentTime,
      duration,
      spectralCentroid,
      currentChord,
      currentNote,
      currentLyrics,
      songKey,
      chordDegree,
      rhythmMetrics,
      chordTransitions: Array.from(chordTransitions.entries()).map(([from, to]) => ({
        from,
        transitions: Array.from(to.entries()).map(([toChord, count]) => ({ toChord, count })),
      })),
      predictability,
      dynamicParticles,
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
}))
