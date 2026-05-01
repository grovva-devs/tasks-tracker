const COMPLETION_KEYWORDS = [
  "done",
  "complete",
  "concluído",
  "concluido",
  "finalizado",
];

/**
 * Determines if a list title indicates a "completion" list.
 * Cards moved into a completion list are marked as done (completed_at set).
 */
export function isCompletionList(listTitle: string): boolean {
  const normalized = listTitle.trim().toLowerCase();
  if (normalized.length === 0) return false;
  return COMPLETION_KEYWORDS.some((kw) => normalized.includes(kw));
}