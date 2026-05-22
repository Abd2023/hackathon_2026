import { z } from "zod";

export const ProductIdentificationSchema = z.object({
  productName: z.string(),
  brand: z.string().optional(),
  model: z.string().optional(),
  category: z.string(),
  searchQueries: z.array(z.string()),
  visualConfidence: z.number().min(0).max(100),
  uncertaintyNotes: z.array(z.string()),
});

export type ProductIdentification = z.infer<typeof ProductIdentificationSchema>;
