import { describe, it, expect } from "vitest";
import { resolveTemplateVariables } from "./template-resolver";

describe("resolveTemplateVariables", () => {
  it("replaces a single variable", () => {
    expect(
      resolveTemplateVariables("Welcome {{client_name}}!", {
        client_name: "Acme",
      }),
    ).toBe("Welcome Acme!");
  });

  it("replaces multiple different variables", () => {
    expect(
      resolveTemplateVariables("{{client_name}} - {{service_type}}", {
        client_name: "Acme",
        service_type: "SaaS",
      }),
    ).toBe("Acme - SaaS");
  });

  it("replaces same variable multiple times", () => {
    expect(
      resolveTemplateVariables("{{name}} and {{name}} again", {
        name: "Foo",
      }),
    ).toBe("Foo and Foo again");
  });

  it("leaves unreplaced variables intact when no value provided", () => {
    expect(resolveTemplateVariables("Hello {{unknown}}", {})).toBe(
      "Hello {{unknown}}",
    );
  });

  it("handles empty string", () => {
    expect(resolveTemplateVariables("", { client_name: "Acme" })).toBe("");
  });

  it("handles string with no variables", () => {
    expect(resolveTemplateVariables("No vars here", {})).toBe("No vars here");
  });

  it("ignores malformed variable syntax", () => {
    expect(resolveTemplateVariables("{single} {{}} {{ space }}", {})).toBe(
      "{single} {{}} {{ space }}",
    );
  });
});