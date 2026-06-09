import { z } from "zod";

export const AnalyzeRequestSchema = z
  .object({
    url: z.string().max(2048).optional().default(""),
    socialUrls: z.array(z.string().min(4).max(2048)).max(5).optional().default([])
  })
  .superRefine((value, context) => {
    if (!value.url.trim() && value.socialUrls.length === 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Add a company website URL, at least one social media URL, or both.",
        path: ["url"]
      });
    }
  });

export function normalizeAnalyzeUrl(value: string | undefined, socialUrls: string[]) {
  const trimmed = value?.trim() ?? "";
  return trimmed || socialUrls[0] || "";
}
