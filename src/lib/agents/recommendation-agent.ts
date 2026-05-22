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

function stripScore(listing?: ScoredListing): MarketplaceListing | undefined {
  if (!listing) return undefined;

  const { score, ...rest } = listing;
  void score;
  return rest;
}

function shouldUseGeminiRecommendation() {
  return process.env.GEMINI_RECOMMENDATION_ENABLED !== "false";
}

const RECOMMENDATION_MODEL = process.env.GEMINI_TEXT_MODEL
  || process.env.GEMINI_MODEL
  || "gemini-2.5-flash-lite";

function sourceLabel(source?: MarketplaceListing["source"]) {
  const labels: Record<MarketplaceListing["source"], string> = {
    amazon_tr: "Amazon TR",
    trendyol: "Trendyol",
    hepsiburada: "Hepsiburada",
    fixture: "Demo veri",
  };

  return source ? labels[source] || "Pazaryeri" : "Pazaryeri";
}

function formatPrice(price?: number) {
  if (!Number.isFinite(price)) return "fiyat yok";
  return `${Math.round(price || 0).toLocaleString("tr-TR")} TL`;
}

function shortEvidence(value?: string) {
  if (!value) return undefined;
  const cleaned = value.replace(/\s+/g, " ").trim();
  return cleaned.length > 120 ? `${cleaned.slice(0, 117)}...` : cleaned;
}

function cheapestListing(listings: MarketplaceListing[]) {
  return listings.reduce<MarketplaceListing | undefined>((current, listing) => {
    if (!Number.isFinite(listing.priceTRY)) return current;
    if (!current || listing.priceTRY < current.priceTRY) return listing;
    return current;
  }, undefined);
}

function buildDecisionSummary(
  productInfo: ProductIdentification,
  best?: MarketplaceListing,
  cheapest?: MarketplaceListing,
  dealBreakerEval?: DealBreakerEvaluation
) {
  if (!best) {
    return `${productInfo.productName} için yeterli pazaryeri kanıtı bulunamadı.`;
  }

  const bestSource = sourceLabel(best.source);
  const cheapestSource = sourceLabel(cheapest?.source);
  const sellerText = best.sellerName ? `${best.sellerName} satıcısı` : `${bestSource} satıcısı`;
  const dealBreakerText = dealBreakerEval
    ? dealBreakerEval.verdict === "pass"
      ? "Özel şartınız yorum kanıtlarıyla destekleniyor."
      : dealBreakerEval.verdict === "fail"
        ? "Özel şartınız için olumsuz yorum sinyali var."
        : "Özel şartınız için yorum kanıtı sınırlı."
    : "Karar fiyat, satıcı güveni, yorumlar ve iade sinyallerine göre verildi.";

  if (cheapest && cheapest.url !== best.url) {
    return `${cheapestSource} daha ucuz görünüyor, ancak ${bestSource} tarafındaki ${sellerText}, yorum/iade sinyalleri ve genel güven skoru daha dengeli. Önerilen fiyat ${formatPrice(best.priceTRY)}. ${dealBreakerText}`;
  }

  return `${bestSource} bu listede en güçlü seçenek: ${formatPrice(best.priceTRY)}, ${sellerText}, yorum sinyali ve iade/kargo bilgisi birlikte değerlendirildi. ${dealBreakerText}`;
}

function buildGroundedPros(
  best?: MarketplaceListing,
  cheapest?: MarketplaceListing,
  dealBreakerEval?: DealBreakerEvaluation
) {
  if (!best) return ["Listelenen ürünler arasında güvenilir bir eşleşme bulunamadı."];

  const pros: string[] = [];

  if (cheapest?.url === best.url) {
    pros.push(`En uygun fiyat bu listede: ${formatPrice(best.priceTRY)}.`);
  }

  if (best.sellerRating && best.sellerRating >= 4.4) {
    pros.push(`Satıcı puanı güçlü: ${best.sellerRating}/5.`);
  } else if (best.sellerName) {
    pros.push(`Satıcı bilgisi net: ${best.sellerName}.`);
  }

  if (best.productRating && best.reviewCount) {
    pros.push(`Ürün puanı ${best.productRating}/5 ve ${best.reviewCount.toLocaleString("tr-TR")} yorum sinyali var.`);
  } else if (best.productRating) {
    pros.push(`Ürün puanı olumlu: ${best.productRating}/5.`);
  }

  const reviewEvidence = shortEvidence(best.reviewSnippets?.[0]);
  if (reviewEvidence) {
    pros.push(`Yorum kanıtı: "${reviewEvidence}"`);
  }

  if (best.returnPolicySummary) pros.push(best.returnPolicySummary);
  else if (best.shippingSummary) pros.push(best.shippingSummary);

  if (dealBreakerEval?.verdict === "pass") {
    const evidence = shortEvidence(dealBreakerEval.evidence[0]);
    pros.push(evidence ? `Özel şart destekleniyor: "${evidence}"` : "Özel şart yorum analizinden geçti.");
  }

  return pros.length > 0 ? pros.slice(0, 5) : ["Mevcut veriler içinde en dengeli seçenek."];
}

function buildGroundedCons(
  best?: MarketplaceListing,
  cheapest?: MarketplaceListing,
  dealBreakerEval?: DealBreakerEvaluation
) {
  if (!best) return ["Pazaryeri sonuçları sınırlı."];

  const cons: string[] = [];

  if (cheapest && cheapest.url !== best.url) {
    const diff = best.priceTRY - cheapest.priceTRY;
    cons.push(`${sourceLabel(best.source)} en ucuz değil; yaklaşık ${formatPrice(diff)} daha pahalı.`);
  }

  if (!best.sellerRating) cons.push("Satıcı puanı alınamadı.");
  if (!best.productRating || !best.reviewCount) cons.push("Ürün puanı veya yorum sayısı sınırlı.");
  if (!best.returnPolicySummary) cons.push("İade politikası net yakalanamadı.");
  if (!best.reviewSnippets?.length) cons.push("Yorum alıntısı az; yorum temelli çıkarımlar sınırlı.");

  if (dealBreakerEval?.verdict === "fail") {
    cons.unshift("Özel şart için olumsuz yorum sinyali var.");
  } else if (dealBreakerEval?.verdict === "uncertain") {
    cons.unshift("Özel şart için yeterli yorum kanıtı yok.");
  }

  return cons.slice(0, 5);
}

function compactListingsForGemini(listings: MarketplaceListing[]) {
  return listings.slice(0, 6).map((listing) => ({
    source: listing.source,
    title: listing.title,
    url: listing.url,
    priceTRY: listing.priceTRY,
    sellerName: listing.sellerName,
    sellerRating: listing.sellerRating,
    productRating: listing.productRating,
    reviewCount: listing.reviewCount,
    shippingSummary: listing.shippingSummary,
    returnPolicySummary: listing.returnPolicySummary,
    reviewSnippets: listing.reviewSnippets.slice(0, 3),
    sourceStatus: listing.sourceStatus,
  }));
}

function buildDeterministicRecommendation(
  productInfo: ProductIdentification,
  listings: MarketplaceListing[],
  dealBreakerEval?: DealBreakerEvaluation,
  reason = "Gemini final öneri adımı geçici olarak tamamlanamadı."
): RecommendationResult {
  const scored = scoreListings(listings, dealBreakerEval);
  const bestScored = scored[0];
  const best = stripScore(bestScored) || listings[0];
  const alt = stripScore(scored.find((listing) => listing.url !== best?.url));
  const scoredListings = scored.length > 0 ? stripScores(scored) : listings;
  const cheapest = cheapestListing(scoredListings);

  const visualConfidence = Math.round(productInfo.visualConfidence || 0);
  const scoreConfidence = bestScored?.score ?? 50;
  const matchPercent = Math.round(
    Math.min(96, Math.max(35, scoreConfidence * 0.7 + visualConfidence * 0.3))
  );

  const lowVisionConfidence = visualConfidence > 0 && visualConfidence < 45;
  const dealBreakerFailed = dealBreakerEval?.verdict === "fail";
  const dealBreakerUncertain = dealBreakerEval?.verdict === "uncertain";

  let decisionTitle = "En Mantıklı Seçenek";
  if (dealBreakerFailed) decisionTitle = "Özel Şart İçin Riskli";
  else if (dealBreakerUncertain || lowVisionConfidence) decisionTitle = "Kanıt Sınırlı, Dikkatli Alın";

  return {
    product: productInfo,
    listings: scoredListings,
    bestListing: best,
    alternativeListing: alt,
    matchPercent,
    decisionTitle,
    decisionSummary: buildDecisionSummary(productInfo, best, cheapest, dealBreakerEval),
    pros: buildGroundedPros(best, cheapest, dealBreakerEval),
    cons: buildGroundedCons(best, cheapest, dealBreakerEval),
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
  if (!shouldUseGeminiRecommendation()) {
    return buildDeterministicRecommendation(
      productInfo,
      listings,
      dealBreakerEval,
      "Demo modu: final oneride kota tasarrufu icin deterministik puanlama kullanildi."
    );
  }

  const prompt = `
Ürün Bilgisi:
${JSON.stringify(productInfo, null, 2)}

Pazaryeri Verileri:
${JSON.stringify(compactListingsForGemini(listings), null, 2)}

${dealBreakerEval ? `Deal-Breaker Değerlendirmesi: ${JSON.stringify(dealBreakerEval, null, 2)}` : "Özel şart belirtilmedi."}
  `;

  try {
    const rawResult = await generateStructuredContent<Record<string, unknown>>(
      prompt,
      RECOMMENDATION_AGENT_SYSTEM_PROMPT,
      recommendationSchema,
      RECOMMENDATION_MODEL
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
