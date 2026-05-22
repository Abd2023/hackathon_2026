import { z } from "zod";

export const MarketplaceListingSchema = z.object({
  source: z.enum(["trendyol", "hepsiburada", "amazon_tr", "fixture"]),
  title: z.string(),
  url: z.string().url(),
  priceTRY: z.number().positive(),
  sellerName: z.string().optional(),
  sellerRating: z.number().min(0).max(5).optional(),
  productRating: z.number().min(0).max(5).optional(),
  reviewCount: z.number().nonnegative().optional(),
  imageUrl: z.string().url().optional(),
  shippingSummary: z.string().optional(),
  returnPolicySummary: z.string().optional(),
  reviewSnippets: z.array(z.string()),
  sourceStatus: z.enum(["live", "cached", "fixture", "blocked", "error"]),
});

export type MarketplaceListing = z.infer<typeof MarketplaceListingSchema>;
