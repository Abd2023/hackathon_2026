import { GoogleGenAI, Type, Schema } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;

export const geminiClient = apiKey ? new GoogleGenAI({ apiKey }) : null;

export async function generateStructuredContent<T>(
  prompt: string,
  systemInstruction: string,
  schema: Schema,
  modelName = "gemini-2.5-pro",
  imageParts?: { inlineData: { data: string; mimeType: string } }[]
): Promise<T> {
  if (!geminiClient) {
    throw new Error("GEMINI_API_KEY is not configured.");
  }

  const contents: any[] = [];
  
  if (imageParts && imageParts.length > 0) {
    contents.push({ role: "user", parts: [...imageParts, { text: prompt }] });
  } else {
    contents.push({ role: "user", parts: [{ text: prompt }] });
  }

  try {
    const response = await geminiClient.models.generateContent({
      model: modelName,
      contents,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: schema,
        temperature: 0.1, // Keep it deterministic
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error("Empty response from Gemini");
    }

    // Try parsing the JSON
    return JSON.parse(text) as T;
  } catch (error) {
    console.error("Gemini structured generation failed:", error);
    throw error;
  }
}
