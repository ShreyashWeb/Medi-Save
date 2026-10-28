import { NextRequest, NextResponse } from "next/server";

// Default ElevenLabs multilingual voice (e.g. "Rachel" or "George" - supports eleven_multilingual_v2)
const DEFAULT_VOICE_ID = process.env.ELEVENLABS_VOICE_ID || "21m00Tcm4TlvDq8ikWAM";

export async function POST(req: NextRequest) {
  try {
    const { text, voiceId } = await req.json();

    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "Missing or invalid text parameter" }, { status: 400 });
    }

    const apiKey = process.env.ELEVENLABS_API_KEY;

    // If no ElevenLabs API key is configured, return fallback signal so client uses Web Speech API
    if (!apiKey) {
      return NextResponse.json({
        fallback: true,
        message: "ELEVENLABS_API_KEY not configured. Falling back to browser speech synthesis.",
      });
    }

    const targetVoice = voiceId || DEFAULT_VOICE_ID;
    const url = `https://api.elevenlabs.io/v1/text-to-speech/${targetVoice}`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": apiKey,
      },
      body: JSON.stringify({
        text: text.slice(0, 500), // Protect credits by capping output
        model_id: "eleven_multilingual_v2",
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.8,
          style: 0.2,
          use_speaker_boost: true,
        },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.warn("ElevenLabs TTS error:", response.status, errText);
      return NextResponse.json({
        fallback: true,
        error: `ElevenLabs error: ${response.status}`,
      });
    }

    const audioBuffer = await response.arrayBuffer();

    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error) {
    console.error("TTS endpoint exception:", error);
    return NextResponse.json({
      fallback: true,
      error: "Internal server error during speech synthesis",
    });
  }
}
