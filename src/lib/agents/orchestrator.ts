import { RecommendationResult } from "../schemas/analysis";
import { runVisionAgent } from "./vision-agent";
import { HybridProvider } from "../marketplaces/provider";
import { runDealBreakerAgent } from "./deal-breaker-agent";
import { runRecommendationAgent } from "./recommendation-agent";

export async function runOrchestrator(
  base64Image: string,
  mimeType: string,
  dealBreaker?: string
): Promise<RecommendationResult> {
  // Step 1: Vision Agent identifies the product
  const productInfo = await runVisionAgent(base64Image, mimeType, dealBreaker);

  // Step 2: Search Agent (Mocked with Fixtures for now)
  const provider = new HybridProvider();
  const rawListings = await provider.search(productInfo);

  if (rawListings.length === 0) {
     return {
       matchPercent: productInfo.visualConfidence,
       decisionTitle: "Sonuç Bulunamadı",
       decisionSummary: "Kriterlerinize uygun ürün bulunamadı.",
       pros: [],
       cons: [],
       evidenceLimitations: ["Pazaryerlerinde ürün bulunamadı."]
     } as RecommendationResult;
  }

  // Step 3: Deal Breaker Agent
  let dealBreakerEval;
  if (dealBreaker) {
    dealBreakerEval = await runDealBreakerAgent(productInfo, rawListings, dealBreaker);
  }

  // Step 4 & 5: Recommendation Agent
  return runRecommendationAgent(productInfo, rawListings, dealBreakerEval);
}
