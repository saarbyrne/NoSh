import { z } from "zod";

// Vision output schema for photo analysis
export const VisionOutputSchema = z.object({
  photo_id: z.string(),
  items: z.array(z.object({
    raw_label: z.string(),
    confidence: z.number().min(0).max(1),
    packaged: z.boolean().optional(),
  })),
});

export type VisionOutputT = z.infer<typeof VisionOutputSchema>;

// Goals output schema
export const GoalsOutputSchema = z.object({
  goals: z.array(z.object({
    title: z.string().max(60),
    why: z.string().max(120),
    how: z.string().max(200),
    fallback: z.string().max(120),
  })),
});

export type GoalsOutputT = z.infer<typeof GoalsOutputSchema>;
