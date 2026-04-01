import { NextResponse } from "next/server";

const HUGGING_FACE_API_TOKEN = process.env.HUGGING_FACE_API_TOKEN;
const MODEL_ID = "ai4bharat/indic-seamless";

export async function POST(req: Request) {
  try {
    const { audioBase64 } = await req.json();
    if (!audioBase64) {
      return NextResponse.json({ error: "Missing audio data" }, { status: 400 });
    }

    // Convert Base64 (dataURL) to Buffer
    const audioData = audioBase64.split(",")[1];
    const buffer = Buffer.from(audioData, "base64");

    // 1. Call Hugging Face for Transcription/Translation
    // NOTE: This model is heavy and might require a dedicated Hugging Face Inference Endpoint.
    // For the free Inference API, we'll try to call it, but often it's "loading" or "unsupported".
    
    const response = await fetch(
      `https://api-inference.huggingface.co/models/${MODEL_ID}`,
      {
        headers: {
          Authorization: `Bearer ${HUGGING_FACE_API_TOKEN}`,
          "Content-Type": "audio/wav", // The model expects audio bytes
        },
        method: "POST",
        body: buffer,
      }
    );

    let result = await response.json();
    
    // Handle array response (common in HF Inference API for many models)
    if (Array.isArray(result)) {
        result = result[0];
    }

    // Handle model loading error (common with free HF API)
    if (result.error && result.error.includes("loading")) {
        return NextResponse.json({ 
            status: "processing", 
            message: "AI model is warming up. Please try again in 20-30 seconds.",
            retryAfter: result.estimated_time || 20
        }, { status: 503 });
    }

    // 2. AI Analysis (Condition Reporting)
    // indic-seamless can return text or translation_text
    const transcript = result.text || result.translation_text || result.generated_text || "Audio received, but transcription failed.";
    
    // For the demo, we will generate a 'Condition Pulse' based on the transcript keywords.
    const condition = analyzeCondition(transcript);

    return NextResponse.json({
      transcript,
      condition,
      status: "success"
    });

  } catch (error: any) {
    console.error("API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

function analyzeCondition(text: string) {
    const criticalKeywords = ["pain", "blood", "bleed", "unconscious", "consciousness", "heart", "chest", "breath", "breathing", "fracture", "accident", "crash", "emergency"];
    const lowercaseText = text.toLowerCase();
    
    let priority = "STABLE";
    let symptoms: string[] = [];

    criticalKeywords.forEach(kw => {
        if (lowercaseText.includes(kw)) {
            symptoms.push(kw);
            priority = "CRITICAL";
        }
    });

    if (symptoms.length === 0) priority = "OBSERVATION";

    return {
        priority,
        symptoms: symptoms.length > 0 ? symptoms.join(", ") : "None detected",
        summary: text.length > 100 ? text.substring(0, 97) + "..." : text
    };
}
