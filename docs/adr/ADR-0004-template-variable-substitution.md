---
title: "Template variable substitution at creation time, not live binding"
date: 2025-04-30
status: Proposed
---

# ADR-0004: Template Variable Substitution at Creation Time

## Context

Onboarding Tracker templates support variable placeholders like `{{client_name}}` in list titles, card titles, and card descriptions. When a template is applied to create a new board, these variables must be resolved.

There are two fundamental approaches:
1. **Resolution at creation time** — variables are replaced with actual values when the board is created. The board stores the resolved text, and the template retains the `{{key}}` syntax.
2. **Live binding** — the board stores variable references and resolves them dynamically at read time. Changing a variable value would update all boards using that template.

## Decision

Variables are **resolved at creation time**. The board stores the final, substituted text. Template changes do NOT propagate to already-created boards (FR-TEMPL-008).

## Alternatives Considered

### A: Live binding (dynamic resolution)

- Board stores variable references, resolves on every read
- **Pros**: Changing client name retroactively updates all boards
- **Cons**: Complex query pipeline, performance cost on every read, broken references if template is deleted, unexpected UI behavior (text changes without user action)
- **Rejected**: Over-engineering for V1. The primary use case is "fill variables once, never change them."

### B: Resolution at creation time (chosen)

- Simple: `resolveTemplateVariables(text, variables)` runs once during board creation
- Board is fully independent after creation
- Team can freely edit any card/list text after creation
- **Pros**: Simple, fast reads, no cross-reference complexity, boards are truly independent
- **Cons**: Cannot batch-update client name across boards if it changes

## Consequences

**Positive:**
- Boards are fully independent — no coupling to template after creation
- Read performance is optimal (no resolution step)
- Team can freely customize any card/list text post-creation
- Deletion of a template does not affect existing boards
- Simple mental model: "template is a recipe, board is the dish"

**Negative:**
- If a client name changes, each board must be updated individually
- Template improvements don't retroactively apply to old boards
- No trace of which `{{key}}` resolved to what value (variable context is lost after creation)

**Mitigations:**
- Board stores `template_id` reference for informational purposes (shows which template was used)
- If retrospective variable update is needed in V2, add a "re-apply variables" bulk action
- For traceability, the template application request (input variables) can be logged in a `board_creation_log` table in V2