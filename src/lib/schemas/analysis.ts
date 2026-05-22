import { z } from "zod";
import { MarketplaceListingSchema } from "./marketplace";
import { ProductIdentificationSchema } from "./product";

export const DealBreakerEvaluationSchema = z.object({
  condition: z.string(),
  verdict: z.enum(["pass", "fail", "uncertain"]),
  confidence: z.number().min(0).max(100),
  evidence: z.array(z.string()),
  shortExplanation: z.string(),
});

export type DealBreakerEvaluation = z.infer<typeof DealBreakerEvaluationSchema>;

export const RecommendationResultSchema = z.object({
  product: ProductIdentificationSchema.optional(),
  listings: z.array(MarketplaceListingSchema).optional(),
  bestListing: MarketplaceListingSchema.optional(),
  alternativeListing: MarketplaceListingSchema.optional(),
  matchPercent: z.number().min(0).max(100),
  decisionTitle: z.string(),
  decisionSummary: z.string(),
  pros: z.array(z.string()),
  cons: z.array(z.string()),
  dealBreaker: DealBreakerEvaluationSchema.optional(),
  evidenceLimitations: z.array(z.string()),
});

export type RecommendationResult = z.infer<typeof RecommendationResultSchema>;
