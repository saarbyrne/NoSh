import { z } from "zod";

export const VisionItem = z.object({
  raw_label: z.string(),
  confidence: z.number().min(0).max(1),
  packaged: z.boolean().optional().default(false),
  taxonomy_category: z.string(),
});

export const VisionOutput = z.object({
  photo_id: z.string().uuid(),
  items: z.array(VisionItem),
  ocr_text: z.string().optional(),
});

export const GoalsOutput = z.object({
  goals: z
    .array(
      z.object({
        title: z.string().max(60),
        why: z.string().max(120),
        how: z.string().max(200),
        fallback: z.string().max(120),
      })
    )
    .length(3),
});

export type VisionItemT = z.infer<typeof VisionItem>;
export type VisionOutputT = z.infer<typeof VisionOutput>;
export type GoalsOutputT = z.infer<typeof GoalsOutput>;


