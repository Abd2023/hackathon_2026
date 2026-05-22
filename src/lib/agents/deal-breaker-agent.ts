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

const DEAL_BREAKER_MODEL = process.env.GEMINI_TEXT_MODEL
  || process.env.GEMINI_MODEL
  || "gemini-2.5-flash-lite";

function normalize(value: string) {
  return value
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i");
}

function deterministicDealBreakerFallback(
  listings: MarketplaceListing[],
  dealBreaker: string
): DealBreakerEvaluation {
  const snippets = listings.flatMap((listing) => listing.reviewSnippets || []);

  if (snippets.length === 0) {
    return {
      condition: dealBreaker,
      verdict: "uncertain",
      confidence: 35,
      evidence: ["Yorum kanıtı bulunamadığı için özel şart doğrulanamadı."],
      shortExplanation: "Bu şart için yeterli yorum kanıtı yok.",
    };
  }

  const condition = normalize(dealBreaker);
  const relevant = snippets.filter((snippet) => {
    const normalizedSnippet = normalize(snippet);
    return condition
      .split(/\s+/)
      .filter((word) => word.length > 4)
      .some((word) => normalizedSnippet.includes(word.slice(0, 6)));
  });

  const negativeEvidence = relevant.filter((snippet) =>
    /(bozuldu|bozuluyor|sorun|şikayet|sikayet|kırıldı|kirildi|gecikme|ısınma|isinma|kopuyor|çalışmadı|calismadi)/i
      .test(normalize(snippet))
  );
  const positiveEvidence = relevant.filter((snippet) =>
    /(bozulmuyor|sağlam|saglam|kaliteli|rahat|başarılı|basarili|iyi|sessiz|hızlı|hizli)/i
      .test(normalize(snippet))
  );

  if (negativeEvidence.length > 0 && positiveEvidence.length === 0) {
    return {
      condition: dealBreaker,
      verdict: "fail",
      confidence: 65,
      evidence: negativeEvidence.slice(0, 3),
      shortExplanation: "Yorumlarda özel şartla çelişen olumsuz sinyaller var.",
    };
  }

  if (positiveEvidence.length > 0 && negativeEvidence.length === 0) {
    return {
      condition: dealBreaker,
      verdict: "pass",
      confidence: 68,
      evidence: positiveEvidence.slice(0, 3),
      shortExplanation: "Yorumlarda özel şartı destekleyen olumlu sinyaller var.",
    };
  }

  return {
    condition: dealBreaker,
    verdict: "uncertain",
    confidence: 45,
    evidence: relevant.length > 0 ? relevant.slice(0, 3) : ["Yorumlar özel şartı doğrudan kanıtlamıyor."],
    shortExplanation: "Bu şart için kanıt sınırlı veya çelişkili.",
  };
}

export async function runDealBreakerAgent(
  productInfo: ProductIdentification,
  listings: MarketplaceListing[],
  dealBreaker: string
): Promise<DealBreakerEvaluation> {
  const prompt = `
Ürün Bilgisi:
${JSON.stringify(productInfo, null, 2)}

Pazaryeri Verileri (yorumlar ve satıcı bilgileri dahil):
${JSON.stringify(listings, null, 2)}

Kullanıcı Özel Şartı: ${dealBreaker}
  `;

  try {
    return await generateStructuredContent<DealBreakerEvaluation>(
      prompt,
      DEAL_BREAKER_AGENT_SYSTEM_PROMPT,
      dealBreakerSchema,
      DEAL_BREAKER_MODEL
    );
  } catch (error) {
    console.warn("Deal breaker agent failed, using deterministic evidence fallback", error);
    return deterministicDealBreakerFallback(listings, dealBreaker);
  }
}
