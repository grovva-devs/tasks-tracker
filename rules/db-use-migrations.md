---
title: Use Database Migrations
impact: HIGH
impactDescription: Enables safe, repeatable database schema changes
tags: database, migrations, drizzle, schema
---

## Use Database Migrations

Never use `drizzle-kit push` in production. Use `drizzle-kit generate` + `drizzle-kit migrate` for all schema changes. Migrations provide version control for your database, enable safe rollbacks, and ensure consistency across all environments.

**Incorrect (using push or manual SQL):**

```typescript
// drizzle-kit push in production — DANGEROUS!
// Manual SQL in production
@Injectable()
export class DatabaseService {
  async addColumn(): Promise<void> {
    await this.db.execute(sql`ALTER TABLE users ADD COLUMN age integer DEFAULT 0`);
    // No version control, no rollback, inconsistent across envs
  }
}

// Forget to export table from schema/index.ts
// Drizzle Kit won't see it — migration is incomplete
```

**Correct (use Drizzle Kit migrations):**

```typescript
// 1. Define schema with ALL tables exported from schema/index.ts
// schema/index.ts
export { users } from './users';
export { orders } from './orders';

// 2. Generate migrations from schema changes
// $ drizzle-kit generate

// 3. Review the generated SQL BEFORE applying

// 4. Apply migrations
// $ drizzle-kit migrate

// 5. Configure drizzle.config.ts
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/db/schema/index.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: { url: process.env.DATABASE_URL! },
  verbose: true,
  strict: true,
});

// 6. For large tables, edit migration SQL to use CONCURRENTLY
// CREATE INDEX CONCURRENTLY "idx_users_email" ON "users" ("email");

// 7. Safe column additions on large tables
// Step 1: Add column as nullable
// ALTER TABLE "users" ADD COLUMN "full_name" text;
// Step 2: Backfill
// UPDATE "users" SET "full_name" = "name" WHERE "full_name" IS NULL;
// Step 3: Add NOT NULL in next migration

// 8. Run migrations on app startup (production only)
import { migrate } from 'drizzle-orm/node-postgres/migrator';
if (process.env.NODE_ENV === 'production') {
  await migrate(db, { migrationsFolder: './drizzle' });
}
```

Reference: [Drizzle Kit Migrations](https://orm.drizzle.team/docs/migrations)