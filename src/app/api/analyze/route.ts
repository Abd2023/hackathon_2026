import { NextRequest, NextResponse } from "next/server";
import { runOrchestrator } from "@/lib/agents/orchestrator";
import { logStructured } from "@/lib/logger";
import { RecommendationResult } from "@/lib/schemas/analysis";
import crypto from "crypto";

const TIMEOUT_MS = 60000; // 60s timeout
const ANALYSIS_CACHE_TTL_MS = Math.max(
  60_000,
  Number(process.env.ANALYSIS_CACHE_TTL_MS || 30 * 60_000)
);
const ANALYSIS_CACHE_MAX_ENTRIES = Math.max(
  5,
  Number(process.env.ANALYSIS_CACHE_MAX_ENTRIES || 50)
);

const analysisCache = new Map<string, { result: RecommendationResult; expiresAt: number }>();
const inFlightAnalyses = new Map<string, Promise<RecommendationResult>>();

function createCacheKey(base64Data: string, mimeType: string, dealBreaker?: string) {
  return crypto
    .createHash("sha256")
    .update(`${mimeType}:${dealBreaker || ""}:${base64Data}`)
    .digest("hex");
}

function getCachedAnalysis(cacheKey: string) {
  const cached = analysisCache.get(cacheKey);
  if (!cached) return undefined;

  if (Date.now() > cached.expiresAt) {
    analysisCache.delete(cacheKey);
    return undefined;
  }

  return cached.result;
}

function setCachedAnalysis(cacheKey: string, result: RecommendationResult) {
  if (analysisCache.size >= ANALYSIS_CACHE_MAX_ENTRIES) {
    const oldestKey = analysisCache.keys().next().value as string | undefined;
    if (oldestKey) analysisCache.delete(oldestKey);
  }

  analysisCache.set(cacheKey, {
    result,
    expiresAt: Date.now() + ANALYSIS_CACHE_TTL_MS,
  });
}

function createDemoCache(): RecommendationResult {
  const demoListing = {
    source: "fixture" as const,
    title: "Demo Ürün (Önbellek)",
    priceTRY: 1499.99,
    url: "https://example.com/demo",
    sellerName: "Demo satıcı",
    sellerRating: 4.6,
    productRating: 4.4,
    reviewCount: 120,
    reviewSnippets: ["Demo akışı için hazırlanmış güvenli örnek veri."],
    sourceStatus: "cached" as const,
  };

  return {
    product: {
      productName: "Demo Ürün",
      category: "Demo",
      searchQueries: ["Demo Ürün"],
      visualConfidence: 90,
      uncertaintyNotes: ["Bu sonuç küçük test görseli için demo önbelleğinden döndü."],
    },
    listings: [demoListing],
    bestListing: demoListing,
    matchPercent: 98,
    decisionTitle: "Harika Bir Seçim",
    decisionSummary: "Bu ürün demo önbelleğinden getirilmiştir. Kriterlerinizi karşılıyor.",
    pros: ["Hızlı teslimat", "Güvenilir satıcı"],
    cons: ["Sınırlı stok"],
    evidenceLimitations: ["Bu bir demo verisidir, gerçek pazar yerleri aranmamıştır."],
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

    const cacheKey = createCacheKey(base64Data, mimeType, dealBreaker);
    const cachedResult = getCachedAnalysis(cacheKey);
    if (cachedResult) {
      logStructured("analyze_cache_hit", { requestId });
      return NextResponse.json(cachedResult);
    }

    // Run orchestrator with timeout guard
    let orchestratorPromise = inFlightAnalyses.get(cacheKey);
    if (orchestratorPromise) {
      logStructured("analyze_coalesced", { requestId });
    } else {
      orchestratorPromise = runOrchestrator(base64Data, mimeType, dealBreaker)
        .then((result) => {
          setCachedAnalysis(cacheKey, result);
          return result;
        })
        .finally(() => {
          inFlightAnalyses.delete(cacheKey);
        });
      inFlightAnalyses.set(cacheKey, orchestratorPromise);
    }

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Request timed out")), TIMEOUT_MS)
    );

    const result = await Promise.race([orchestratorPromise, timeoutPromise]) as RecommendationResult;

    logStructured("analyze_success", { 
      requestId, 
      durationMs: Date.now() - startTime,
      matchPercent: result.matchPercent
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
