# Guia: Como Dizer ao Agente de IA para Não Cometer Erros de SQL

**Stack:** NestJS + Drizzle ORM + PostgreSQL  
**Uso:** Colar como `.cursorrules`, `CLAUDE.md`, ou prepend em cada sessão

---

## SEÇÃO 1: A Constituição do Banco de Dados

Esta é a regra mestra. Copie **integralmente** e coloque no início de cada sessão ou no seu arquivo de regras do agente.

```markdown
# 🏛️ CONSTITUIÇÃO DO BANCO DE DADOS — OBRIGATÓRIO EM TODA SESSÃO

Você está trabalhando com: **NestJS + Drizzle ORM + PostgreSQL 16+**

## REGRAS ABSOLUTAS — VIOLAR = BUG CRÍTICO

### 1. NUNCA use concatenação de strings ou interpolação em SQL
```
❌ PROIBIDO:
sql.raw(`SELECT * FROM users WHERE email = '${userInput}'`)
sql`SELECT * FROM users WHERE email = '${userInput}'`  // interpolação JS!
db.execute(sql.raw(`DELETE FROM ${tableName} WHERE id = ${id}`))

✅ OBRIGATÓRIO:
sql`SELECT * FROM users WHERE email = ${userInput}`  // template tag Drizzle
db.select().from(users).where(eq(users.email, userInput))  // query builder
db.select().from(users).where(eq(users.id, placeholder('id'))).prepare('get_user')  // prepared statement
```
O template tag `sql` do Drizzle parametriza automaticamente quando você usa `${}`DENTRO da tagged template. Se você usa `sql.raw()`, NÃO há parametrização — é concatenação crua e injeção garantida.

### 2. NUNCA faça queries em loop (Problema N+1)
```
❌ PROIBIDO:
const orders = await db.select().from(ordersTable);
for (const order of orders) {
  order.items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));
}
// Isso gera N+1 queries. Com 1000 orders = 1001 queries!

✅ OBRIGATÓRIO — Use a API relacional do Drizzle:
const result = await db.query.orders.findMany({
  with: { items: true }
});
// OU Use JOIN explícito:
const result = await db.select({
    id: orders.id,
    itemName: orderItems.name,
  })
  .from(orders)
  .leftJoin(orderItems, eq(orders.id, orderItems.orderId));

✅ TAMBÉM ACEITÁVEL — Batch com .in():
const orderIds = orders.map(o => o.id);
const allItems = await db.select().from(orderItems)
  .where(inArray(orderItems.orderId, orderIds));
```

### 3. TODA coluna de foreign key DEVE ter índice explícito
PostgreSQL NÃO cria índice automaticamente em FK (diferente de MySQL).
```
✅ OBRIGATÓRIO — Definir índice junto com a tabela:
export const orders = pgTable('orders', {
  id: uuid('id').defaultRandom().primaryKey(),
  customer_id: uuid('customer_id').notNull().references(() => customers.id),
  // ...
}, (table) => ({
  customerIdx: index('orders_customer_id_idx').on(table.customer_id),  // ← SEMPRE
  createdAtIndex: index('orders_created_at_idx').on(table.created_at),
}));
```
REGRA: Qualquer coluna que aparece em WHERE, JOIN, ou ORDER BY deve ter índice.
Regra para FK: Se a coluna tem `.references()`, ela PRECISA de um `index()`.

### 4. NUNCA faça hard delete em dados de usuário
```
❌ PROIBIDO:
await db.delete(users).where(eq(users.id, userId));

✅ OBRIGATÓRIO — Soft delete:
// No schema:
deletedAt: timestamp('deleted_at'),  // nullable

// Na query de delete:
await db.update(users)
  .set({ deletedAt: new Date() })
  .where(eq(users.id, userId));

// Em TODAS as queries de leitura:
.where(isNull(users.deletedAt))
// OU crie uma view/escopo que filtra automaticamente
```

### 5. Sempre use .returning() em INSERT e UPDATE
```
❌ PROIBIDO:
await db.insert(users).values(userData);  // retorna nada útil

✅ OBRIGATÓRIO:
const [created] = await db.insert(users).values(userData).returning();
const [updated] = await db.update(users).set({ name }).where(eq(users.id, id)).returning();
```
Sem `.returning()`, Drizzle retorna `undefined` (como INSERT sem RETURNING no SQL). Você perde o ID gerado e qualquer default calculado.

### 6. SEMPRE filtre por tenant/owner em queries multi-usuário
```
❌ PROIBIDO — Qualquer usuário vê tudo:
await db.select().from(projects);

✅ OBRIGATÓRIO — Scope por usuário/organização:
await db.select().from(projects)
  .where(eq(projects.organizationId, currentOrgId));
```
Esta regra aplica-se a SELECT, UPDATE, e DELETE. Nunca permita que um usuário acesse dados de outro.

### 7. Especifique colunas no SELECT (nunca SELECT *)
```
❌ PROIBIDO:
await db.select().from(users);  // busca TODAS as colunas

✅ OBRIGATÓRIO:
await db.select({
  id: users.id,
  name: users.name,
  email: users.email,
}).from(users);
```
Isso: (a) reduz dados transferidos, (b) veda vazamento de dados sensíveis, (c) permite melhor uso de covering indexes, (d) dá tipos TypeScript mais precisos.

### 8. NUNCA exponha segredos no client-side
```
❌ PROIBIDO:
NEXT_PUBLIC_DATABASE_URL=postgres://...
NEXT_PUBLIC_API_SECRET=sk_live_...

✅ OBRIGATÓRIO:
DATABASE_URL=postgres://...          // server-side only
API_SECRET=sk_live_...              // server-side only
NEXT_PUBLIC_SUPABASE_ANON_KEY=...   // único que pode ser público
```
Se a variável tem NEXT_PUBLIC_, ela vai pro browser. Nunca coloque credenciais de banco lá.

### 9. Use transações para operações multi-step
```
❌ PROIBIDO — Operações relacionadas sem transação:
await db.insert(orders).values(orderData);
await db.insert(orderItems).values(items);  // se isso falhar, order fica órfã

✅ OBRIGATÓRIO:
await db.transaction(async (tx) => {
  const [order] = await tx.insert(orders).values(orderData).returning();
  await tx.insert(orderItems).values(
    items.map(item => ({ ...item, orderId: order.id }))
  ).returning();
});
```

### 10. Valide input do usuário ANTES de ir pro banco
```
❌ PROIBIDO:
await db.update(users).set({ balance: req.body.balance }).where(...);
// O usuário pode enviar balance: -999999 ou balance: "drop table"

✅ OBRIGATÓRIO:
// Use zod/valibot para validar ANTES
const schema = z.object({
  balance: z.number().min(0).max(1000000),
  name: z.string().min(1).max(255),
});
const validated = schema.parse(req.body);
await db.update(users).set(validated).where(...);
```
```

---

## SEÇÃO 2: Templates de Prompt por Tipo de Tarefa

### Ao criar uma nova tabela:
```
Crie uma tabela [NOME] no schema do Drizzle ORM para PostgreSQL com:
- id: uuid default random primary key
- [colunas do domínio]
- organization_id: uuid not null references organizations(id)
- created_at: timestamp defaultNow not null  
- updated_at: timestamp defaultNow not null
- deleted_at: timestamp nullable (para soft delete)

REGRAS:
1. TODA foreign key DEVE ter index() explícito na terceira arg do pgTable
2. Colunas frequentemente filtradas (status, organization_id, etc) devem ter index
3. Se a tabela tem relationship, defina a relation com defineRelations()
4. Exporte a tabela do schema/index.ts
5. NUNCA use sql.raw()
6. Use `uuid` para IDs, nunca int serial (evita enumeração)
```

### Ao criar um service/repository:
```
Crie um [Nome]Service no NestJS que usa Drizzle ORM para:
[operação de domínio]

REGRAS:
1. Use SEMPRE o query builder do Drizzle (db.select, db.insert, etc) — NUNCA sql.raw()
2. Para buscar dados relacionados, use db.query.[table].findMany({ with: {...} }) — NUNCA faça SELECT em loop
3. Sempre filtre por organizationId do usuário atual
4. Sempre filtre deletedAt is null em queries de leitura
5. Use .returning() em INSERT e UPDATE
6. Valide input com zod ANTES de passar pro banco
7. Operações multi-step devem usar db.transaction()
8. Especifique colunas no SELECT — nunca traga colunas desnecessárias
9. Trate erros do banco — nunca deixe exceptions de constraint vazarem pro client
10. Use pagination com limit/offset ou cursor — nunca retorne todas as rows
```

### Ao criar uma API endpoint:
```
Crie um endpoint [METODO] [ROTA] no NestJS que [descrição]

REGRAS:
1. Valide TODO input do usuário com zod/DTO ANTES de qualquer operação
2. Verifique que o usuário autenticado tem permissão para o recurso
3. Use o service injetado via DI — não acesse o db direto do controller
4. NUNCA exponha erros de banco (constraint names, column names, SQL) na resposta
5. Retorne HTTP status codes apropriados (404, 403, 400, 500)
6. Adicione rate limiting em endpoints sensíveis (login, password reset)
7. Pagine resultados de listagem — nunca retorne tudo
8. Filtre por organizationId do JWT/token — nunca confie em query params para isso
```

### Ao escrever uma query complexa:
```
Escreva uma query Drizzle ORM que [descrição da query]

REGRAS:
1. Use o query builder tipado do Drizzle — NUNCA sql.raw() ou concatenação
2. Se precisar de SQL raw, use a tagged template: sql`...${param}...`
3. Para relacionamentos, prefira db.query com `with` — evita N+1
4. Se usar JOIN manual, sempre especifique as colunas no select
5. Para filtros dinâmicos, construa conditions[] com push e use and(...conditions)
6. NUNCA coloque input do usuário em ORDER BY sem whitelist
7. Use placeholder() + .prepare() para queries executadas repetidamente
8. Teste com EXPLAIN ANALYZE se a query pode ser pesada
```

### Ao criar uma migration:
```
Gere uma migration Drizzle para [mudança]

REGRAS:
1. Use `drizzle-kit generate` — NUNCA `drizzle-kit push` em CI/CD
2. Para adicionar índice em tabela grande: CREATE INDEX CONCURRENTLY
3. Para adicionar NOT NULL: adicione nullable primeiro, backfill, depois alter
4. Para dropar coluna: primeiro deploy código que ignora, depois migration
5. SEMPRE revise o SQL gerado ANTES de aplicar em produção
6. NUNCA deixe o agente rodar `drizzle-kit migrate` automaticamente
7. Toda FK nova precisa de índice na mesma migration
```

---

## SEÇÃO 3: Checklist de Auto-Revisão do Agente

Adicione ao final de cada prompt que gera código de banco:

```markdown
Antes de me entregar o código, verifique internamente:

□ Nenhuma string concatenation ou sql.raw() com input do usuário?
□ Zero loops com queries individuais (N+1)?
□ Toda FK tem índice explícito?
□ .returning() em todos os INSERT/UPDATE?
□ deletedAt IS NULL em queries de leitura de tabelas com soft delete?
□ Filtro por organizationId/ownerId em queries multi-tenant?
□ Colunas especificadas no SELECT (não select all)?
□ Input validado com zod/DTO antes do banco?
□ Operações multi-step dentro de transação?
□ Segredos vêm de env vars, nunca hardcoded?
□ Erros de banco traduzidos antes de ir pro client?
□ Paginação nas listagens?
□ Nenhum ORDER BY com input do usuário sem whitelist?
```

---

## SEÇÃO 4: Anti-Padrões Específicos do Drizzle + PostgreSQL

### #1: `sql.raw()` é a porta de entrada para SQL Injection
```typescript
// ❌ O agente frequentemente gera isso:
await db.execute(sql.raw(`SELECT * FROM ${table} WHERE id = ${id}`));

// ✅ Sempre use a tagged template:
await db.execute(sql`SELECT * FROM ${users} WHERE id = ${id}`);
//                           ^^^^^ tabela Drizzle    ^^^^ valor parametrizado
```
**Por que:** `sql.raw()` pula toda parametrização. O `sql` template tag diferencia entre identificadores de tabela (usam a referência do schema) e valores (são parametrizados automaticamente).

### #2: Relational Queries vs JOINs manuais — quando usar cada um
```typescript
// ✅ USE db.query quando: quer dados aninhados tipo JSON
const user = await db.query.users.findFirst({
  where: eq(users.id, userId),
  with: {
    posts: {
      where: eq(posts.published, true),
      limit: 10,
      orderBy: desc(posts.createdAt),
    },
    profile: true,
  },
});
// Gera uma query com JSON aggregation — SEM N+1

// ✅ USE db.select + JOIN quando: precisa de dados planos ou agregações
const result = await db.select({
  userId: users.id,
  userName: users.name,
  postCount: sql<number>`count(${posts.id})`,
}).from(users)
  .leftJoin(posts, eq(users.id, posts.ownerId))
  .groupBy(users.id);
```

### #3: O fantasma do Fan Trap com `with` em múltiplos `many`
```typescript
// ⚠️ CUIDADO: Se uma tabela tem 2+ relações `many`, o `with` 
// pode gerar queries lentas com LATERAL JOINs
// Exemplo: User has many Posts AND many Comments

// Para relações many-to-many simples:
const result = await db.query.users.findMany({
  with: {
    posts: { limit: 5 },
    comments: { limit: 5 },
  },
});

// Se ficar lento, separe em 2 queries:
const [user, posts, comments] = await Promise.all([
  db.query.users.findFirst({ where: eq(users.id, userId) }),
  db.query.posts.findMany({ where: eq(posts.ownerId, userId), limit: 5 }),
  db.query.comments.findMany({ where: eq(comments.authorId, userId), limit: 5 }),
]);
```

### #4: Enums do PostgreSQL precisam de cast explícito
```typescript
// ❌ TypeScript reclama:
db.select().from(users).where(eq(users.role, inputRole));
// Error: Type 'string' is not assignable to 'admin' | 'editor' | 'viewer'

// ✅ Cast explícito:
db.select().from(users).where(eq(users.role, inputRole as typeof users.role.dataType));
// OU defina o tipo corretamente no schema com pgEnum
```

### #5: Conexão preguiçosa no NestJS
```typescript
// ❌ NUNCA crie a conexão no construtor do módulo:
@Module({})
export class DatabaseModule {
  constructor() {
    const client = postgres(process.env.DATABASE_URL!);  // Falha se env não carregou
    this.db = drizzle(client, { schema });
  }
}

// ✅ Use lazy connection via useFactory:
import { Module } from '@nestjs/common';
import { DrizzleModule } from './drizzle.module';

@Module({
  imports: [
    DrizzleModule.forRoot({
      url: process.env.DATABASE_URL!,
      pool: { max: 20, min: 5, idleTimeoutMillis: 30000 },
    }),
  ],
})
export class AppModule {}
```

### #6: Prepared Statements para hot paths
```typescript
// ✅ Queries executadas repetidamente — prepare uma vez:
const getUserById = db
  .select()
  .from(users)
  .where(eq(users.id, placeholder('id')))
  .prepare('get_user_by_id');

// Use no service:
const user = await getUserById.execute({ id: userId });
// Reduz 30-60% do tempo por não re-compilar o plano da query
```

### #7: NOT IN com NULLs — a armadilha silenciosa
```typescript
// ❌ Se a subquery retorna QUALQUER NULL, o resultado é VAZIO:
const activeUsers = await db.select().from(users)
  .where(notInArray(users.id, 
    db.select({ id: bannedUsers.userId }).from(bannedUsers)  
    // Se bannedUsers tem NULL em userId → retorna VAZIO!
  ));

// ✅ Use NOT EXISTS ou filtre NULLs:
const activeUsers = await db.select().from(users)
  .where(notInArray(users.id, 
    db.select({ id: bannedUsers.userId })
      .where(isNotNull(bannedUsers.userId))
  ));
```

### #8: Divisão de inteiros no PostgreSQL
```sql
-- ❌ SELECT 1/2 retorna 0 (não 0.5!)
-- ✅ SELECT 1.0 * 1 / 2 retorna 0.5
```
No Drizzle:
```typescript
// ❌ Para calcular %:
const percentage = sql`${orders.total} / ${orders.target}`;  // pode dar 0!

// ✅ Force decimal:
const percentage = sql`1.0 * ${orders.total} / ${orders.target}`;
```

---

## SEÇÃO 5: O Prompt Perfeito (Exemplo Completo)

Aqui está como seria um prompt bem estruturado para o agente:

```
Preciso criar um endpoint de listagem de projetos com filtros.

CONTEXTO:
- Stack: NestJS + Drizzle ORM + PostgreSQL 16
- Tabela: projects (id uuid, name text, status enum, organization_id uuid FK, owner_id uuid FK, created_at timestamp, deleted_at timestamp nullable)
- Relation: projects has many tasks, projects belongs to organization, projects belongs to user (owner)

REQUISITOS:
- GET /projects com query params: status, search (no nome), page, pageSize
- Sempre filtrar por organizationId do usuário logado (do JWT)
- Sempre excluir soft-deleted (deletedAt IS NULL)
- Retornar projetos com count de tasks
- Paginação com meta (total, page, totalPages)
- Input validado com zod
- Erros de banco nunca expostos ao client

REGRAS DA CONSTITUIÇÃO (obrigatório):
1. Zero sql.raw() — só tagged template sql`` ou query builder
2. Zero N+1 — usar db.query com `with` ou JOINs + batch
3. Toda FK tem index (já existe no schema)
4. .returning() em INSERT/UPDATE (não se aplica aqui, mas lembre)
5. Soft delete: filtrar deletedAt IS NULL
6. Filtro obrigatório por organizationId
7. Colunas explícitas no SELECT
8. Input validado com zod ANTES do banco
9. Paginação sempre
10. ORDER BY com whitelist de colunas válidas

CHECKLIST DE AUTO-REVISÃO (verifique antes de entregar):
□ Nenhuma string concatenation com input do usuário?
□ Zero loops com queries individuais?
□ deletedAt IS NULL no where?
□ organizationId do JWT, não do query param?
□ Paginação implementada?
□ Input validado?
□ Erros traduzidos antes da resposta?
```

---

## SEÇÃO 6: Arquivo de Regras para o Agente (.cursorrules / CLAUDE.md)

Salve este bloco como `.cursorrules` na raiz do projeto:

```yaml
# DRIZZLE + POSTGRES CONSTITUTION

## ABSOLUTE RULES
- NEVER use sql.raw() — use sql`` tagged template or query builder only
- NEVER do SELECT in a loop — use db.query with `with` or JOINs
- EVERY foreign key column MUST have an explicit index() in schema
- ALWAYS use .returning() on INSERT and UPDATE
- ALWAYS filter deleted_at IS NULL on soft-delete tables
- ALWAYS filter by organization_id from auth context, never from user input
- ALWAYS specify columns in SELECT — never select all
- ALWAYS validate input with zod before database operations
- ALWAYS use transactions for multi-step operations
- NEVER expose database errors to the client — translate them
- ALWAYS paginate list endpoints
- NEVER use string interpolation in SQL — even in ORDER BY (whitelist instead)
- NEVER hardcode secrets — use environment variables
- NEVER give AI agents write access to production database

## DRIZZLE-SPECIFIC
- Use db.query.*.findMany({ with: {...} }) for nested data — avoids N+1
- Use db.select({ ... }) for flat data or aggregations
- Use placeholder() + .prepare() for repeated queries
- Use $dynamic() for conditionally-built queries
- Export ALL tables from schema/index.ts or migrations break
- Use pgEnum for status/type columns — not plain strings
- Cast enums explicitly when comparing with narrower types
- Use lazy connection pattern in NestJS — never connect at module load time

## POSTGRESQL-SPECIFIC
- PostgreSQL does NOT auto-create indexes on foreign keys
- 1/2 returns 0 in PostgreSQL — multiply by 1.0 for decimals
- NOT IN with NULL returns empty — use NOT EXISTS or filter NULLs
- Use CREATE INDEX CONCURRENTLY for large tables
- RETURNING clause is PostgreSQL-specific — works in Drizzle
- Use EXPLAIN ANALYZE to verify query plans

## NESTJS PATTERNS
- Inject database via custom DrizzleModule with useFactory
- Use guards for organization scoping
- Use interceptors for response transformation
- Use filters for exception translation (database errors → HTTP errors)
- Validate with zod in pipes — never trust req.body directly
```

---

## SEÇÃO 7: Como Reforçar o Comportamento do Agente

### Técnica 1: Constituição no System Prompt
Se você usa Claude Code ou Cursor, a constituição é carregada automaticamente a cada sessão. Coloque no `CLAUDE.md` ou `.cursorrules`.

### Técnica 2: Prepend automático
Crie um script que concatena a constituição ao início de cada conversa, ou use um plugin/skill que injeta as regras.

### Técnica 3: "Database Constitution" como prompt fixo
Quando começar uma sessão nova sobre banco de dados, sempre envie:

```
Antes de gerar qualquer código de banco de dados, lembre da CONSTITUIÇÃO:

1. NUNCA sql.raw() — só sql`` template tag ou query builder
2. NUNCA SELECT em loop — usar with ou JOINs
3. Toda FK com index explícito
4. .returning() em INSERT/UPDATE
5. Soft delete: deletedAt IS NULL sempre
6. Filtro por organizationId do auth
7. SELECT com colunas explícitas
8. Validação zod antes do banco
9. Transações para operações multi-step
10. Erros de banco nunca vazam pro client

Confirme que entendeu antes de prosseguir.
```

### Técnica 4: Three Strikes — Resetar a conversa
Se o agente viola a constituição 3 vezes seguidas (ex: insiste em usar `sql.raw()`), inicie uma nova conversa com o prompt reforçado. O contexto poluído piora o comportamento.

### Técnica 5: Audit pós-geração
Depois que o agente gerar código, rode uma verificação:

```bash
# Buscar sql.raw no código gerado
grep -rn "sql.raw" src/
# Buscar loops com queries
grep -rn "for.*await.*db\." src/
grep -rn "\.forEach.*db\." src/
# Buscar falta de .returning()
grep -rn "\.insert\|.update" src/ | grep -v "returning"
# Buscar SELECT * implícito
grep -rn "\.select()\.from\|select(\*)" src/
# Buscar FK sem index
grep -rn "\.references(" src/ | while read line; do
  file=$(echo "$line" | cut -d: -f1)
  if ! grep -q "index(" "$file"; then
    echo "⚠️  FK sem index: $line"
  fi
done
```

---

## SEÇÃO 8: Exemplos de Código Correto (Cópia-e-Cola)

### Repository completo com todas as regras:
```typescript
import { Injectable } from '@nestjs/common';
import { DrizzleDb } from '../db/drizzle.module';
import { projects, projectsRelations } from '../db/schema';
import { eq, and, isNull, ilike, sql, count, desc } from 'drizzle-orm';
import { z } from 'zod';

const listProjectsSchema = z.object({
  status: z.enum(['active', 'archived', 'draft']).optional(),
  search: z.string().min(1).max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

type ListProjectsInput = z.infer<typeof listProjectsSchema>;

@Injectable()
export class ProjectsRepository {
  constructor(private readonly db: DrizzleDb) {}

  async listByOrg(orgId: string, input: ListProjectsInput) {
    const { status, search, page, pageSize } = listProjectsSchema.parse(input);
    
    const conditions = [
      eq(projects.organizationId, orgId),
      isNull(projects.deletedAt),
    ];
    
    if (status) conditions.push(eq(projects.status, status));
    if (search) conditions.push(ilike(projects.name, `%${search}%``));

    const offset = (page - 1) * pageSize;

    const [data, [{ total }]] = await Promise.all([
      this.db.select({
        id: projects.id,
        name: projects.name,
        status: projects.status,
        createdAt: projects.createdAt,
      })
      .from(projects)
      .where(and(...conditions))
      .orderBy(desc(projects.createdAt))
      .limit(pageSize)
      .offset(offset),
      
      this.db.select({ total: count() })
        .from(projects)
        .where(and(...conditions)),
    ]);

    return {
      data,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async findById(id: string, orgId: string) {
    const [project] = await this.db.select({
      id: projects.id,
      name: projects.name,
      status: projects.status,
      createdAt: projects.createdAt,
    })
    .from(projects)
    .where(and(
      eq(projects.id, id),
      eq(projects.organizationId, orgId),
      isNull(projects.deletedAt),
    ))
    .limit(1);
    
    return project ?? null;
  }

  async create(data: typeof projects.$inferInsert) {
    const [created] = await this.db.insert(projects).values(data).returning();
    return created;
  }

  async softDelete(id: string, orgId: string) {
    const [deleted] = await this.db.update(projects)
      .set({ deletedAt: new Date() })
      .where(and(
        eq(projects.id, id),
        eq(projects.organizationId, orgId),
      ))
      .returning();
    return deleted;
  }
}
```

### Service com transação:
```typescript
@Injectable()
export class ProjectsService {
  constructor(
    private readonly repo: ProjectsRepository,
    private readonly db: DrizzleDb,
  ) {}

  async createWithTemplate(orgId: string, data: CreateProjectDto) {
    return this.db.transaction(async (tx) => {
      // Cria projeto
      const [project] = await tx.insert(projects).values({
        ...data,
        organizationId: orgId,
      }).returning();

      // Cria tasks do template em batch
      const templateTasks = await tx.select().from(taskTemplates)
        .where(eq(taskTemplates.projectType, data.type));
      
      if (templateTasks.length > 0) {
        await tx.insert(tasks).values(
          templateTasks.map(t => ({
            projectId: project.id,
            name: t.name,
            organizationId: orgId,
          }))
        ).returning();
      }

      return project;
    });
  }
}
```

---

## SEÇÃO 9: Quick Reference Card

| Situação | ❌ Nunca | ✅ Sempre |
|----------|---------|----------|
| Query com input do usuário | `sql.raw(\`...\${input}\`)` | `sql\`...\${input}\`` ou query builder |
| Buscar dados relacionados | Loop com query por item | `db.query.{with}` ou JOIN |
| Criar tabela com FK | Só `.references()` | `.references()` + `index()` |
| Inserir registro | `db.insert().values()` | `db.insert().values().returning()` |
| Deletar registro de usuário | `db.delete()` | `db.update().set({deletedAt: new Date()})` |
| Listar dados | Sem paginação | `limit` + `offset` + `count` |
| Filtrar por tenant | Param do query string | `organizationId` do JWT |
| Ordenar resultados | `ORDER BY ${userInput}` | Whitelist de colunas permitidas |
| Operações multi-step | Queries separadas | `db.transaction()` |
| Erros de banco | Expor `message` do Postgres | Traduzir para mensagem genérica |
| Validação de input | Ir direto pro banco | `zod.parse()` antes |
| Credenciais | Hardcoded no código | `process.env.VAR_NAME` |
| Query repetida | Montar de novo cada vez | `.prepare()` com `placeholder()` |

---

*Este guia é baseado em pesquisa de 13+ fontes independentes (Red Gate, VibeArmor, Vidoc Security, Ponemon Institute, CodeRabbit, Aikido Security, Beesoul Audits, Drizzle ORM docs, GitHub issues) e adaptado especificamente para NestJS + Drizzle + PostgreSQL.*