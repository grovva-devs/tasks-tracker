import { z } from "zod";

export const createTemplateSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(5000).optional(),
  categoryId: z.string().uuid().optional().nullable(),
  variables: z
    .array(
      z.object({
        key: z
          .string()
          .min(1)
          .max(100)
          .regex(/^\w+$/, "Key must be word characters only"),
        displayName: z.string().min(1).max(255),
        defaultValue: z.string().optional(),
        isRequired: z.boolean().default(true),
      }),
    )
    .optional(),
});

export const applyTemplateSchema = z.object({
  boardTitle: z.string().min(1).max(255).optional(),
  clientName: z.string().min(1).max(255),
  clientEmail: z.string().email().optional(),
  variables: z.record(z.string(), z.string()),
});

export type CreateTemplateInput = z.infer<typeof createTemplateSchema>;
export type ApplyTemplateInput = z.infer<typeof applyTemplateSchema>;