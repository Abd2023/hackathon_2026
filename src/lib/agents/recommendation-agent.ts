import { Type, Schema } from "@google/genai";
import { generateStructuredContent } from "../gemini/client";
import { RECOMMENDATION_AGENT_SYSTEM_PROMPT } from "../gemini/prompts";
import { MarketplaceListing } from "../schemas/marketplace";
import { ProductIdentification } from "../schemas/product";
import { RecommendationResult, DealBreakerEvaluation } from "../schemas/analysis";
import { scoreListings, ScoredListing } from "../scoring/score-listings";

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

function stripScores(listings: ScoredListing[]): MarketplaceListing[] {
  return listings.map((scoredListing) => {
    const { score, ...listing } = scoredListing;
    void score;
    return listing;
  });
}

function buildDeterministicRecommendation(
  productInfo: ProductIdentification,
  listings: MarketplaceListing[],
  dealBreakerEval?: DealBreakerEvaluation,
  reason = "Gemini final öneri adımı geçici olarak tamamlanamadı."
): RecommendationResult {
  const scored = scoreListings(listings, dealBreakerEval);
  const best = scored[0] || listings[0];
  const alt = scored.length > 1 ? scored[1] : undefined;
  const scoredListings = scored.length > 0 ? stripScores(scored) : listings;

  const visualConfidence = Math.round(productInfo.visualConfidence || 0);
  const scoreConfidence = best && "score" in best ? best.score : 50;
  const matchPercent = Math.round(
    Math.min(96, Math.max(35, scoreConfidence * 0.7 + visualConfidence * 0.3))
  );

  const lowVisionConfidence = visualConfidence > 0 && visualConfidence < 45;
  const dealBreakerFailed = dealBreakerEval?.verdict === "fail";
  const dealBreakerUncertain = dealBreakerEval?.verdict === "uncertain";

  let decisionTitle = "En Mantıklı Seçenek";
  if (dealBreakerFailed) decisionTitle = "Özel Şart İçin Riskli";
  else if (dealBreakerUncertain || lowVisionConfidence) decisionTitle = "Kanıt Sınırlı, Dikkatli Alın";

  const pros: string[] = [];
  const cons: string[] = [];

  if (best?.sellerRating) pros.push(`Satıcı puanı güçlü: ${best.sellerRating}/5`);
  if (best?.productRating) pros.push(`Ürün puanı: ${best.productRating}/5`);
  if (best?.reviewCount) pros.push(`${best.reviewCount.toLocaleString("tr-TR")} yorum sinyali var`);
  if (best?.returnPolicySummary) pros.push(best.returnPolicySummary);
  if (pros.length === 0 && best) pros.push("Mevcut veriler içinde en dengeli seçenek");

  if (dealBreakerFailed) cons.push("Kullanıcının özel şartı için olumsuz sinyal var");
  if (dealBreakerUncertain) cons.push("Özel şart için yeterli yorum kanıtı yok");
  if (best?.sourceStatus !== "live") cons.push("Canlı pazaryeri verisi yerine demo/önbellek kanıtı kullanıldı");
  if (!best?.reviewSnippets?.length) cons.push("Detaylı yorum alıntısı sınırlı");

  return {
    product: productInfo,
    listings: scoredListings,
    bestListing: best,
    alternativeListing: alt,
    matchPercent,
    decisionTitle,
    decisionSummary: best
      ? `${productInfo.productName} için ${best.source.toUpperCase()} seçeneği fiyat, satıcı güveni, yorum sinyali ve iade bilgisine göre öne çıktı.`
      : `${productInfo.productName} için yeterli pazaryeri kanıtı bulunamadı.`,
    pros,
    cons,
    dealBreaker: dealBreakerEval,
    evidenceLimitations: [
      reason,
      ...(!listings.some((listing) => listing.sourceStatus === "live")
        ? ["Canlı scraping başarısız olduğu için ürünle uyumlu demo/önbellek verisi kullanıldı."]
        : []),
      ...(lowVisionConfidence
        ? ["Görsel ürün eşleşme güveni düşük; sonuçlar kontrol edilmelidir."]
        : []),
    ],
  };
}

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
    const rawResult = await generateStructuredContent<Record<string, unknown>>(
      prompt,
      RECOMMENDATION_AGENT_SYSTEM_PROMPT,
      recommendationSchema,
      "gemini-2.5-flash"
    );

    const bestListingUrl = typeof rawResult.bestListingUrl === "string" ? rawResult.bestListingUrl : "";
    const alternativeListingUrl = typeof rawResult.alternativeListingUrl === "string"
      ? rawResult.alternativeListingUrl
      : undefined;

    const bestListing = listings.find((listing) => listing.url === bestListingUrl) || listings[0];
    const alternativeListing = alternativeListingUrl
      ? listings.find((listing) => listing.url === alternativeListingUrl)
      : listings.find((listing) => listing.url !== bestListing?.url);

    return {
      product: productInfo,
      listings,
      bestListing,
      alternativeListing,
      matchPercent: Number(rawResult.matchPercent) || productInfo.visualConfidence,
      decisionTitle: String(rawResult.decisionTitle || "Analiz Sonucu"),
      decisionSummary: String(rawResult.decisionSummary || ""),
      pros: Array.isArray(rawResult.pros) ? rawResult.pros.map(String) : [],
      cons: Array.isArray(rawResult.cons) ? rawResult.cons.map(String) : [],
      dealBreaker: dealBreakerEval,
      evidenceLimitations: Array.isArray(rawResult.evidenceLimitations)
        ? rawResult.evidenceLimitations.map(String)
        : [],
    };
  } catch (error) {
    console.warn("Recommendation agent failed, falling back to deterministic scoring", error);
    return buildDeterministicRecommendation(productInfo, listings, dealBreakerEval);
  }
}
