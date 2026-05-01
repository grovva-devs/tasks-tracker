/**
 * Replaces {{key}} placeholders in text with provided variable values.
 * Only matches word-character keys: {{client_name}}, {{start_date}}, {{service_type_2}}
 * Unmatched keys are left as-is (no removal).
 */
export function resolveTemplateVariables(
  text: string,
  variables: Record<string, string>,
): string {
  return text.replace(/\{\{(\w+)\}\}/g, (match, key: string) => {
    return variables[key] ?? match;
  });
}