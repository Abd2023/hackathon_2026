import { NextRequest, NextResponse } from "next/server";
import { runOrchestrator } from "@/lib/agents/orchestrator";

export async function POST(req: NextRequest) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: "Gemini API anahtarı eksik." }, { status: 503 });
    }

    const formData = await req.formData();
    const imageFile = formData.get("image") as File;
    const dealBreaker = formData.get("dealBreaker") as string | undefined;

    if (!imageFile) {
      return NextResponse.json({ error: "Görsel yüklenmedi." }, { status: 400 });
    }

    if (!imageFile.type.startsWith("image/")) {
      return NextResponse.json({ error: "Geçersiz dosya formatı." }, { status: 400 });
    }

    // Convert file to base64
    const arrayBuffer = await imageFile.arrayBuffer();
    const base64Data = Buffer.from(arrayBuffer).toString("base64");
    const mimeType = imageFile.type;

    const result = await runOrchestrator(base64Data, mimeType, dealBreaker);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Analysis API failed:", error);
    return NextResponse.json(
      { error: "Analiz sırasında bir hata oluştu.", details: error.message },
      { status: 500 }
    );
  }
}
