# 🚀 Pré-Setup — Executar ANTES de começar as Phases

> Ordem de execução dos itens abaixo. Os marcados 🔴 são bloqueantes.

---

## 🔴 1. git init (já existe)
```bash
git init  # já foi feito
```

## 🔴 2. Variáveis de ambiente
```bash
cp .env.example .env
# Preencha JWT_SECRET com: openssl rand -hex 32
# Deixe o resto como está para desenvolvimento local
```
**Validação:** `cat .env | grep JWT_SECRET | wc -c` deve ser > 40 chars

## 🔴 3. Husky + lint-staged (executar DEPOIS do Phase 1 Task 1 — quando package.json existir)
```bash
# Após Phase 1 Task 1 criar o monorepo:
pnpm add -Dw husky lint-staged
pnpm exec husky init

# Copiar o hook pre-configurado
cp .husky/pre-commit .husky/pre-commit.bak 2>/dev/null
cat > .husky/pre-commit << 'HOOK'
#!/usr/bin/env sh
echo "🔍 Checking critical rule violations..."

# BLOCK: sql.raw()
if grep -rn "sql\.raw(" apps/api/src/ --include="*.ts" 2>/dev/null; then
  echo "❌ BLOCKED: sql.raw() found — SQL injection risk"
  exit 1
fi

# WARN: SELECT * equivalent
if grep -rn "\.select()\.from(" apps/api/src/ --include="*.ts" 2>/dev/null; then
  echo "⚠️ .select().from() found — specify columns"
fi

# WARN: INSERT without .returning()
if grep -rn "\.insert(" apps/api/src/ --include="*.ts" 2>/dev/null | grep -v ".returning()" | grep -v "onConflictDoNothing"; then
  echo "⚠️ INSERT without .returning() found"
fi

# WARN: Queries in loops
if grep -rn "for.*await.*db\.\|\.forEach.*db\." apps/api/src/ --include="*.ts" 2>/dev/null; then
  echo "⚠️ Possible N+1 query in loop"
fi

# BLOCK: Hardcoded secrets
if grep -rn "secret.*=.*['\"]" apps/api/src/ --include="*.ts" 2>/dev/null | grep -v "process.env" | grep -v "passwordHash" | grep -v "test"; then
  echo "❌ BLOCKED: Hardcoded secret"
  exit 1
fi

echo "✅ Pre-commit checks passed"
HOOK
chmod +x .husky/pre-commit
```

## 🟡 4. GitHub Actions CI
Já está em `.github/workflows/ci.yml`. Será ativado quando:
- O repositório for pushado para GitHub
- `pnpm install` + `turbo` estiverem configurados (Phase 1)

## 🟡 5. AGENTE.md — Usar em toda sessão
**Antes de cada sessão com GLM/Pi:** copie o conteúdo de `AGENTE.md` como primeira mensagem.

## 🟢 6. Docker Compose (local dev)
Já definido no Phase 1 Task 1. Rodar:
```bash
docker compose up -d postgres minio
```

---

## Resumo da infra de segurança

```
┌──────────────────────────────────────────┐
│  EDIT TIME                               │
│  ESLint custom rule (future)             │
│  → Pega sql.raw() enquanto digita        │
├──────────────────────────────────────────┤
│  COMMIT TIME                             │
│  Husky pre-commit hook                   │
│  → Bloqueia sql.raw(), hardcoded secrets│
│  → Avisa SELECT *, missing .returning()  │
├──────────────────────────────────────────┤
│  PR TIME                                 │
│  GitHub Actions CI                       │
│  → Roda lint + typecheck + test + rules │
├──────────────────────────────────────────┤
│  SESSION TIME                             │
│  AGENTE.md colado na primeira mensagem   │
│  → 20 regras absolutas na memória        │
├──────────────────────────────────────────┤
│  TASK TIME                               │
│  Constitution block + Rules Check table  │
│  → No topo e no fim de cada phase/task  │
└──────────────────────────────────────────┘
```

4 camadas. Uma violação precisa passar por TODAS para chegar em produção.
```