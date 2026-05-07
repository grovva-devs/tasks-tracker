/**
 * Canonical event names for the internal event bus.
 * These are the contract between CRUD modules and the notifications pipeline.
 */
export const EVENTS = {
  BOARD_CREATED: "board.created",
  BOARD_COMPLETED: "board.completed",
  CARD_CREATED: "card.created",
  CARD_MOVED: "card.moved",
  CARD_COMPLETED: "card.completed",
  CARD_OVERDUE: "card.overdue",
  CARD_DUE_SOON: "card.due_soon",
  CARD_ASSIGNED: "card.assigned",
  COMMENT_ADDED: "comment.added",
  LIST_CREATED: "list.created",
} as const;

export type EventName = (typeof EVENTS)[keyof typeof EVENTS];

/** Webhook event payload structure */
export interface WebhookPayload {
  event: EventName;
  timestamp: string;
  [key: string]: unknown;
}