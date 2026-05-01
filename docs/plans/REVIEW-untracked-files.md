# 🔍 Untracked Files Review — What Stays, What Goes, What Moves

**Date:** 2025-05-01  
**Total:** 56 markdown files across 5 directories (888KB)

---

## 📊 Inventory

```
docs/plans/    18 files  636KB  ← largest, needs most cleanup
docs/prd/       1 file   32KB
docs/adr/       5 files  16KB
docs/architecture/ 1 file  22KB
rules/         32 files 168KB
AGENTE.md      1 file    8KB  (root)
```

---

## ✅ KEEP — Essential, no changes needed

| File | Size | Why it stays |
|------|------|-------------|
| `docs/plans/IMPLEMENTATION-HUB.md` | 12KB | **THE hub** — references everything, controls execution |
| `docs/plans/2025-04-30-onboarding-tracker-phase1-foundation.md` | 56KB | Phase 1 plan — executable |
| `docs/plans/2025-04-30-onboarding-tracker-phase2-auth-crud.md` | 48KB | Phase 2 plan — executable |
| `docs/plans/2025-04-30-onboarding-tracker-phase3-templates.md` | 52KB | Phase 3 plan — executable |
| `docs/plans/2025-04-30-onboarding-tracker-phase4-notifications.md` | 56KB | Phase 4 plan — executable |
| `docs/plans/2025-05-01-onboarding-tracker-phase5-frontend-auth-dashboard.md` | 40KB | Phase 5 plan — executable |
| `docs/plans/2025-05-01-onboarding-tracker-phase6-frontend-kanban.md` | 52KB | Phase 6 plan — executable |
| `docs/plans/2025-05-01-onboarding-tracker-phase7-frontend-admin-e2e-ci.md` | 52KB | Phase 7 plan — executable |
| `docs/plans/REVIEW-implementation-plans.md` | 16KB | Review findings — needed until all fixes applied |
| `docs/prd/PRD-001-onboarding-tracker.md` | 32KB | Source of truth for product requirements |
| `docs/adr/ADR-0001-drizzle-over-prisma.md` | 4KB | ADR — permanent record |
| `docs/adr/ADR-0002-dual-mode-auth.md` | 3KB | ADR — permanent record |
| `docs/adr/ADR-0003-completion-detection.md` | 3KB | ADR — permanent record |
| `docs/adr/ADR-0004-template-variable-substitution.md` | 3KB | ADR — permanent record |
| `docs/adr/ADR-0005-event-bus-for-notifications.md` | 4KB | ADR — permanent record |
| `docs/architecture/plan-onboarding-tracker.md` | 22KB | Architecture decisions + component map |
| `AGENTE.md` | 8KB | AI session constitution — paste into every coding session |

**Subtotal: 17 files (~448KB)**

---

## ⚠️ KEEP but UPDATE — Content is useful but needs fixes or consolidation

| File | Size | Issue | Action |
|------|------|-------|--------|
| `docs/plans/2025-04-30-onboarding-tracker-design.md` | 88KB | **Superseded by Phase 1-7 plans.** This was the original "master plan" before we split it. Still useful as reference for data model, API endpoints, screens. | Add header: `> ⚠️ SUPERSEDED — Use Phase 1-7 plans for execution. This file is reference only for data model (§3), API design (§4), and screens (§5).` |
| `docs/plans/2025-04-30-onboarding-tracker-spec.md` | 32KB | This is the **spec document** from the brainstorming phase. Content overlaps with PRD but has different format. | Rename `spec.md` → `docs/prd/SPEC-001-onboarding-tracker-raw.md` or add header clarifying it's the raw brainstorming output, PRD is the cleaned version. |
| `docs/plans/PRE-SETUP-CHECKLIST.md` | 4KB | **Useful.** Contains Husky pre-commit hooks, env setup. But references `PostgreSQL 16+` in AGENTE.md note while we're using 17. Also, Phase 1 already includes `.env.example` and `docker-compose.yml`. | Keep. Fix PostgreSQL version reference. Add link from IMPLEMENTATION-HUB.md to this file. Content is complementary, not duplicating. |
| `docs/plans/STYLE-GUIDE.md` | 8KB | Grovva brandbook style guide (colors, typography, voice). **Useful for frontend phases**, but references "Grovva" branding which may not match. | Keep. Add note at top: `> Used in Phase 5-7 for frontend styling decisions. Adapt brand name/colors as needed.` |
| `AGENTE.md` | 8KB | References `PostgreSQL 16+` but project uses 17. References rules files without full paths. Missing link to IMPLEMENTATION-HUB.md. | Fix version to `PostgreSQL 17+`. Add `Hub: docs/plans/IMPLEMENTATION-HUB.md` at bottom. The SQL prevention guide reference is already there. |

**Subtotal: 5 files (~140KB)**

---

## 🔁 MOVE — Wrong location, should live elsewhere

| File | Current | Should Be | Why |
|------|---------|-----------|-----|
| `docs/plans/2026-04-27-vibe-coding-sql-errors-research.md` | `docs/plans/` | `docs/research/` | This is **research**, not an implementation plan. Creates false impression it's a phase plan due to the date prefix. |
| `docs/plans/2026-04-27-agent-sql-prevention-guide.md` | `docs/plans/` | `docs/research/` or reference from AGENTE.md | Same — it's a **guide derived from research**, not a phase plan. |
| `docs/plans/REFERENCE-kan-focalboard-extraction.md` | `docs/plans/` | `docs/research/` | Schema patterns extracted from Kan/Focalboard — reference material. |
| `docs/plans/REFERENCE-kan-focalboard-ui-ux.md` | `docs/plans/` | `docs/research/` | UI/UX patterns extracted from Kan/Focalboard — reference material. |
| `rules/` (32 files) | project root | `docs/rules/` or keep at root | **OK at root** — these are consumed by AI agents at session start. Root is conventional for agent rules. Keep here. |

**Action:**
```bash
mkdir -p docs/research
mv docs/plans/2026-04-27-vibe-coding-sql-errors-research.md docs/research/
mv docs/plans/2026-04-27-agent-sql-prevention-guide.md docs/research/
mv docs/plans/REFERENCE-kan-focalboard-extraction.md docs/research/
mv docs/plans/REFERENCE-kan-focalboard-ui-ux.md docs/research/
```

Then update all references:
- `IMPLEMENTATION-HUB.md` → update SQL Safety Checklist link from `./2026-04-27-vibe-coding-sql-errors-research.md` to `../research/2026-04-27-vibe-coding-sql-errors-research.md`
- `AGENTE.md` → update reference paths

**Subtotal: 4 files moved (~116KB)**

---

## ❌ REMOVE — Redundant or will be created by scaffolding

| File | Size | Why remove |
|------|------|-----------|
| None yet | — | No file should be outright deleted at this point |

> **Note:** After Phase 1 executes, the `docs/plans/2025-04-30-onboarding-tracker-design.md` could theoretically be archived since all content is in the Phase 1-7 files. But it's still useful as a cross-reference. **Don't delete — just mark as superseded.**

---

## 🔗 Missing Cross-References to Add

| From | To | What to add |
|------|----|-------------|
| `IMPLEMENTATION-HUB.md` | `PRE-SETUP-CHECKLIST.md` | Add link in Quick Start section: "Before Phase 1: complete [PRE-SETUP-CHECKLIST](./PRE-SETUP-CHECKLIST.md)" |
| `IMPLEMENTATION-HUB.md` | `STYLE-GUIDE.md` | Add note in Phase 5-6 sections: "Styling: follow [STYLE-GUIDE](./STYLE-GUIDE.md)" |
| `IMPLEMENTATION-HUB.md` | `docs/research/` (after move) | SQL Safety Checklist already links to vibe-coding research — update path |
| `AGENTE.md` | `IMPLEMENTATION-HUB.md` | Already referenced at bottom ✅ |
| `AGENTE.md` | `rules/` | Already referenced by filename ✅ |
| Each Phase plan header | `IMPLEMENTATION-HUB.md` | Add: `> **Hub:** [IMPLEMENTATION-HUB.md](./IMPLEMENTATION-HUB.md)` |
| `PRE-SETUP-CHECKLIST.md` | `AGENTE.md` | Already references AGENTE.md ✅ |
| `PRE-SETUP-CHECKLIST.md` | `IMPLEMENTATION-HUB.md` | Missing — add at top |

---

## 📋 Summary of Actions

### Run Now (before execution)

```bash
# 1. Create research directory and move non-plan files
mkdir -p docs/research
mv docs/plans/2026-04-27-vibe-coding-sql-errors-research.md docs/research/
mv docs/plans/2026-04-27-agent-sql-prevention-guide.md docs/research/
mv docs/plans/REFERENCE-kan-focalboard-extraction.md docs/research/
mv docs/plans/REFERENCE-kan-focalboard-ui-ux.md docs/research/

# 2. Fix PostgreSQL version in AGENTE.md (16 → 17)

# 3. Add superseded header to design.md

# 4. Add cross-references (see table above)
```

### File Count After Cleanup

| Directory | Before | After | Change |
|-----------|--------|-------|--------|
| `docs/plans/` | 18 | 14 | -4 (moved to research) |
| `docs/research/` | 0 | 4 | +4 (new) |
| `docs/prd/` | 1 | 1 | — |
| `docs/adr/` | 5 | 5 | — |
| `docs/architecture/` | 1 | 1 | — |
| `rules/` | 32 | 32 | — |
| root | 1 | 1 | — |
| **Total** | **58** | **58** | reorganized, not removed |

### Final docs/plans/ Contents (execution-ready)

```
docs/plans/
├── IMPLEMENTATION-HUB.md          ← THE hub
├── PRE-SETUP-CHECKLIST.md         ← run before Phase 1
├── REVIEW-implementation-plans.md ← review findings
├── STYLE-GUIDE.md                 ← frontend styling reference
├── 2025-04-30-onboarding-tracker-spec.md      ← raw brainstorming
├── 2025-04-30-onboarding-tracker-design.md     ← superseded reference
├── 2025-04-30-onboarding-tracker-phase1-foundation.md
├── 2025-04-30-onboarding-tracker-phase2-auth-crud.md
├── 2025-04-30-onboarding-tracker-phase3-templates.md
├── 2025-04-30-onboarding-tracker-phase4-notifications.md
├── 2025-05-01-onboarding-tracker-phase5-frontend-auth-dashboard.md
├── 2025-05-01-onboarding-tracker-phase6-frontend-kanban.md
└── 2025-05-01-onboarding-tracker-phase7-frontend-admin-e2e-ci.md
```

### Final docs/research/ Contents (reference material)

```
docs/research/
├── 2026-04-27-vibe-coding-sql-errors-research.md
├── 2026-04-27-agent-sql-prevention-guide.md
├── REFERENCE-kan-focalboard-extraction.md
└── REFERENCE-kan-focalboard-ui-ux.md
```