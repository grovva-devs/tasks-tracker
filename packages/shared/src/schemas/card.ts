import { z } from "zod";

export const createCardSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().max(10000).optional(),
  dueDate: z.string().date().optional().nullable(),
});

export const updateCardSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().max(10000).optional().nullable(),
  dueDate: z.string().date().optional().nullable(),
});

export const moveCardSchema = z.object({
  listId: z.string().uuid(),
  position: z.number().int().min(0),
});

export const createCommentSchema = z.object({
  content: z.string().min(1, "Content is required").max(10000),
  visibility: z.enum(["internal", "client"]),
});

export type CreateCardInput = z.infer<typeof createCardSchema>;
export type UpdateCardInput = z.infer<typeof updateCardSchema>;
export type MoveCardInput = z.infer<typeof moveCardSchema>;
export type CreateCommentInput = z.infer<typeof createCommentSchema>;