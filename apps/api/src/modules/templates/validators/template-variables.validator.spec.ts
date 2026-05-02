import { describe, it, expect } from "vitest";
import { validateRequiredVariables } from "./template-variables.validator";

describe("validateRequiredVariables", () => {
  it("returns empty array when all required vars provided", () => {
    const vars = [
      { key: "client_name", isRequired: true },
      { key: "service_type", isRequired: true },
    ];
    const provided = { client_name: "Acme", service_type: "SaaS" };
    expect(validateRequiredVariables(vars, provided)).toEqual([]);
  });

  it("returns missing required variable keys", () => {
    const vars = [
      { key: "client_name", isRequired: true },
      { key: "service_type", isRequired: true },
    ];
    const provided = { client_name: "Acme" };
    expect(validateRequiredVariables(vars, provided)).toEqual(["service_type"]);
  });

  it("ignores optional variables even when missing", () => {
    const vars = [
      { key: "client_name", isRequired: true },
      { key: "notes", isRequired: false },
    ];
    const provided = { client_name: "Acme" };
    expect(validateRequiredVariables(vars, provided)).toEqual([]);
  });

  it("returns all missing when nothing provided", () => {
    const vars = [
      { key: "a", isRequired: true },
      { key: "b", isRequired: true },
      { key: "c", isRequired: false },
    ];
    expect(validateRequiredVariables(vars, {})).toEqual(["a", "b"]);
  });

  it("handles empty template variables", () => {
    expect(validateRequiredVariables([], { anything: "here" })).toEqual([]);
  });
});