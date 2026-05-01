# Phase 1: Foundation — Implementation Plan

> **REQUIRED SUB-SKILL:** Use the executing-plans skill to implement this plan task-by-task.

**Goal:** Set up the monorepo workspace, shared types/schemas/utils package, NestJS backend with database schema, and Next.js frontend scaffold.

**Architecture:** Turborepo + pnpm monorepo with `apps/api` (NestJS), `apps/web` (Next.js), `packages/shared` (types + schemas + utils), and `tooling/` (shared configs). PostgreSQL 17 + MinIO in Docker Compose for local dev. Drizzle ORM for database access.

**Tech Stack:** pnpm 10, Turborepo 2, NestJS 11, Next.js 15, Drizzle ORM, PostgreSQL 17, MinIO, Tailwind CSS 4, Shadcn/ui, Zod, Vitest

**PRD:** `docs/prd/PRD-001-onboarding-tracker.md`
**Design:** `docs/plans/2025-04-30-onboarding-tracker-design.md`
**Plan:** `docs/architecture/plan-onboarding-tracker.md`
**Rules Hub:** `docs/plans/IMPLEMENTATION-HUB.md`
**SQL Prevention Guide:** `docs/plans/2026-04-27-agent-sql-prevention-guide.md`

---

## 🏛️ CONSTITUIÇÃO DO BANCO DE DADOS — OBRIGATÓRIO NESTA PHASE

> Antes de gerar QUALQUER código de banco de dados, o agente DEVE seguir estas regras.
> Referência completa: `docs/plans/IMPLEMENTATION-HUB.md` e `rules/`

```
1. NUNCA use sql.raw() com interpolação — use sql`` template tag ou query builder
2. NUNCA faça queries em loop (N+1) — usar db.query com with ou JOINs
3. TODA coluna FK DEVE ter index() explícito no schema (PostgreSQL não cria automático!)
4. Sempre use .returning() em INSERT e UPDATE
5. Especifique colunas no SELECT — nunca select all
6. Use drizzle-kit generate — NUNCA drizzle-kit push em produção
7. TODA tabela de entidade principal (boards, lists, cards, comments) DEVE ter `deletedAt` + `deletedBy` (soft delete)
8. TODA operação que altera card DEVE criar activity log em `board_activities`
9. Junction tables (card_assignees, card_labels) DEVEM ter primaryKey() composto explícito
10. Adicionar índices: card(list_id), notification(user_id, is_read), board(status)
7. Conexão Drizzle via useFactory — nunca no construtor do módulo
8. Sempre exporte tabelas do schema/index.ts (senão migrations quebram)
9. Use pgEnum para status/type columns — não plain strings
10. Use uuid para IDs — nunca int serial (evita enumeração)
```

**Rules desta phase:**
- `rules/db-fk-indexes.md` → Toda FK com index() explícito
- `rules/db-use-migrations.md` → drizzle-kit generate, nunca push
- `rules/db-lazy-connection.md` → Conexão via NestJS useFactory
- `rules/db-use-returning.md` → .returning() em INSERT/UPDATE
- `rules/db-select-columns.md` → Nunca SELECT *
- `rules/db-prevent-sql-injection.md` → Nunca sql.raw()

---

### Task 1: Monorepo Root Scaffolding

**TDD scenario:** No TDD — project scaffolding only

**Files:**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `turbo.json`
- Create: `.gitignore`
- Create: `.env.example`
- Create: `docker-compose.yml`

**Step 1: Create project directory and initialize**

```bash
mkdir -p onboarding-tracker && cd onboarding-tracker
git init
```

**Step 2: Create root package.json**

Create `package.json`:

```json
{
  "name": "onboarding-tracker",
  "private": true,
  "scripts": {
    "dev": "turbo dev",
    "build": "turbo build",
    "lint": "turbo lint",
    "test": "turbo test",
    "db:generate": "turbo db:generate",
    "db:migrate": "turbo db:migrate",
    "db:studio": "turbo db:studio"
  },
  "devDependencies": {
    "turbo": "^2.5.0",
    "prettier": "^3.5.0"
  },
  "packageManager": "pnpm@10.12.0"
}
```

**Step 3: Create pnpm workspace config**

Create `pnpm-workspace.yaml`:

```yaml
packages:
  - "apps/*"
  - "packages/*"
  - "tooling/*"
```

**Step 4: Create turbo.json**

Create `turbo.json`:

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {
      "dependsOn": ["^build"]
    },
    "test": {
      "dependsOn": ["^build"]
    },
    "test:watch": {
      "cache": false,
      "persistent": true
    },
    "db:generate": {
      "cache": false
    },
    "db:migrate": {
      "cache": false
    },
    "db:studio": {
      "cache": false
    }
  }
}
```

**Step 5: Create .gitignore**

Create `.gitignore`:

```
node_modules
dist
.next
.env
.env.local
.turbo
*.tsbuildinfo
coverage
.DS_Store
```

**Step 6: Create .env.example**

Create `.env.example`:

```env
# Database
DATABASE_URL=postgres://postgres:postgres@localhost:5432/onboarding_tracker

# JWT
JWT_SECRET=change-me-to-a-long-random-string-at-least-32-chars

# Storage (S3-compatible / MinIO)
S3_ENDPOINT=http://localhost:9000
S3_ACCESS_KEY_ID=minioadmin
S3_SECRET_ACCESS_KEY=minioadmin
S3_BUCKET=onboarding-tracker
S3_REGION=us-east-1

# Email
EMAIL_FROM=onboarding@yourcompany.com
SMTP_HOST=smtp.resend.com
SMTP_PORT=465
SMTP_USER=resend
SMTP_PASSWORD=re_xxxx

# App
NEXT_PUBLIC_API_URL=http://localhost:3001
API_PORT=3001
```

**Step 7: Create docker-compose.yml**

Create `docker-compose.yml`:

```yaml
services:
  postgres:
    image: postgres:17
    environment:
      POSTGRES_DB: onboarding_tracker
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5432:5432"
    volumes:
      - pg_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5

  minio:
    image: minio/minio:latest
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    ports:
      - "9000:9000"
      - "9001:9001"
    volumes:
      - minio_data:/data

volumes:
  pg_data:
  minio_data:
```

**Step 8: Create tooling packages**

Create `tooling/typescript/package.json`:

```json
{
  "name": "@onboarding-tracker/tooling-typescript",
  "private": true,
  "files": ["base.json", "internal-package.json"]
}
```

Create `tooling/typescript/base.json`:

```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "compilerOptions": {
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "moduleResolution": "bundler",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "noUncheckedIndexedAccess": true
  },
  "exclude": ["node_modules", "dist"]
}
```

Create `tooling/typescript/internal-package.json`:

```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "extends": "./base.json",
  "compilerOptions": {
    "composite": true
  }
}
```

Create `tooling/eslint/package.json`:

```json
{
  "name": "@onboarding-tracker/tooling-eslint",
  "private": true,
  "files": ["base.js"]
}
```

Create `tooling/eslint/base.js`:

```js
const { resolve } = require("node:path");

const project = resolve(__dirname, "..", "..", "tsconfig.json");

/** @type {import("eslint").Linter.Config} */
module.exports = {
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "prettier",
  ],
  plugins: ["@typescript-eslint"],
  env: {
    node: true,
    es2023: true,
  },
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project,
  },
  settings: {
    "import/resolver": {
      typescript: {
        project,
      },
    },
  },
  ignorePatterns: [".*.js", "dist/**"],
  rules: {
    "@typescript-eslint/no-unused-vars": [
      "warn",
      { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
    ],
    "@typescript-eslint/no-explicit-any": "warn",
  },
};
```

Create `tooling/prettier/package.json`:

```json
{
  "name": "@onboarding-tracker/tooling-prettier",
  "private": true,
  "files": ["index.js"]
}
```

Create `tooling/prettier/index.js`:

```js
/** @type {import("prettier").Config} */
module.exports = {
  semi: true,
  singleQuote: true,
  trailingComma: "all",
  printWidth: 100,
  tabWidth: 2,
};
```

**Step 9: Install root dependencies**

```bash
pnpm install
```

**Step 10: Verify Turborepo picks up workspace**

```bash
pnpm turbo build --dry-run
```

Expected: Output shows workspace package list (empty apps for now, but no errors)

**Step 11: Commit**

```bash
git add -A
git commit -m "chore: scaffold monorepo with Turborepo, pnpm, Docker Compose, and tooling"
```

---

### Task 2: Shared Package — Types, Schemas, and Utils

**TDD scenario:** Full TDD cycle — pure functions and schemas, easy to test

**Files:**
- Create: `packages/shared/package.json`
- Create: `packages/shared/tsconfig.json`
- Create: `packages/shared/vitest.config.ts`
- Create: `packages/shared/src/index.ts`
- Create: `packages/shared/src/types/index.ts`
- Create: `packages/shared/src/schemas/index.ts`
- Create: `packages/shared/src/utils/template-resolver.ts`
- Create: `packages/shared/src/utils/slug.ts`
- Create: `packages/shared/src/utils/completion-detection.ts`
- Create: `packages/shared/src/constants/events.ts`
- Create: `packages/shared/src/constants/index.ts`
- Test: `packages/shared/src/utils/template-resolver.test.ts`
- Test: `packages/shared/src/utils/slug.test.ts`
- Test: `packages/shared/src/utils/completion-detection.test.ts`

**Step 1: Create package.json for shared**

Create `packages/shared/package.json`:

```json
{
  "name": "@onboarding-tracker/shared",
  "version": "0.0.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "eslint src/",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "zod": "^3.24.0"
  },
  "devDependencies": {
    "typescript": "^5.8.0",
    "vitest": "^3.1.0",
    "@types/node": "^22.0.0"
  }
}
```

**Step 2: Create tsconfig.json**

Create `packages/shared/tsconfig.json`:

```json
{
  "extends": "../../tooling/typescript/internal-package.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
```

**Step 3: Create vitest.config.ts**

Create `packages/shared/vitest.config.ts`:

```typescript
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
  },
});
```

**Step 4: Write failing test for template resolver**

Create `packages/shared/src/utils/template-resolver.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { resolveTemplateVariables } from "./template-resolver";

describe("resolveTemplateVariables", () => {
  it("replaces a single variable", () => {
    expect(
      resolveTemplateVariables("Welcome {{client_name}}!", {
        client_name: "Acme",
      })
    ).toBe("Welcome Acme!");
  });

  it("replaces multiple different variables", () => {
    expect(
      resolveTemplateVariables("{{client_name}} - {{service_type}}", {
        client_name: "Acme",
        service_type: "SaaS",
      })
    ).toBe("Acme - SaaS");
  });

  it("replaces same variable multiple times", () => {
    expect(
      resolveTemplateVariables("{{name}} and {{name}} again", {
        name: "Foo",
      })
    ).toBe("Foo and Foo again");
  });

  it("leaves unreplaced variables intact when no value provided", () => {
    expect(resolveTemplateVariables("Hello {{unknown}}", {})).toBe(
      "Hello {{unknown}}"
    );
  });

  it("handles empty string", () => {
    expect(resolveTemplateVariables("", { client_name: "Acme" })).toBe("");
  });

  it("handles string with no variables", () => {
    expect(resolveTemplateVariables("No vars here", {})).toBe(
      "No vars here"
    );
  });

  it("ignores malformed variable syntax", () => {
    expect(resolveTemplateVariables("{single} {{}} {{ space }}", {})).toBe(
      "{single} {{}} {{ space }}"
    );
  });
});
```

**Step 5: Run test to verify it fails**

```bash
cd packages/shared && pnpm test
```

Expected: FAIL — `Cannot find module './template-resolver'`

**Step 6: Implement template resolver**

Create `packages/shared/src/utils/template-resolver.ts`:

```typescript
/**
 * Replaces {{key}} placeholders in text with provided variable values.
 * Only matches word-character keys: {{client_name}}, {{start_date}}, {{service_type_2}}
 * Unmatched keys are left as-is (no removal).
 */
export function resolveTemplateVariables(
  text: string,
  variables: Record<string, string>
): string {
  return text.replace(/\{\{(\w+)\}\}/g, (match, key: string) => {
    return variables[key] ?? match;
  });
}
```

**Step 7: Run test to verify it passes**

```bash
cd packages/shared && pnpm test
```

Expected: 7 tests PASS

**Step 8: Write failing test for slug generator**

Create `packages/shared/src/utils/slug.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { generateSlug } from "./slug";

describe("generateSlug", () => {
  it("converts to lowercase and replaces spaces with hyphens", () => {
    expect(generateSlug("My Board Name")).toBe("my-board-name");
  });

  it("removes special characters", () => {
    expect(generateSlug("Board #123! @Test")).toBe("board-123-test");
  });

  it("collapses multiple spaces/hyphens into single hyphen", () => {
    expect(generateSlug("A   B")).toBe("a-b");
  });

  it("trims hyphens from ends", () => {
    expect(generateSlug("  hello world  ")).toBe("hello-world");
  });

  it("handles accented characters by removing them", () => {
    expect(generateSlug("Cliente Especial')).toBe("cliente-especial");
  });

  it("returns empty string for input with no valid chars", () => {
    expect(generateSlug("@@@!!!")).toBe("");
  });
});
```

**Step 9: Run test to verify it fails**

```bash
cd packages/shared && pnpm test
```

**Step 10: Implement slug generator**

Create `packages/shared/src/utils/slug.ts`:

```typescript
/**
 * Generates a URL-friendly slug from text.
 * Lowercases, removes special chars, replaces spaces with hyphens.
 */
export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove diacritics
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/--+/g, "-");
}
```

**Step 11: Run test to verify it passes**

```bash
cd packages/shared && pnpm test
```

**Step 12: Write failing test for completion detection**

Create `packages/shared/src/utils/completion-detection.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { isCompletionList } from "./completion-detection";

describe("isCompletionList", () => {
  it("detects 'Done' as completion list", () => {
    expect(isCompletionList("Done")).toBe(true);
  });

  it("detects 'done' (lowercase)", () => {
    expect(isCompletionList("done")).toBe(true);
  });

  it("detects 'Completed' as completion list", () => {
    expect(isCompletionList("Completed")).toBe(true);
  });

  it("detects 'Concluído' (Portuguese)", () => {
    expect(isCompletionList("Concluído")).toBe(true);
  });

  it("detects 'Concluido' (no accent)", () => {
    expect(isCompletionList("Concluido")).toBe(true);
  });

  it("detects 'Finalizado' (Portuguese)", () => {
    expect(isCompletionList("Finalizado")).toBe(true);
  });

  it("detects substring in longer title like 'All Done Tasks'", () => {
    expect(isCompletionList("All Done Tasks")).toBe(true);
  });

  it("does NOT match 'Pending' as completion", () => {
    expect(isCompletionList("Pending")).toBe(false);
  });

  it("does NOT match 'In Progress' as completion", () => {
    expect(isCompletionList("In Progress")).toBe(false);
  });

  it("handles whitespace", () => {
    expect(isCompletionList("  Done  ")).toBe(true);
  });

  it("handles empty string", () => {
    expect(isCompletionList("")).toBe(false);
  });
});
```

**Step 13: Run test to verify it fails**

```bash
cd packages/shared && pnpm test
```

**Step 14: Implement completion detection**

Create `packages/shared/src/utils/completion-detection.ts`:

```typescript
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
```

**Step 15: Run test to verify it passes**

```bash
cd packages/shared && pnpm test
```

Expected: All 3 test suites PASS (7 + 6 + 11 = 24 tests)

**Step 16: Create Zod schemas**

Create `packages/shared/src/schemas/board.ts`:

```typescript
import { z } from "zod";

export const createBoardSchema = z.object({
  title: z.string().min(1, "Title is required").max(255),
  description: z.string().max(5000).optional(),
  clientName: z.string().min(1, "Client name is required").max(255),
  clientEmail: z.string().email("Invalid email").optional(),
  templateId: z.string().uuid().optional(),
  variables: z.record(z.string(), z.string()).optional(),
});

export const updateBoardSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().max(5000).optional(),
  clientName: z.string().min(1).max(255).optional(),
  clientEmail: z.string().email().optional().nullable(),
  status: z.enum(["active", "completed", "archived"]).optional(),
});

export type CreateBoardInput = z.infer<typeof createBoardSchema>;
export type UpdateBoardInput = z.infer<typeof updateBoardSchema>;
```

Create `packages/shared/src/schemas/card.ts`:

```typescript
import { z } from "zod";

export const createCardSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().max(10000).optional(),
  dueDate: z.string().date().optional().nullable(),
});

export const updateCardSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().max(10000).optional().nullable(),
  dueDate: z.string().date().optional().nullable(),
});

export const moveCardSchema = z.object({
  listId: z.string().uuid(),
  position: z.number().int().min(0),
});

export const createCommentSchema = z.object({
  content: z.string().min(1, "Content is required").max(10000),
  visibility: z.enum(["internal", "client"]),
});

export type CreateCardInput = z.infer<typeof createCardSchema>;
export type UpdateCardInput = z.infer<typeof updateCardSchema>;
export type MoveCardInput = z.infer<typeof moveCardSchema>;
export type CreateCommentInput = z.infer<typeof createCommentSchema>;
```

Create `packages/shared/src/schemas/template.ts`:

```typescript
import { z } from "zod";

export const createTemplateSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(5000).optional(),
  categoryId: z.string().uuid().optional().nullable(),
  variables: z
    .array(
      z.object({
        key: z.string().min(1).max(100).regex(/^\w+$/, "Key must be word characters only"),
        displayName: z.string().min(1).max(255),
        defaultValue: z.string().optional(),
        isRequired: z.boolean().default(true),
      })
    )
    .optional(),
});

export const applyTemplateSchema = z.object({
  boardTitle: z.string().min(1).max(255).optional(),
  clientName: z.string().min(1).max(255),
  clientEmail: z.string().email().optional(),
  variables: z.record(z.string(), z.string()),
});

export type CreateTemplateInput = z.infer<typeof createTemplateSchema>;
export type ApplyTemplateInput = z.infer<typeof applyTemplateSchema>;
```

Create `packages/shared/src/schemas/index.ts`:

```typescript
export * from "./board";
export * from "./card";
export * from "./template";
```

**Step 17: Create type definitions**

Create `packages/shared/src/types/board.ts`:

```typescript
export interface Board {
  id: string;
  title: string;
  description: string | null;
  slug: string;
  publicToken: string;
  clientName: string;
  clientEmail: string | null;
  status: "active" | "completed" | "archived";
  templateId: string | null;
  createdBy: string;
  position: number;
  createdAt: string;
  updatedAt: string;
}

export interface BoardWithDetails extends Board {
  lists: List[];
  stats: BoardStats;
}

export interface BoardStats {
  totalCards: number;
  completedCards: number;
  completionPercentage: number;
}

export interface List {
  id: string;
  boardId: string;
  title: string;
  position: number;
  color: string | null;
  cards: Card[];
  createdAt: string;
  updatedAt: string;
}

export interface Card {
  id: string;
  listId: string;
  title: string;
  description: string | null;
  position: number;
  dueDate: string | null;
  completedAt: string | null;
  assignees: CardAssignee[];
  labels: CardLabel[];
  attachments: CardAttachment[];
  commentCount: number;
  clientCommentCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CardDetail extends Card {
  comments: CardComment[];
}

export interface CardAssignee {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
}

export interface CardLabel {
  id: string;
  name: string;
  color: string;
}

export interface CardAttachment {
  id: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  visibility: "internal" | "client";
  uploadedBy: string;
  createdAt: string;
}

export interface CardComment {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatarUrl: string | null;
  content: string;
  visibility: "internal" | "client";
  createdAt: string;
  updatedAt: string;
}
```

Create `packages/shared/src/types/template.ts`:

```typescript
export interface Template {
  id: string;
  categoryId: string | null;
  name: string;
  description: string | null;
  isDefault: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  lists: TemplateList[];
  variables: TemplateVariable[];
}

export interface TemplateList {
  id: string;
  templateId: string;
  title: string;
  position: number;
  color: string | null;
  cards: TemplateCard[];
}

export interface TemplateCard {
  id: string;
  templateListId: string;
  title: string;
  description: string | null;
  position: number;
  dueDateOffsetDays: number | null;
}

export interface TemplateVariable {
  id: string;
  templateId: string;
  key: string;
  displayName: string;
  defaultValue: string | null;
  isRequired: boolean;
}

export interface TemplateCategory {
  id: string;
  name: string;
  description: string | null;
  position: number;
  createdAt: string;
}
```

Create `packages/shared/src/types/user.ts`:

```typescript
export interface User {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  role: "admin" | "member";
  createdAt: string;
  updatedAt: string;
}
```

Create `packages/shared/src/types/notification.ts`:

```typescript
export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string | null;
  boardId: string | null;
  cardId: string | null;
  isRead: boolean;
  createdAt: string;
}
```

Create `packages/shared/src/types/index.ts`:

```typescript
export * from "./board";
export * from "./template";
export * from "./user";
export * from "./notification";
```

**Step 18: Create event constants**

Create `packages/shared/src/constants/events.ts`:

```typescript
/**
 * Canonical event names for the internal event bus.
 * These are the contract between CRUD modules and the notifications pipeline.
 */
export const EVENTS = {
  BOARD_CREATED: "board.created",
  BOARD_COMPLETED: "board.completed",
  CARD_CREATED: "card.created",
  CARD_MOVED: "card.moved",
  CARD_COMPLETED: "card.completed",
  CARD_OVERDUE: "card.overdue",
  CARD_ASSIGNED: "card.assigned",
} as const;

export type EventName = (typeof EVENTS)[keyof typeof EVENTS];

/** Webhook event payload structure */
export interface WebhookPayload {
  event: EventName;
  timestamp: string;
  [key: string]: unknown;
}
```

Create `packages/shared/src/constants/index.ts`:

```typescript
export * from "./events";
```

**Step 19: Create barrel export**

Create `packages/shared/src/index.ts`:

```typescript
// Types
export * from "./types";

// Schemas
export * from "./schemas";

// Utils
export { resolveTemplateVariables } from "./utils/template-resolver";
export { generateSlug } from "./utils/slug";
export { isCompletionList } from "./utils/completion-detection";

// Constants
export * from "./constants";
```

**Step 20: Install dependencies and run all tests**

```bash
cd packages/shared && pnpm install && pnpm test
```

Expected: 24 tests PASS across 3 suites

**Step 21: Commit**

```bash
git add -A
git commit -m "feat: add @onboarding-tracker/shared with types, schemas, utils, and constants"
```

---

### Task 3: NestJS Backend Scaffolding + Database Schema

**TDD scenario:** Partial TDD — health check e2e test; schema generation is scaffolding

**Files:**
- Create: `apps/api/package.json`
- Create: `apps/api/tsconfig.json`
- Create: `apps/api/nest-cli.json`
- Create: `apps/api/src/main.ts`
- Create: `apps/api/src/app.module.ts`
- Create: `apps/api/src/health.controller.ts`
- Create: `apps/api/src/database/connection.ts`
- Create: `apps/api/src/database/schema/index.ts` (and all 16 schema files)
- Create: `apps/api/drizzle.config.ts`
- Test: `apps/api/test/app.e2e-spec.ts`

> ⚠️ **CORREÇÕES DO KAN/FOCALBOARD** (ver `docs/plans/REFERENCE-kan-focalboard-extraction.md`):
> 
> Ao criar o schema, ADICIONAR os itens abaixo que não estão no design original:
> 
> 1. **`board_activities` tabela** — activity log rastreia cada mudança em cada card. Sem isso, o dashboard "recent activity" (US-123) não funciona.
> 2. **`deletedAt` + `deletedBy`** em boards, lists, cards, comments — soft delete em vez de cascade delete irreversível.
> 3. **Composite PKs** em `card_assignees` e `card_labels` com `primaryKey()` aux do Drizzle — sem isso, `onConflictDoNothing` falha.
> 4. **Índices explícitos** em FKs: `card(list_id)`, `notification(user_id, is_read)`, `board(status)`.
> 5. **`publicId` (varchar 12)** em boards e cards — nunca expor UUID interno em URLs.
> 6. **`cardNumber` (integer)** em cards — auto-incremental por board, referência humana (ex: GRV-42). Adicionar index em `(board_id, card_number).
> 
> O schema do design original (16 tabelas) passa a **18 tabelas** (+ board_activities, + ajustes nas 4 tabelas principais).

**Step 1: Create NestJS package.json**

Create `apps/api/package.json`:

```json
{
  "name": "@onboarding-tracker/api",
  "private": true,
  "scripts": {
    "dev": "nest start --watch",
    "build": "nest build",
    "start": "node dist/main",
    "start:prod": "node dist/main",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "vitest run --config ./vitest.config.e2e.ts",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:studio": "drizzle-kit studio",
    "db:seed": "tsx src/database/seed.ts"
  },
  "dependencies": {
    "@nestjs/common": "^11.0.0",
    "@nestjs/config": "^4.0.0",
    "@nestjs/core": "^11.0.0",
    "@nestjs/jwt": "^11.0.0",
    "@nestjs/passport": "^11.0.0",
    "@nestjs/platform-express": "^11.0.0",
    "@nestjs/schedule": "^5.0.0",
    "@onboarding-tracker/shared": "workspace:*",
    "bcrypt": "^5.1.0",
    "class-transformer": "^0.5.1",
    "class-validator": "^0.14.0",
    "drizzle-orm": "^0.43.0",
    "eventemitter2": "^6.4.9",
    "passport": "^0.7.0",
    "passport-jwt": "^4.0.1",
    "postgres": "^3.4.0",
    "reflect-metadata": "^0.2.2",
    "rxjs": "^7.8.0",
    "uuid": "^11.0.0",
    "zod": "^3.24.0"
  },
  "devDependencies": {
    "@nestjs/cli": "^11.0.0",
    "@nestjs/schematics": "^11.0.0",
    "@nestjs/testing": "^11.0.0",
    "@types/bcrypt": "^5.0.0",
    "@types/express": "^5.0.0",
    "@types/node": "^22.0.0",
    "@types/passport-jwt": "^4.0.0",
    "@types/uuid": "^10.0.0",
    "drizzle-kit": "^0.31.0",
    "source-map-support": "^0.5.21",
    "supertest": "^7.0.0",
    "tsx": "^4.19.0",
    "typescript": "^5.8.0",
    "vitest": "^3.1.0"
  }
}
```

**Step 2: Create tsconfig.json**

Create `apps/api/tsconfig.json`:

```json
{
  "extends": "../../tooling/typescript/base.json",
  "compilerOptions": {
    "module": "commonjs",
    "outDir": "./dist",
    "rootDir": "./src",
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true,
    "target": "ES2023",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules", "dist", "test", "**/*.spec.ts", "**/*.e2e-spec.ts"]
}
```

**Step 3: Create nest-cli.json**

Create `apps/api/nest-cli.json`:

```json
{
  "$schema": "https://json.schemastore.org/nest-cli",
  "collection": "@nestjs/schematics",
  "sourceRoot": "src",
  "compilerOptions": {
    "deleteOutDir": true
  }
}
```

**Step 4: Create database schema files**

Create `apps/api/src/database/schema/users.ts`:

```typescript
import {
  pgTable,
  uuid,
  varchar,
  timestamp,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  displayName: varchar("display_name", { length: 255 }).notNull(),
  avatarUrl: varchar("avatar_url"),
  role: varchar("role", { length: 20 }).notNull().default("member"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
```

Create `apps/api/src/database/schema/boards.ts`:

```typescript
import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  timestamp,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { users } from "./users";
import { lists } from "./lists";

export const boards = pgTable("boards", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  publicToken: varchar("public_token", { length: 64 }).notNull().unique(),
  clientName: varchar("client_name", { length: 255 }).notNull(),
  clientEmail: varchar("client_email", { length: 255 }),
  status: varchar("status", { length: 20 }).notNull().default("active"),
  templateId: uuid("template_id"),
  createdBy: uuid("created_by")
    .notNull()
    .references(() => users.id),
  position: integer("position").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const boardsRelations = relations(boards, ({ one, many }) => ({
  creator: one(users, {
    fields: [boards.createdBy],
    references: [users.id],
    relationName: "boardCreator",
  }),
  lists: many(lists),
}));
```

Create `apps/api/src/database/schema/lists.ts`:

```typescript
import {
  pgTable,
  uuid,
  varchar,
  integer,
  timestamp,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { boards } from "./boards";
import { cards } from "./cards";

export const lists = pgTable("lists", {
  id: uuid("id").defaultRandom().primaryKey(),
  boardId: uuid("board_id")
    .notNull()
    .references(() => boards.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }).notNull(),
  position: integer("position").notNull().default(0),
  color: varchar("color", { length: 7 }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const listsRelations = relations(lists, ({ one, many }) => ({
  board: one(boards, {
    fields: [lists.boardId],
    references: [boards.id],
  }),
  cards: many(cards),
}));
```

Create `apps/api/src/database/schema/cards.ts`:

```typescript
import {
  pgTable,
  uuid,
  text,
  integer,
  date,
  timestamp,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { lists } from "./lists";
import { cardComments } from "./card-comments";
import { cardAttachments } from "./card-attachments";
import { cardAssignees } from "./card-assignees";
import { cardLabels } from "./card-labels";

export const cards = pgTable("cards", {
  id: uuid("id").defaultRandom().primaryKey(),
  listId: uuid("list_id")
    .notNull()
    .references(() => lists.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  position: integer("position").notNull().default(0),
  dueDate: date("due_date"),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const cardsRelations = relations(cards, ({ one, many }) => ({
  list: one(lists, {
    fields: [cards.listId],
    references: [lists.id],
  }),
  comments: many(cardComments),
  attachments: many(cardAttachments),
  assignees: many(cardAssignees),
  labels: many(cardLabels),
}));
```

Create `apps/api/src/database/schema/card-comments.ts`:

```typescript
import {
  pgTable,
  uuid,
  text,
  varchar,
  timestamp,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { cards } from "./cards";
import { users } from "./users";

export const cardComments = pgTable("card_comments", {
  id: uuid("id").defaultRandom().primaryKey(),
  cardId: uuid("card_id")
    .notNull()
    .references(() => cards.id, { onDelete: "cascade" }),
  authorId: uuid("author_id")
    .notNull()
    .references(() => users.id),
  content: text("content").notNull(),
  visibility: varchar("visibility", { length: 10 }).notNull().default("internal"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const cardCommentsRelations = relations(cardComments, ({ one }) => ({
  card: one(cards, {
    fields: [cardComments.cardId],
    references: [cards.id],
  }),
  author: one(users, {
    fields: [cardComments.authorId],
    references: [users.id],
  }),
}));
```

Create `apps/api/src/database/schema/card-attachments.ts`:

```typescript
import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  timestamp,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { cards } from "./cards";
import { users } from "./users";

export const cardAttachments = pgTable("card_attachments", {
  id: uuid("id").defaultRandom().primaryKey(),
  cardId: uuid("card_id")
    .notNull()
    .references(() => cards.id, { onDelete: "cascade" }),
  fileName: varchar("file_name", { length: 255 }).notNull(),
  fileUrl: text("file_url").notNull(),
  fileSize: integer("file_size").notNull(),
  mimeType: varchar("mime_type", { length: 100 }).notNull(),
  uploadedBy: uuid("uploaded_by")
    .notNull()
    .references(() => users.id),
  visibility: varchar("visibility", { length: 10 }).notNull().default("client"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const cardAttachmentsRelations = relations(cardAttachments, ({ one }) => ({
  card: one(cards, {
    fields: [cardAttachments.cardId],
    references: [cards.id],
  }),
  uploader: one(users, {
    fields: [cardAttachments.uploadedBy],
    references: [users.id],
  }),
}));
```

Create `apps/api/src/database/schema/card-assignees.ts`:

```typescript
import { pgTable, uuid, timestamp } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { cards } from "./cards";
import { users } from "./users";

export const cardAssignees = pgTable("card_assignees", {
  cardId: uuid("card_id")
    .notNull()
    .references(() => cards.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  assignedAt: timestamp("assigned_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const cardAssigneesRelations = relations(cardAssignees, ({ one }) => ({
  card: one(cards, {
    fields: [cardAssignees.cardId],
    references: [cards.id],
  }),
  user: one(users, {
    fields: [cardAssignees.userId],
    references: [users.id],
  }),
}));
```

Create `apps/api/src/database/schema/labels.ts`:

```typescript
import {
  pgTable,
  uuid,
  varchar,
  timestamp,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { boards } from "./boards";
import { cardLabels } from "./card-labels";

export const labels = pgTable("labels", {
  id: uuid("id").defaultRandom().primaryKey(),
  boardId: uuid("board_id")
    .notNull()
    .references(() => boards.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 50 }).notNull(),
  color: varchar("color", { length: 7 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const labelsRelations = relations(labels, ({ one, many }) => ({
  board: one(boards, {
    fields: [labels.boardId],
    references: [boards.id],
  }),
  cardLabels: many(cardLabels),
}));
```

Create `apps/api/src/database/schema/card-labels.ts`:

```typescript
import { pgTable, uuid } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { cards } from "./cards";
import { labels } from "./labels";

export const cardLabels = pgTable("card_labels", {
  cardId: uuid("card_id")
    .notNull()
    .references(() => cards.id, { onDelete: "cascade" }),
  labelId: uuid("label_id")
    .notNull()
    .references(() => labels.id, { onDelete: "cascade" }),
});

export const cardLabelsRelations = relations(cardLabels, ({ one }) => ({
  card: one(cards, {
    fields: [cardLabels.cardId],
    references: [cards.id],
  }),
  label: one(labels, {
    fields: [cardLabels.labelId],
    references: [labels.id],
  }),
}));
```

Create `apps/api/src/database/schema/template-categories.ts`:

```typescript
import {
  pgTable,
  uuid,
  varchar,
  integer,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const templateCategories = pgTable("template_categories", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  position: integer("position").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
```

Create `apps/api/src/database/schema/templates.ts`:

```typescript
import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { users } from "./users";
import { templateCategories } from "./template-categories";
import { templateLists } from "./template-lists";
import { templateVariables } from "./template-variables";

export const templates = pgTable("templates", {
  id: uuid("id").defaultRandom().primaryKey(),
  categoryId: uuid("category_id").references(() => templateCategories.id),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  isDefault: boolean("is_default").notNull().default(false),
  createdBy: uuid("created_by")
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const templatesRelations = relations(templates, ({ one, many }) => ({
  category: one(templateCategories, {
    fields: [templates.categoryId],
    references: [templateCategories.id],
  }),
  creator: one(users, {
    fields: [templates.createdBy],
    references: [users.id],
  }),
  lists: many(templateLists),
  variables: many(templateVariables),
}));
```

Create `apps/api/src/database/schema/template-variables.ts`:

```typescript
import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { templates } from "./templates";

export const templateVariables = pgTable("template_variables", {
  id: uuid("id").defaultRandom().primaryKey(),
  templateId: uuid("template_id")
    .notNull()
    .references(() => templates.id, { onDelete: "cascade" }),
  key: varchar("key", { length: 100 }).notNull(),
  displayName: varchar("display_name", { length: 255 }).notNull(),
  defaultValue: text("default_value"),
  isRequired: boolean("is_required").notNull().default(true),
});

export const templateVariablesRelations = relations(
  templateVariables,
  ({ one }) => ({
    template: one(templates, {
      fields: [templateVariables.templateId],
      references: [templates.id],
    }),
  })
);
```

Create `apps/api/src/database/schema/template-lists.ts`:

```typescript
import {
  pgTable,
  uuid,
  varchar,
  integer,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { templates } from "./templates";
import { templateCards } from "./template-cards";

export const templateLists = pgTable("template_lists", {
  id: uuid("id").defaultRandom().primaryKey(),
  templateId: uuid("template_id")
    .notNull()
    .references(() => templates.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }).notNull(),
  position: integer("position").notNull().default(0),
  color: varchar("color", { length: 7 }),
});

export const templateListsRelations = relations(templateLists, ({ one, many }) => ({
  template: one(templates, {
    fields: [templateLists.templateId],
    references: [templates.id],
  }),
  cards: many(templateCards),
}));
```

Create `apps/api/src/database/schema/template-cards.ts`:

```typescript
import {
  pgTable,
  uuid,
  text,
  integer,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { templateLists } from "./template-lists";

export const templateCards = pgTable("template_cards", {
  id: uuid("id").defaultRandom().primaryKey(),
  templateListId: uuid("template_list_id")
    .notNull()
    .references(() => templateLists.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  position: integer("position").notNull().default(0),
  dueDateOffsetDays: integer("due_date_offset_days"),
});

export const templateCardsRelations = relations(templateCards, ({ one }) => ({
  templateList: one(templateLists, {
    fields: [templateCards.templateListId],
    references: [templateLists.id],
  }),
}));
```

Create `apps/api/src/database/schema/webhooks.ts`:

```typescript
import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
} from "drizzle-orm/pg-core";
import { users } from "./users";

export const webhooks = pgTable("webhooks", {
  id: uuid("id").defaultRandom().primaryKey(),
  url: text("url").notNull(),
  secret: varchar("secret", { length: 255 }).notNull(),
  events: text("events")
    .notNull()
    .array(),
  isActive: boolean("is_active").notNull().default(true),
  createdBy: uuid("created_by")
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
```

Create `apps/api/src/database/schema/notifications.ts`:

```typescript
import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
} from "drizzle-orm/pg-core";
import { cards } from "./cards";
import { boards } from "./boards";
import { users } from "./users";

export const notifications = pgTable("notifications", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  type: varchar("type", { length: 50 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message"),
  boardId: uuid("board_id").references(() => boards.id),
  cardId: uuid("card_id").references(() => cards.id),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
```

Create `apps/api/src/database/schema/settings.ts`:

```typescript
import {
  pgTable,
  integer,
  varchar,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const settings = pgTable("settings", {
  id: integer("id").primaryKey().default(1),
  companyName: varchar("company_name", { length: 255 }).notNull().default("My Company"),
  logoUrl: text("logo_url"),
  primaryColor: varchar("primary_color", { length: 7 }).notNull().default("#3B82F6"),
  emailFrom: varchar("email_from", { length: 255 }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
```

Create `apps/api/src/database/schema/index.ts`:

```typescript
export { users } from "./users";
export { boards, boardsRelations } from "./boards";
export { lists, listsRelations } from "./lists";
export { cards, cardsRelations } from "./cards";
export { cardComments, cardCommentsRelations } from "./card-comments";
export { cardAttachments, cardAttachmentsRelations } from "./card-attachments";
export { cardAssignees, cardAssigneesRelations } from "./card-assignees";
export { labels, labelsRelations } from "./labels";
export { cardLabels, cardLabelsRelations } from "./card-labels";
export { templateCategories } from "./template-categories";
export { templates, templatesRelations } from "./templates";
export { templateVariables, templateVariablesRelations } from "./template-variables";
export { templateLists, templateListsRelations } from "./template-lists";
export { templateCards, templateCardsRelations } from "./template-cards";
export { webhooks } from "./webhooks";
export { notifications } from "./notifications";
export { settings } from "./settings";
```

**Step 5: Create database connection**

Create `apps/api/src/database/connection.ts`:

```typescript
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL!;

const client = postgres(connectionString, {
  max: 20,
  idle_timeout: 20,
  connect_timeout: 10,
});

export const db = drizzle(client, { schema });
export type Database = typeof db;
```

**Step 6: Create Drizzle Kit config**

Create `apps/api/drizzle.config.ts`:

```typescript
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/database/schema/index.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

**Step 7: Generate initial migration**

```bash
docker compose up -d postgres
sleep 3
cd apps/api && pnpm db:generate
```

Expected: "1 migration generated" in `apps/api/drizzle/`

**Step 8: Run migration against local database**

Copy `.env.example` to `.env` at root, then:

```bash
cd apps/api && pnpm db:migrate
```

Expected: "migrations applied successfully"

**Step 9: Create health check controller**

Create `apps/api/src/health.controller.ts`:

```typescript
import { Controller, Get } from "@nestjs/common";

@Controller()
export class HealthController {
  @Get("health")
  health() {
    return { status: "ok", timestamp: new Date().toISOString() };
  }
}
```

**Step 10: Create minimal AppModule**

Create `apps/api/src/app.module.ts`:

```typescript
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { HealthController } from "./health.controller";

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true })],
  controllers: [HealthController],
})
export class AppModule {}
```

**Step 11: Create main.ts bootstrap**

Create `apps/api/src/main.ts`:

```typescript
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000",
    credentials: true,
  });
  app.setGlobalPrefix("api");
  await app.listen(process.env.API_PORT ?? 3001);
  console.log(`API running on http://localhost:${process.env.API_PORT ?? 3001}`);
}
bootstrap();
```

**Step 12: Write e2e health check test**

Create `apps/api/test/app.e2e-spec.ts`:

```typescript
import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import * as request from "supertest";
import { AppModule } from "../src/app.module";

describe("App (e2e)", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it("GET /api/health => 200 OK", () => {
    return request(app.getHttpServer())
      .get("/api/health")
      .expect(200)
      .expect((res) => {
        expect(res.body.status).toBe("ok");
        expect(res.body.timestamp).toBeDefined();
      });
  });
});
```

**Step 13: Run e2e test**

```bash
cd apps/api && pnpm test:e2e
```

Expected: 1 test PASS

**Step 14: Create seed script**

Create `apps/api/src/database/seed.ts`:

```typescript
import * as bcrypt from "bcrypt";
import { db } from "./connection";
import { users } from "./schema";

async function seed() {
  console.log("Seeding database...");

  const passwordHash = await bcrypt.hash("admin123", 10);

  await db
    .insert(users)
    .values({
      email: "admin@company.com",
      passwordHash,
      displayName: "Admin",
      role: "admin",
    })
    .onConflictDoNothing();

  console.log("Seed complete! Admin user: admin@company.com / admin123");
}

seed()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
```

**Step 15: Run seed**

```bash
cd apps/api && pnpm db:seed
```

Expected: "Seed complete!"

**Step 16: Install, verify dev server starts**

```bash
cd apps/api && pnpm install
pnpm dev
# CTRL+C after seeing "API running on..."
```

**Step 17: Commit**

```bash
git add -A
git commit -m "feat: scaffold NestJS backend with Drizzle schema (16 tables), health check, and seed"
```

**🧾 Rules Check — Verifique contra as rules antes de prosseguir:**

| Regra | Verificar | ✅? |
|-------|-----------|----|
| `rules/db-fk-indexes.md` | Toda coluna `.references()` tem `index()` no schema? | ☐ |
| `rules/db-use-migrations.md` | `drizzle.config.ts` usa `strict: true` e `out: './drizzle'`? | ☐ |
| `rules/db-lazy-connection.md` | Conexão Drizzle via `useFactory` (não no construtor)? | ☐ |
| `rules/db-use-returning.md` | Seed usa `.returning()` no INSERT? | ☐ |
| `rules/db-select-columns.md` | Health check não faz `SELECT *`? | ☐ |
| `rules/db-prevent-sql-injection.md` | Nenhum `sql.raw()` no código? | ☐ |
| `rules/arch-feature-modules.md` | Arquivos organizados por feature? | ☐ |
| `rules/security-validate-all-input.md` | Zod importado no shared package? | ☐ |
| `rules/devops-use-config-module.md` | `.env.example` tem todas as vars necessárias? | ☐ |

Se qualquer item estiver ❌, corrija ANTES de ir para a próxima task.

---

### Task 4: Next.js Frontend Scaffolding

**TDD scenario:** No TDD — project scaffolding only

**Files:**
- Create: `apps/web/` (via create-next-app)
- Create: `apps/web/src/lib/api-client.ts`
- Create: `apps/web/src/lib/auth.ts`
- Modify: `apps/web/src/app/layout.tsx`
- Modify: `apps/web/src/app/page.tsx`

**Step 1: Create Next.js app**

```bash
cd apps
npx create-next-app@latest web \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir \
  --no-import-alias \
  --turbopack
cd web
```

**Step 2: Install additional dependencies**

```bash
cd apps/web
pnpm add @hello-pangea/dnd lucide-react date-fns zustand @tanstack/react-query
pnpm add -D @types/node
```

**Step 3: Install Shadcn/ui**

```bash
cd apps/web
pnpm dlx shadcn@latest init
```

Interactive choices:
- Style: New York
- Base color: Zinc
- CSS variables: Yes

**Step 4: Add initial Shadcn components**

```bash
cd apps/web
pnpm dlx shadcn@latest add button card input label dialog dropdown-menu avatar badge separator tooltip toast sheet
```

**Step 5: Create API client**

Create `apps/web/src/lib/api-client.ts`:

```typescript
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

interface FetchOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  token?: string;
}

export async function apiClient<T>(
  endpoint: string,
  options: FetchOptions = {}
): Promise<T> {
  const { token, body, ...fetchOptions } = options;

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...((fetchOptions.headers as Record<string, string>) ?? {}),
  };

  const res = await fetch(`${API_URL}/api${endpoint}`, {
    ...fetchOptions,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(error.message ?? `API Error: ${res.status}`);
  }

  return res.json() as Promise<T>;
}
```

**Step 6: Create auth store**

Create `apps/web/src/lib/auth.ts`:

```typescript
"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User } from "@onboarding-tracker/shared";

interface AuthState {
  token: string | null;
  user: User | null;
  setAuth: (token: string, user: User) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      setAuth: (token, user) => set({ token, user }),
      logout: () => set({ token: null, user: null }),
    }),
    {
      name: "onboarding-tracker-auth",
    }
  )
);
```

**Step 7: Create utils file**

Create `apps/web/src/lib/utils.ts`:

```typescript
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

export function formatPercent(value: number): string {
  return `${Math.round(value)}%`;
}
```

**Step 8: Update root layout**

Modify `apps/web/src/app/layout.tsx`:

```typescript
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Onboarding Tracker",
  description: "Client onboarding progression tracker",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
```

**Step 9: Update root page (redirect to /boards)**

Modify `apps/web/src/app/page.tsx`:

```typescript
import { redirect } from "next/navigation";

export default function Home() {
  redirect("/boards");
}
```

**Step 10: Verify dev server starts**

```bash
cd apps/web && pnpm dev
# CTRL+C after seeing "Ready in..."
```

**Step 11: Commit**

```bash
git add -A
git commit -m "feat: scaffold Next.js frontend with Tailwind, Shadcn, API client, and auth store"
```

---

### Task 5: Verify Full Monorepo Works End-to-End

**TDD scenario:** Verification only — no new code

**Step 1: Install all workspace dependencies**

```bash
cd / && pnpm install
```

**Step 2: Start Docker services**

```bash
docker compose up -d
sleep 5
```

**Step 3: Run shared package tests**

```bash
cd packages/shared && pnpm test
```

Expected: 24 tests PASS

**Step 4: Run API e2e test**

```bash
cd apps/api && pnpm test:e2e
```

Expected: 1 test PASS

**Step 5: Verify API health endpoint works live**

```bash
cd apps/api && pnpm dev &
sleep 3
curl http://localhost:3001/api/health
# Expected: {"status":"ok","timestamp":"..."}
kill %1
```

**Step 6: Verify Next.js builds**

```bash
cd apps/web && pnpm build
```

Expected: Build succeeds

**Step 7: Commit any generated/updated files**

```bash
git add -A
git commit -m "chore: verify monorepo end-to-end (shared + API + web)"
```

---

**Phase 1 checkpoint:** At this point you have:
- ✅ Monorepo with Turborepo + pnpm working
- ✅ `@onboarding-tracker/shared` package with 24 passing tests (template resolver, slug, completion detection)
- ✅ NestJS API with 16-table Drizzle schema, health check, seed user
- ✅ Next.js frontend with Tailwind, Shadcn, API client, auth store
- ✅ Docker Compose with PostgreSQL 17 + MinIO
- ✅ All 3 apps install, build, and test successfully