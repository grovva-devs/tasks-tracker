// Schema barrel export — order matters for circular dependency resolution
// Base tables first (no FK references), then tables that reference them
export { users } from "./users";
export { boards, boardsRelations } from "./boards";
export { lists, listsRelations } from "./lists";
export { cards, cardsRelations } from "./cards";
export { cardComments, cardCommentsRelations } from "./card-comments";
export { cardAttachments, cardAttachmentsRelations } from "./card-attachments";
export { cardAssignees, cardAssigneesRelations } from "./card-assignees";
export { labels, labelsRelations } from "./labels";
export { cardLabels, cardLabelsRelations } from "./card-labels";
export { templateCategories } from "./template-categories";
export { templates, templatesRelations } from "./templates";
export { templateVariables, templateVariablesRelations } from "./template-variables";
export { templateLists, templateListsRelations } from "./template-lists";
export { templateCards, templateCardsRelations } from "./template-cards";
export { webhooks } from "./webhooks";
export { webhookDeliveries, webhookDeliveriesRelations } from "./webhook-deliveries";
export { notifications } from "./notifications";
export { settings } from "./settings";
export { boardActivities, boardActivitiesRelations } from "./board-activities";
export { boardMembers, boardMembersRelations } from "./board-members";