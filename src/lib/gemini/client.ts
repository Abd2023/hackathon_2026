import { GoogleGenAI, Schema } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;

export const geminiClient = apiKey ? new GoogleGenAI({ apiKey }) : null;

type ImagePart = { inlineData: { data: string; mimeType: string } };

const DEFAULT_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const FALLBACK_MODELS = (process.env.GEMINI_FALLBACK_MODELS || "gemini-2.0-flash")
  .split(",")
  .map((model) => model.trim())
  .filter(Boolean);

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function uniqueModels(models: string[]) {
  return [...new Set(models.filter(Boolean))];
}

function getErrorStatus(error: unknown) {
  const maybeStatus = (error as { status?: number })?.status;
  if (typeof maybeStatus === "number") return maybeStatus;

  const message = error instanceof Error ? error.message : String(error);
  const match = message.match(/"code":\s*(\d+)/);
  return match ? Number(match[1]) : undefined;
}

function isRetryable(error: unknown) {
  const status = getErrorStatus(error);
  return status === 429 || status === 500 || status === 502 || status === 503 || status === 504;
}

function safeErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return String(error);
}

export async function generateStructuredContent<T>(
  prompt: string,
  systemInstruction: string,
  schema: Schema,
  modelName = DEFAULT_MODEL,
  imageParts?: ImagePart[]
): Promise<T> {
  if (!geminiClient) {
    throw new Error("GEMINI_API_KEY is not configured.");
  }

  const contents = [
    {
      role: "user",
      parts: imageParts && imageParts.length > 0
        ? [...imageParts, { text: prompt }]
        : [{ text: prompt }],
    },
  ];

  const modelsToTry = uniqueModels([modelName, ...FALLBACK_MODELS]);
  let lastError: unknown;

  for (const model of modelsToTry) {
    const attempts = 2;

    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      try {
        const response = await geminiClient.models.generateContent({
          model,
          contents,
          config: {
            systemInstruction,
            responseMimeType: "application/json",
            responseSchema: schema,
            temperature: 0.1,
          },
        });

        const text = response.text;
        if (!text) {
          throw new Error(`Empty response from Gemini model ${model}`);
        }

        return JSON.parse(text) as T;
      } catch (error) {
        lastError = error;

        const retryable = isRetryable(error);
        const canRetrySameModel = retryable && attempt < attempts;
        const canTryNextModel = modelsToTry.indexOf(model) < modelsToTry.length - 1;

        console.warn(
          `Gemini structured generation failed with ${model} ` +
          `(attempt ${attempt}/${attempts}): ${safeErrorMessage(error)}`
        );

        if (canRetrySameModel) {
          await sleep(700 * attempt);
          continue;
        }

        if (retryable && canTryNextModel) {
          break;
        }

        if (!canTryNextModel) {
          throw error;
        }

        break;
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Gemini structured generation failed.");
}
