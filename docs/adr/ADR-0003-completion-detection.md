---
title: "Completion detection via list title substring matching"
date: 2025-04-30
status: Proposed
---

# ADR-0003: Completion Detection via List Title Substring Matching

## Context

Onboarding Tracker needs to automatically detect when a card is "completed". This drives board completion percentage, client notification emails, and webhook events (BR-001, BR-002).

The core question: how does the system know which lists represent "completion" (i.e., cards in this list are done)?

## Decision

A card is considered "completed" when it is moved to a list whose **title** (case-insensitive, trimmed) contains any of these substrings:

- `done`
- `complete`
- `concluído`
- `concluido`
- `finalizado`

When a card enters such a list, `completed_at` is set to the current timestamp. When it leaves, `completed_at` is cleared.

## Alternatives Considered

### A: Explicit `is_completion_list` boolean flag on lists

- Admin explicitly marks a list as "completion list"
- **Pros**: Unambiguous, no false positives, works with any language
- **Cons**: Extra configuration step, easy to forget when creating new lists, migration needed on existing data

### B: Position-based (last list = completion)

- Cards in the rightmost list are "done"
- **Rejected**: Breaks when lists are reordered. Assumes kanban flows left→right.

### C: Substring matching on list title (chosen)

- Zero config — works automatically when team uses conventional names
- Covers English and Portuguese variants
- **Pros**: No extra UI, no migration, intuitive (lists called "Done" just work)
- **Cons**: False positive risk (e.g., a list called "Pending Doneness Review"), language-limited

## Consequences

**Positive:**
- Zero configuration — works out of the box with standard naming
- No migration needed to add a column
- Team members understand it intuitively (lists called "Done" mean done)
- Supports both English and Portuguese (primary language for the team)

**Negative:**
- False positives: a list named "Not Done Yet" would match `done`
- Language-limited: only English and Portuguese keywords in V1
- Implicit behavior — not visible in the UI that a list is a "completion list"

**Mitigations:**
- Document the exact matching rules clearly in-app (tooltip or help text)
- The keywords chosen are unlikely to appear in common non-completion list names
- V2 enhancement: add explicit `is_completion_list` flag as an override, making the system both auto-detect AND explicitly configurable
- V2 enhancement: allow admin to configure custom completion keywords

**Implementation detail**: The matching function is a pure utility in `packages/shared`:

```typescript
const COMPLETION_KEYWORDS = ['done', 'complete', 'concluído', 'concluido', 'finalizado'];

export function isCompletionList(listTitle: string): boolean {
  const normalized = listTitle.trim().toLowerCase();
  return COMPLETION_KEYWORDS.some(kw => normalized.includes(kw));
}
```

This is easily testable and extensible.