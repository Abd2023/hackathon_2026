import { NextRequest, NextResponse } from "next/server";
import { runOrchestrator } from "@/lib/agents/orchestrator";
import { logStructured } from "@/lib/logger";

const TIMEOUT_MS = 25000; // 25s timeout

function createDemoCache() {
  return {
    matchPercent: 98,
    decisionTitle: "Harika Bir Seçim",
    decisionSummary: "Bu ürün demo önbelleğinden getirilmiştir. Kriterlerinizi karşılıyor.",
    pros: ["Hızlı teslimat", "Güvenilir satıcı"],
    cons: ["Sınırlı stok"],
    evidenceLimitations: ["Bu bir demo verisidir, gerçek pazar yerleri aranmamıştır."],
    bestListing: {
      source: "cached",
      title: "Demo Ürün (Önbellek)",
      priceTRY: 1499.99,
      url: "https://example.com/demo",
      sourceStatus: "cached"
    }
  };
}

export async function POST(req: NextRequest) {
  const requestId = Math.random().toString(36).substring(7);
  const startTime = Date.now();

  try {
    if (!process.env.GEMINI_API_KEY) {
      logStructured("api_error", { requestId, error: "Missing Gemini API Key" });
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

    logStructured("analyze_start", { requestId, mimeType, hasDealBreaker: !!dealBreaker });

    // Check for demo trigger (e.g. tiny image like dummy.png)
    if (base64Data.length < 500) {
      logStructured("analyze_demo_cache", { requestId });
      return NextResponse.json(createDemoCache());
    }

    // Run orchestrator with timeout guard
    const orchestratorPromise = runOrchestrator(base64Data, mimeType, dealBreaker);
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Request timed out")), TIMEOUT_MS)
    );

    const result = await Promise.race([orchestratorPromise, timeoutPromise]);

    logStructured("analyze_success", { 
      requestId, 
      durationMs: Date.now() - startTime,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      matchPercent: (result as any).matchPercent
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    const errorMsg = (error as Error).message;
    logStructured("analyze_error", { 
      requestId, 
      durationMs: Date.now() - startTime,
      error: errorMsg
    });

    // Fallback to demo cache if timeout happens
    if (errorMsg === "Request timed out") {
       return NextResponse.json(createDemoCache());
    }

    return NextResponse.json(
      { error: "Analiz sırasında bir hata oluştu.", details: errorMsg },
      { status: 500 }
    );
  }
}
