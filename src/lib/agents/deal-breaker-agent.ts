import { Type, Schema } from "@google/genai";
import { generateStructuredContent } from "../gemini/client";
import { DEAL_BREAKER_AGENT_SYSTEM_PROMPT } from "../gemini/prompts";
import { MarketplaceListing } from "../schemas/marketplace";
import { ProductIdentification } from "../schemas/product";
import { DealBreakerEvaluation } from "../schemas/analysis";

const dealBreakerSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    condition: { type: Type.STRING },
    verdict: { type: Type.STRING, enum: ["pass", "fail", "uncertain"] },
    confidence: { type: Type.NUMBER },
    evidence: { type: Type.ARRAY, items: { type: Type.STRING } },
    shortExplanation: { type: Type.STRING },
  },
  required: ["condition", "verdict", "confidence", "evidence", "shortExplanation"],
};

export async function runDealBreakerAgent(
  productInfo: ProductIdentification,
  listings: MarketplaceListing[],
  dealBreaker: string
): Promise<DealBreakerEvaluation> {
  const prompt = `
Ürün Bilgisi:
${JSON.stringify(productInfo, null, 2)}

Pazaryeri Verileri (Yorumlar ve satıcı bilgileri dahil):
${JSON.stringify(listings, null, 2)}

Kullanıcı Özel Şartı: ${dealBreaker}
  `;

  try {
    const result = await generateStructuredContent<DealBreakerEvaluation>(
      prompt,
      DEAL_BREAKER_AGENT_SYSTEM_PROMPT,
      dealBreakerSchema,
      "gemini-2.5-pro"
    );
    return result;
  } catch (error) {
    console.warn("Deal breaker agent failed", error);
    return {
      condition: dealBreaker,
      verdict: "uncertain",
      confidence: 50,
      evidence: ["Analiz sırasında hata oluştu."],
      shortExplanation: "Yapay zeka analizi tamamlanamadı.",
    };
  }
}
