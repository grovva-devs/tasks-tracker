/**
 * Validates that all required template variables are provided in the input.
 * Returns an array of missing variable keys (empty if all valid).
 */
export function validateRequiredVariables(
  templateVariables: { key: string; isRequired: boolean }[],
  providedVariables: Record<string, string>,
): string[] {
  return templateVariables
    .filter((v) => v.isRequired && !providedVariables[v.key])
    .map((v) => v.key);
}