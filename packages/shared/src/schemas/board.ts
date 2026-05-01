import { z } from "zod";

export const createBoardSchema = z.object({
  title: z.string().min(1, "Title is required").max(255),
  description: z.string().max(5000).optional(),
  clientName: z.string().min(1, "Client name is required").max(255),
  clientEmail: z.string().email("Invalid email").optional(),
  templateId: z.string().uuid().optional(),
  variables: z.record(z.string(), z.string()).optional(),
});

export const updateBoardSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().max(5000).optional(),
  clientName: z.string().min(1).max(255).optional(),
  clientEmail: z.string().email().optional().nullable(),
  status: z.enum(["active", "completed", "archived"]).optional(),
});

export type CreateBoardInput = z.infer<typeof createBoardSchema>;
export type UpdateBoardInput = z.infer<typeof updateBoardSchema>;