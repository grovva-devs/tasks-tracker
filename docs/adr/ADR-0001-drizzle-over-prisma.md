---
title: "Use Drizzle ORM over Prisma"
date: 2025-04-30
status: Proposed
---

# ADR-0001: Use Drizzle ORM over Prisma

## Context

Onboarding Tracker needs a TypeScript ORM for PostgreSQL 17 to handle 16 tables with relationships, migrations, and type-safe queries. Two primary candidates exist in the ecosystem:

- **Prisma**: Most popular TS ORM, declarative schema (`.prisma` files), auto-generated client, mature migration system, large community.
- **Drizzle ORM**: Lightweight, SQL-like API, type inference from schema, zero-runtime overhead, Drizzle Kit for migrations.

Both are production-ready and support PostgreSQL 17.

## Decision

We will use **Drizzle ORM** as the data layer for the NestJS backend.

## Rationale

| Factor | Drizzle | Prisma |
|--------|---------|--------|
| Bundle size | ~50KB | ~10MB (engines) |
| Query style | SQL-like, explicit | Abstract, auto-generated |
| Type safety | Inferred from schema, no codegen step | Requires `prisma generate` step |
| NestJS integration | No special integration needed — just import and use | `@nestjs/prisma` module exists but adds ceremony |
| Migration tooling | Drizzle Kit (generate + migrate) | Prisma Migrate (built-in) |
| Runtime overhead | Near-zero | Prisma Engine binary (~10MB) |
| Schema definition | TypeScript files (in codebase) | `.prisma` DSL (separate language) |
| Community | Growing rapidly, used by Kan, Cal.com | Largest TS ORM community |

Key reasons:

1. **No code generation step** — Drizzle schemas are plain TypeScript, so types stay in sync without a build step. This reduces friction in a monorepo where `packages/shared` exports types that must match the DB schema.
2. **SQL-like API** — The team can write queries that closely match the SQL they'd write manually, making debugging and performance tuning transparent.
3. **No binary engine** — Prisma's Rust query engine adds ~10MB and can cause issues in Docker/arm64 environments. Drizzle uses the `postgres` JS driver directly.
4. **Lighter abstraction** — For a single-org system with known query patterns, a lightweight ORM is more appropriate than Prisma's full abstraction layer.
5. **Schema-as-code** — Drizzle schema files are TypeScript, making them composable and diffable in code review.

## Consequences

**Positive:**
- Faster CI builds (no `prisma generate` step)
- Smaller Docker images (no engine binary)
- SQL-level control for Dashboard aggregation queries
- Schema files can be shared with `packages/shared` for type alignment

**Negative:**
- Less mature migration tooling than Prisma Migrate
- Smaller community — fewer StackOverflow answers for edge cases
- No Prisma Studio equivalent (Drizzle Studio exists but is newer)
- Relations are defined separately from tables (more verbose for complex joins)
- Some N+1 query patterns are easier to fall into without Prisma's `include` syntax

**Mitigation for negatives:**
- Use Drizzle Studio for local DB inspection
- Write repository layer in NestJS services to encapsulate queries and avoid N+1
- If Drizzle proves problematic before data exists in production, migrating to Prisma is straightforward (the schema is simple — 16 tables, no exotic features)