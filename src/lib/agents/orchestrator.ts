import { RecommendationResult, DealBreakerEvaluation } from "../schemas/analysis";
import { runVisionAgent } from "./vision-agent";
import { FIXTURE_MARKETPLACE_RESULTS } from "../fixtures/marketplace-results";
import { scoreListings } from "../scoring/score-listings";

export async function runOrchestrator(
  base64Image: string,
  mimeType: string,
  dealBreaker?: string
): Promise<RecommendationResult> {
  // Step 1: Vision Agent identifies the product
  const productInfo = await runVisionAgent(base64Image, mimeType, dealBreaker);

  // Step 2: Search Agent (Mocked with Fixtures for now)
  // We'll use a mocked keyword match for fixtures
  let searchKey = "mouse"; // fallback
  const queryLower = productInfo.searchQueries.join(" ").toLowerCase();
  if (queryLower.includes("klavye") || queryLower.includes("keychron")) searchKey = "keyboard";
  else if (queryLower.includes("kulaklık") || queryLower.includes("sony")) searchKey = "headphones";
  else if (queryLower.includes("telefon") || queryLower.includes("samsung")) searchKey = "smartphone";
  else if (queryLower.includes("süpürge") || queryLower.includes("roborock")) searchKey = "vacuum";

  const rawListings = FIXTURE_MARKETPLACE_RESULTS[searchKey] || FIXTURE_MARKETPLACE_RESULTS["mouse"];

  // Step 3: Deal Breaker Agent (Mocked logic for now)
  const dealBreakerEval: DealBreakerEvaluation | undefined = dealBreaker ? {
    condition: dealBreaker,
    verdict: "pass",
    confidence: 90,
    evidence: ["Yorumlarda şikayet bulunmadı."],
  } : undefined;

  // Step 4: Evidence & Scoring Agent
  const scoredListings = scoreListings(rawListings, dealBreakerEval);
  
  if (scoredListings.length === 0) {
     return {
       matchPercent: productInfo.visualConfidence,
       decisionTitle: "Sonuç Bulunamadı",
       decisionSummary: "Kriterlerinize uygun ürün listelenemedi.",
       pros: [],
       cons: [],
       dealBreaker: dealBreakerEval,
       evidenceLimitations: ["Pazaryerlerinde ürün bulunamadı."]
     };
  }

  const bestListing = scoredListings[0];
  const alternativeListing = scoredListings.length > 1 ? scoredListings[1] : undefined;

  // Best listing flag reset and re-apply
  const finalBest = { ...bestListing, isBest: true };

  // Step 5: Recommendation Agent (Assemble the result)
  return {
    bestListing: finalBest,
    alternativeListing,
    matchPercent: productInfo.visualConfidence,
    decisionTitle: dealBreakerEval?.verdict === "fail" ? "Özel Şartı Sağlamıyor" : "Güvenle Alabilirsiniz",
    decisionSummary: `Bulunan ürün ${productInfo.productName}. ${bestListing.source} üzerinde en iyi fiyat/güven oranına sahip.`,
    pros: ["Fiyat rekabetçi", "Satıcı güvenilir"],
    cons: [],
    dealBreaker: dealBreakerEval,
    evidenceLimitations: ["Bu veriler statik demo verileridir."]
  };
}
