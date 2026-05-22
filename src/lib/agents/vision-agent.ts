import { Type, Schema } from "@google/genai";
import { generateStructuredContent } from "../gemini/client";
import { VISION_AGENT_SYSTEM_PROMPT } from "../gemini/prompts";
import { ProductIdentification } from "../schemas/product";

const visionAgentSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    productName: { type: Type.STRING },
    brand: { type: Type.STRING },
    model: { type: Type.STRING },
    category: { type: Type.STRING },
    searchQueries: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
    visualConfidence: { type: Type.NUMBER },
    uncertaintyNotes: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
  },
  required: ["productName", "category", "searchQueries", "visualConfidence", "uncertaintyNotes"],
};

const VISION_MODEL = process.env.GEMINI_VISION_MODEL
  || process.env.GEMINI_MODEL
  || "gemini-2.5-flash-lite";

export async function runVisionAgent(
  base64Image: string,
  mimeType: string,
  dealBreaker?: string
): Promise<ProductIdentification> {
  const prompt = dealBreaker
    ? `Bu ürünü analiz et. Kullanıcının özel şartı: "${dealBreaker}". Bu şartı dikkate alarak ürünü en doğru şekilde tanımla.`
    : `Bu ürünü detaylı bir şekilde analiz et ve tanımla.`;

  return generateStructuredContent<ProductIdentification>(
    prompt,
    VISION_AGENT_SYSTEM_PROMPT,
    visionAgentSchema,
    VISION_MODEL,
    [{ inlineData: { data: base64Image, mimeType } }]
  );
}
