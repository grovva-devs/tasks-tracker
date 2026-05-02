# Phase 1, Task 1: Monorepo Root Scaffolding — Execution Plan

> **REQUIRED SUB-SKILL:** Use the executing-plans skill to implement this plan task-by-task.

**Goal:** Create the Turborepo monorepo workspace with pnpm, Docker Compose, tooling configs, and all pre-execution fixes applied.

**Architecture:** Monorepo with `apps/api`, `apps/web`, `packages/shared`, `tooling/` (ESLint, Prettier, TypeScript). Docker Compose with PostgreSQL 17 + MinIO. The `.env.example`, `.gitignore`, and `docker-compose.yml` are pre-configured. Husky pre-commit hook already exists but needs adjusting after package.json is created.

**Tech Stack:** pnpm 10, Turborepo 2, Node 24, Docker Compose (PostgreSQL 17 + MinIO)

**Review fixes applied in this plan:**
- C2 will be applied in Task 3 (DB schema) — noted here for awareness
- C3/C4 will be applied in Task 3 — noted here for awareness
- C5 will be applied in Task 3 (e2e test) — noted here for awareness
- S2: `create-next-app` — will be handled in Task 4
- Pre-setup items (`.env`, Husky) integrated

---

### Task 1.1: Create root package.json

**TDD scenario:** No TDD — scaffolding only

**Files:**
- Create: `package.json`

**Step 1: Create root package.json**

The project directory already has `.git`, `.env.example`, `.gitignore`, `.husky/`, `docs/`, and `rules/`. We need to create the root `package.json` here.

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
    "db:studio": "turbo db:studio",
    "prepare": "husky"
  },
  "devDependencies": {
    "turbo": "^2.5.0",
    "prettier": "^3.5.0",
    "husky": "^9.1.0",
    "lint-staged": "^15.5.0"
  },
  "packageManager": "pnpm@10.12.0",
  "lint-staged": {
    "*.{ts,tsx}": [
      "prettier --write",
      "eslint --fix"
    ]
  }
}
```

**Step 2: Commit**

```bash
git add package.json
git commit -m "chore: add root package.json for monorepo"
```

---

### Task 1.2: Create pnpm workspace config

**TDD scenario:** No TDD — scaffolding only

**Files:**
- Create: `pnpm-workspace.yaml`

**Step 1: Create pnpm-workspace.yaml**

Create `pnpm-workspace.yaml`:

```yaml
packages:
  - "apps/*"
  - "packages/*"
  - "tooling/*"
```

**Step 2: Commit**

```bash
git add pnpm-workspace.yaml
git commit -m "chore: add pnpm workspace config"
```

---

### Task 1.3: Create turbo.json

**TDD scenario:** No TDD — scaffolding only

**Files:**
- Create: `turbo.json`

**Step 1: Create turbo.json**

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

**Step 2: Commit**

```bash
git add turbo.json
git commit -m "chore: add Turborepo config"
```

---

### Task 1.4: Update .gitignore for monorepo

**TDD scenario:** No TDD — scaffolding only

**Files:**
- Modify: `.gitignore`

**Step 1: Update .gitignore**

The existing `.gitignore` has incorrect drizzle rules. Replace it entirely:

Replace `.gitignore` with:

```
node_modules
dist
.next
.env
.env.local
.env.*.local
.turbo
*.tsbuildinfo
coverage
.DS_Store

# Drizzle migrations — track in git
drizzle/*.sql
drizzle/meta/
!drizzle/
```

The previous version had comments on the same line as patterns (which doesn't work in `.gitignore`) and conflicting rules. Drizzle migration files (`drizzle/*.sql` and `drizzle/meta/`) should be tracked in git so that production migrations work.

**Step 2: Commit**

```bash
git add .gitignore
git commit -m "chore: fix .gitignore for monorepo and drizzle migrations"
```

---

### Task 1.5: Update .env.example with all required vars

**TDD scenario:** No TDD — scaffolding only

**Files:**
- Modify: `.env.example`

**Step 1: Update .env.example**

The existing `.env.example` already has `JWT_EXPIRES_IN`, `JWT_REFRESH_EXPIRES_IN`, and `DRIZZLE_MIGRATIONS_FOLDER` from the pre-setup. We'll keep those additions and ensure everything is consistent.

Replace `.env.example` with:

```env
# Database
DATABASE_URL=postgres://postgres:postgres@localhost:5432/onboarding_tracker

# JWT
JWT_SECRET=change-me-to-a-long-random-string-at-least-32-chars
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

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

# Drizzle
DRIZZLE_MIGRATIONS_FOLDER=./drizzle
```

**Step 2: Create .env from .env.example**

```bash
cp .env.example .env
```

Then generate a real JWT_SECRET:

```bash
JWT_SECRET=$(openssl rand -hex 32) && sed -i '' "s/change-me-to-a-long-random-string-at-least-32-chars/$JWT_SECRET/" .env
```

**Step 3: Verify .env has a real JWT_SECRET**

```bash
grep JWT_SECRET .env | wc -c
```

Expected: More than 40 characters (meaning it's not the default placeholder)

**Step 4: Commit**

```bash
git add .env.example
git commit -m "chore: update .env.example with all required vars"
```

> ⚠️ `.env` is in `.gitignore` — do NOT commit it.

---

### Task 1.6: Create docker-compose.yml

**TDD scenario:** No TDD — scaffolding only

**Files:**
- Create: `docker-compose.yml`

**Step 1: Create docker-compose.yml**

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

**Step 2: Verify Docker Compose starts**

```bash
docker compose up -d
sleep 5
docker compose ps
```

Expected: Both `postgres` and `minio` services show "running" / "healthy"

**Step 3: Commit**

```bash
git add docker-compose.yml
git commit -m "chore: add Docker Compose with PostgreSQL 17 and MinIO"
```

---

### Task 1.7: Create tooling packages (TypeScript, ESLint, Prettier)

**TDD scenario:** No TDD — scaffolding only

**Files:**
- Create: `tooling/typescript/package.json`
- Create: `tooling/typescript/base.json`
- Create: `tooling/typescript/internal-package.json`
- Create: `tooling/eslint/package.json`
- Create: `tooling/eslint/base.js`
- Create: `tooling/prettier/package.json`
- Create: `tooling/prettier/index.js`

**Step 1: Create tooling/typescript/package.json**

Create `tooling/typescript/package.json`:

```json
{
  "name": "@onboarding-tracker/tooling-typescript",
  "private": true,
  "files": ["base.json", "internal-package.json"]
}
```

**Step 2: Create tooling/typescript/base.json**

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

**Step 3: Create tooling/typescript/internal-package.json**

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

**Step 4: Create tooling/eslint/package.json**

Create `tooling/eslint/package.json`:

```json
{
  "name": "@onboarding-tracker/tooling-eslint",
  "private": true,
  "files": ["base.js"]
}
```

**Step 5: Create tooling/eslint/base.js**

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

**Step 6: Create tooling/prettier/package.json**

Create `tooling/prettier/package.json`:

```json
{
  "name": "@onboarding-tracker/tooling-prettier",
  "private": true,
  "files": ["index.js"]
}
```

**Step 7: Create tooling/prettier/index.js**

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

**Step 8: Commit**

```bash
git add tooling/
git commit -m "chore: add tooling configs (TypeScript, ESLint, Prettier)"
```

---

### Task 1.8: Install root dependencies and verify workspace

**TDD scenario:** No TDD — verification only

**Step 1: Install root dependencies**

```bash
pnpm install
```

Expected: pnpm resolves workspace, installs turbo, prettier, husky, lint-staged. May take 30-60 seconds.

**Step 2: Verify Husky pre-commit hook is active**

```bash
cat .husky/pre-commit
```

Expected: The existing pre-commit hook is present (already was from pre-setup).

> ⚠️ **Important:** The `prepare` script in `package.json` calls `husky` which initializes hooks. Since the hook already exists, this is idempotent — no issue.

**Step 3: Verify Turborepo picks up workspace**

```bash
pnpm turbo build --dry-run 2>&1 || true
```

Expected: Output shows workspace package list (may show "no packages to build" since no apps exist yet, but no errors about invalid config).

**Step 4: Commit lockfile**

```bash
git add pnpm-lock.yaml package.json
git commit -m "chore: install root dependencies and generate lockfile"
```

---

### Task 1.9: Verify Docker services are running

**TDD scenario:** Verification only

**Step 1: Ensure Docker services are up**

```bash
docker compose up -d
sleep 5
docker compose ps
```

Expected: `postgres` and `minio` are running/healthy.

**Step 2: Test PostgreSQL connection**

```bash
docker compose exec postgres psql -U postgres -c "SELECT version();"
```

Expected: PostgreSQL 17 version string.

**Step 3: Test MinIO is reachable**

```bash
curl -s http://localhost:9000/minio/health/live
```

Expected: HTTP 200 or empty response (MinIO health endpoint).

**Step 4: No commit needed** — just verification.

---

## ✅ Task 1 Gate Checklist

Before moving to Task 2 (Shared Package), verify:

- [ ] `package.json` exists at root with turbo, husky, lint-staged devDeps
- [ ] `pnpm-workspace.yaml` lists `apps/*`, `packages/*`, `tooling/*`
- [ ] `turbo.json` exists with build/dev/lint/test/db tasks
- [ ] `.gitignore` is correct (no inline comments, proper drizzle rules)
- [ ] `.env` exists with real JWT_SECRET (not placeholder)
- [ ] `.env.example` matches `.env` structure
- [ ] `docker-compose.yml` has postgres:17 + minio
- [ ] Docker services running: `docker compose ps` shows 2 services
- [ ] PostgreSQL 17 responding: `SELECT version()` returns 17.x
- [ ] `tooling/` has 3 packages: typescript, eslint, prettier
- [ ] `pnpm install` completes without errors
- [ ] Husky pre-commit hook is active
- [ ] ~6 commits on `main` branch

---

**Next step:** Task 2 — Shared Package (types, schemas, utils with 24 tests).