import { type NextRequest, NextResponse } from "next/server"
import OpenAI from "openai"

export async function POST(request: NextRequest) {
  try {
    console.log("[v0 API] ===== TRANSCRIBE REQUEST RECEIVED =====")
    console.log("[v0 API] Checking environment variables...")
    console.log("[v0 API] OPEN_AI_API_KEY exists:", !!process.env.OPEN_AI_API_KEY)
    console.log("[v0 API] API Key first 10 chars:", process.env.OPEN_AI_API_KEY?.substring(0, 10) || "NOT_FOUND")

    if (!process.env.OPEN_AI_API_KEY) {
      console.error("[v0 API] ❌ OPEN_AI_API_KEY environment variable is not set")
      return NextResponse.json(
        { error: "OpenAI API key not configured. Please add OPEN_AI_API_KEY to environment variables." },
        { status: 500 },
      )
    }

    const openai = new OpenAI({
      apiKey: process.env.OPEN_AI_API_KEY,
      timeout: 120000, // 2 minute timeout
      maxRetries: 2,
    })

    console.log("[v0 API] OpenAI client initialized")
    console.log("[v0 API] Parsing form data...")

    const formData = await request.formData()
    const audioFile = formData.get("audio") as File

    if (!audioFile) {
      console.error("[v0 API] ❌ No audio file provided in form data")
      return NextResponse.json({ error: "No audio file provided" }, { status: 400 })
    }

    console.log("[v0 API] ✓ Audio file received:")
    console.log("[v0 API]   - Name:", audioFile.name)
    console.log("[v0 API]   - Size:", audioFile.size, "bytes", `(${(audioFile.size / 1024 / 1024).toFixed(2)} MB)`)
    console.log("[v0 API]   - Type:", audioFile.type)

    // Check file size (OpenAI limit is 25MB)
    if (audioFile.size > 25 * 1024 * 1024) {
      console.error("[v0 API] ❌ File too large:", audioFile.size, "bytes")
      return NextResponse.json(
        { error: "File too large. Maximum size is 25MB. Please use a compressed format or split the file." },
        { status: 400 },
      )
    }

    console.log("[v0 API] 🚀 Calling OpenAI Whisper API...")
    console.log("[v0 API] Request parameters:")
    console.log("[v0 API]   - Model: whisper-1")
    console.log("[v0 API]   - Response format: verbose_json")
    console.log("[v0 API]   - Timestamp granularities: word")

    const startTime = Date.now()

    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: "whisper-1",
      response_format: "verbose_json",
      timestamp_granularities: ["word"],
    })

    const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(2)
    console.log("[v0 API] ✅ Whisper API call completed in", elapsedTime, "seconds")

    console.log("[v0 API] Processing transcription data...")
    const words = (transcription as any).words || []
    const fullText = (transcription as any).text || ""

    console.log("[v0 API] ✓ Total words transcribed:", words.length)
    console.log("[v0 API] ✓ Full text length:", fullText.length, "characters")
    console.log("[v0 API] ✓ First 100 chars:", fullText.substring(0, 100))

    if (words.length === 0) {
      console.warn("[v0 API] ⚠️ No words detected in transcription. Audio may not contain speech.")
      return NextResponse.json({
        success: true,
        lyrics: [{ time: 0, text: "♪ No speech detected in audio" }],
        fullText: "No speech detected",
        duration: 0,
      })
    }

    // Group words into phrases of 5-6 words for better readability
    const phrases: Array<{ time: number; text: string; words: Array<{ word: string; start: number; end: number }> }> =
      []
    const wordsPerPhrase = 5

    console.log("[v0 API] Creating lyric phrases with word-level timestamps...")
    for (let i = 0; i < words.length; i += wordsPerPhrase) {
      const phraseWords = words.slice(i, i + wordsPerPhrase)
      const text = phraseWords.map((w: any) => w.word).join(" ")
      const time = phraseWords[0].start

      const wordTimings = phraseWords.map((w: any) => ({
        word: w.word,
        start: w.start,
        end: w.end,
      }))

      phrases.push({ time, text, words: wordTimings })
    }

    console.log("[v0 API] ✓ Created", phrases.length, "lyric phrases with word-level timing")
    console.log("[v0 API] ✓ Sample phrase with words:", phrases[0])

    const duration = words.length > 0 ? words[words.length - 1]?.end || 0 : 0
    console.log("[v0 API] ✓ Total duration:", duration, "seconds")

    console.log("[v0 API] ===== TRANSCRIPTION COMPLETE =====")

    return NextResponse.json({
      success: true,
      lyrics: phrases,
      fullText,
      duration,
    })
  } catch (error: any) {
    console.error("[v0 API] ❌ ===== TRANSCRIPTION ERROR =====")
    console.error("[v0 API] Error name:", error.name)
    console.error("[v0 API] Error message:", error.message)
    console.error("[v0 API] Error stack:", error.stack)
    console.error("[v0 API] Full error object:", JSON.stringify(error, null, 2))

    let errorMessage = "Failed to transcribe audio"
    if (error.message?.includes("timeout")) {
      errorMessage = "Transcription timed out. Try a shorter audio file."
    } else if (error.message?.includes("API key")) {
      errorMessage = "OpenAI API key is invalid or not configured."
    } else if (error.message?.includes("rate limit")) {
      errorMessage = "Rate limit exceeded. Please try again later."
    }

    return NextResponse.json(
      {
        error: errorMessage,
        details: error.message || "Unknown error",
      },
      { status: 500 },
    )
  }
}
