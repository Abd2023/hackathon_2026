import { Type, Schema } from "@google/genai";
import { generateStructuredContent } from "../gemini/client";
import { RECOMMENDATION_AGENT_SYSTEM_PROMPT } from "../gemini/prompts";
import { MarketplaceListing } from "../schemas/marketplace";
import { ProductIdentification } from "../schemas/product";
import { RecommendationResult, DealBreakerEvaluation } from "../schemas/analysis";
import { scoreListings } from "../scoring/score-listings";

const recommendationSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    matchPercent: { type: Type.NUMBER },
    decisionTitle: { type: Type.STRING },
    decisionSummary: { type: Type.STRING },
    pros: { type: Type.ARRAY, items: { type: Type.STRING } },
    cons: { type: Type.ARRAY, items: { type: Type.STRING } },
    evidenceLimitations: { type: Type.ARRAY, items: { type: Type.STRING } },
    bestListingUrl: { type: Type.STRING },
    alternativeListingUrl: { type: Type.STRING, nullable: true },
  },
  required: [
    "matchPercent",
    "decisionTitle",
    "decisionSummary",
    "pros",
    "cons",
    "evidenceLimitations",
    "bestListingUrl",
  ],
};

export async function runRecommendationAgent(
  productInfo: ProductIdentification,
  listings: MarketplaceListing[],
  dealBreakerEval?: DealBreakerEvaluation
): Promise<RecommendationResult> {
  const prompt = `
Ürün Bilgisi:
${JSON.stringify(productInfo, null, 2)}

Pazaryeri Verileri:
${JSON.stringify(listings, null, 2)}

${dealBreakerEval ? `Deal-Breaker Değerlendirmesi: ${JSON.stringify(dealBreakerEval, null, 2)}` : "Özel şart belirtilmedi."}
  `;

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rawResult = await generateStructuredContent<Record<string, any>>(
      prompt,
      RECOMMENDATION_AGENT_SYSTEM_PROMPT,
      recommendationSchema,
      "gemini-2.5-pro"
    );

    const bestListing = listings.find((l) => l.url === rawResult.bestListingUrl) || listings[0];
    const alternativeListing = rawResult.alternativeListingUrl
      ? listings.find((l) => l.url === rawResult.alternativeListingUrl)
      : undefined;

    return {
      bestListing: bestListing,
      alternativeListing: alternativeListing ? alternativeListing : undefined,
      matchPercent: rawResult.matchPercent,
      decisionTitle: rawResult.decisionTitle,
      decisionSummary: rawResult.decisionSummary,
      pros: rawResult.pros,
      cons: rawResult.cons,
      dealBreaker: dealBreakerEval,
      evidenceLimitations: rawResult.evidenceLimitations,
    };
  } catch (error) {
    console.warn("Recommendation agent failed, falling back to deterministic scoring", error);
    
    const scored = scoreListings(listings, dealBreakerEval);
    const best = scored[0] || listings[0];
    const alt = scored.length > 1 ? scored[1] : undefined;

    return {
      bestListing: best,
      alternativeListing: alt ? alt : undefined,
      matchPercent: productInfo.visualConfidence,
      decisionTitle: dealBreakerEval?.verdict === "fail" ? "Özel Şartı Sağlamıyor" : "Güvenle Alabilirsiniz (Otomatik Puanlama)",
      decisionSummary: `Yapay zeka analizinde hata oluştuğu için temel fiyat/puan tabanlı sıralama yapıldı.`,
      pros: ["En düşük fiyata sahip olabilir"],
      cons: ["Detaylı yorum analizi yapılamadı"],
      dealBreaker: dealBreakerEval,
      evidenceLimitations: ["Yapay zeka kararı alınamadı, deterministik kurallar uygulandı."],
    };
  }
}
