# Erros de SQL em Projetos Vibe Coded — Pesquisa Completa

**Data:** 2026-04-27  
**Fontes:** Red Gate Simple Talk, Vibe Coder Blog, SecureVibeCoding.io, Vibecoding.app, VibeArmor.ai, Vidoc Security Lab, Stackademic, DataField.dev, Sonra/FlowHigh, SQL Boy, Kunal Ganglani, Vybe Blog, GitHub (claude-code-plugins-plus-skills)

---

## Resumo Executivo

Pesquisas independentes convergem em números alarmantes:

| Métrica | Fonte |
|---------|-------|
| **45%** do código AI contém vulnerabilidades OWASP | Veracode 2025 |
| **2.74x** mais vulnerabilidades que código humano | CodeRabbit (470 PRs) |
| **2.600** CVEs de SQL injection esperados em 2025 | Aikido Security |
| **70%** dos apps Lovable sem RLS habilitado | Beesoul Audits |
| **24.7%** do código AI tem pelo menos 1 flaw de segurança | Black Duck research |
| **28%** mais chance de SQL injection com AI assistants | Ponemon Institute |
| **18%** dos apps com ORM vulneráveis à SQL injection no primeiro scan | Propel 2025 |

A conclusão unânime: **a IA gera SQL funcional que parece correto, mas sistematicamente falha em segurança, performance, e integridade de dados** — e esses erros são invisíveis em testes com poucos dados.

---

## Os 7 Erros Críticos de SQL em Projetos Vibe Coded

### 1. SQL Injection por Concatenação de Strings

**O erro #1 mais frequente e mais perigoso.**

A IA gera queries usando interpolação/concatenação de strings ao invés de queries parametrizadas, porque esse é o padrão mais comum nos dados de treinamento (tutoriais, Stack Overflow, código legacy).

```python
# ❌ Gerado pela IA (vulnerável)
query = f"SELECT * FROM users WHERE username = '{username}'"
cursor.execute(query)

# ✅ Correto (parametrizado)
query = "SELECT * FROM users WHERE username = %s"
cursor.execute(query, (username,))
```

**Por que acontece:** O prompt "write a query that finds users by username" produz concatenação. Já "write a **parameterized** query that finds users by username using prepared statements for PostgreSQL 16" produz código seguro. A diferença está inteiramente no prompt.

**O problema com ORMs:** A IA bypassa a segurança do ORM de 3 formas:
- **Escape hatches:** Usa `$queryRawUnsafe` do Prisma ao invés de `$queryRaw` com tagged templates
- **Uso parcial:** ORM para CRUD simples, raw SQL com concatenação para buscas/filtros complexos
- **Misconfiguração:** Mistura queries seguras do ORM com raw SQL inseguro para sorting/reporting

**Detecção:**
```bash
# Buscar raw SQL com interpolação
grep -rn "SELECT.*\${" --include="*.ts" --include="*.py" src/
grep -rn "$queryRawUnsafe" --include="*.ts" src/
grep -rn "sequelize.query(" --include="*.js" src/
grep -rn "knex.raw(" --include="*.js" src/
grep -rn "text()" --include="*.py" src/   # SQLAlchemy
```

---

### 2. Schema Alucinado (Tabelas/Colunas Inventadas)

A IA referencia tabelas, colunas, ou relacionamentos que não existem no seu schema real. Dois tipos:

**Schema-based (fácil de pegar):** JOIN em `users_profile` quando só existe `users`. O query falha com erro — pelo menos o problema é imediato.

**Logic-based (perigoso):** SQL sintaticamente correto que roda sem erro mas retorna dados semanticamente errados:
- Agregação agrupa pela coluna errada
- JOIN produz produto cartesiano por condição faltando
- Filtro de data off-by-one por assumir timezone errada
- Coluna `user_id` vs `userid` — a IA adivinha sem saber

**Detecção:** Incluir o schema DDL completo em cada prompt e verificar cada query gerada contra o schema antes de executar.

---

### 3. Confusão de Sintaxe Cross-Database

A IA foi treinada em SQL de **todos** os engines — PostgreSQL, MySQL, SQL Server, Oracle, SQLite. Sem especificar o engine, ela gera código que mistura sintaxes:

| Recurso | PostgreSQL | MySQL | SQL Server | Oracle |
|---------|-----------|-------|------------|--------|
| Row limiting | `LIMIT` | `LIMIT` | `TOP` | `ROWNUM` |
| Return inserted | `RETURNING` | ❌ | `OUTPUT` | `RETURNING` |
| FK index automático | ❌ | ✅ | ❌ | ❌ |
| GROUP BY sem agregação completa | ❌ | ✅ (modo antigo) | ❌ | ❌ |

**O que fazer:** Especificar engine, versão, e flags de configuração em **todo** prompt de banco de dados.

---

### 4. Problema N+1 (O Assassino Silencioso de Performance)

O erro de performance **mais comum** em código gerado por IA. A IA descreve a recuperação de dados de forma iterativa ("for each order, get the customer"), e então espelha essa iteração no código:

```typescript
// ❌ N+1: 1 query + N queries
const orders = await supabase.from('orders').select('*')
for (const order of orders.data) {
  const customer = await supabase
    .from('customers')
    .select('*')
    .eq('id', order.customer_id)
}

// ✅ 1 query com join
const orders = await supabase
  .from('orders')
  .select('*, customers(*)')
```

Com 50 registros em dev: instantâneo. Com 50.000 em produção: **50.001 queries**, degradação catastrófica.

**Com ORMs é invisível:** O código parece limpo porque usa lazy-loading do ORM dentro de um loop. O SQL real que chega ao banco é uma avalanche.

---

### 5. Índices Faltando em Foreign Keys

O padrão que causa **mais dano a longo prazo**. A IA cria a constraint de foreign key corretamente, mas consistentemente omite o índice na coluna FK:

```sql
-- ❌ FK sem índice (gerado pela IA)
CREATE TABLE orders (
  id uuid PRIMARY KEY,
  customer_id uuid REFERENCES customers(id),  -- sem índice!
  total decimal
);

-- ✅ Com índice
CREATE TABLE orders (
  id uuid PRIMARY KEY,
  customer_id uuid REFERENCES customers(id),
  total decimal
);
CREATE INDEX idx_orders_customer_id ON orders(customer_id);
```

**Por que é invisível:** Com 100 linhas, tudo funciona. Com 100.000, cada JOIN faz full table scan. Uma query de 3ms vira 800ms.

**Nota importante:** MySQL cria índice automaticamente em FKs. PostgreSQL e SQL Server **não**. Se seu schema é PostgreSQL gerado por IA, esse gap **vai** aparecer em produção.

**Detecção (PostgreSQL):**
```sql
SELECT tc.table_name, kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
LEFT JOIN pg_indexes pi
  ON pi.tablename = tc.table_name
  AND pi.indexdef LIKE '%' || kcu.column_name || '%'
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
  AND pi.indexname IS NULL;
```

---

### 6. Row Level Security (RLS) Desabilitado ou Permissivo

**~70% dos apps Lovable** são enviados com RLS desabilitado ou com políticas permissivas demais:

```sql
-- ❌ RLS desabilitado = qualquer usuário autenticado lê TUDO
-- (padrão na maioria dos apps vibe-coded com Supabase)

-- ❌ Política permissiva demais
CREATE POLICY "anyone_can_read" ON messages
  FOR SELECT USING (auth.uid() IS NOT NULL);
-- Todo usuário logado vê mensagens de todos

-- ✅ Política correta
CREATE POLICY "read_own_messages" ON messages
  FOR SELECT USING (
    sender_id = auth.uid() OR recipient_id = auth.uid()
  );
```

**Padrões de falha RLS na IA:**
1. `USING(true)` — acesso a todas as roles
2. `UPDATE` sem `WITH CHECK` — permite privilege escalation
3. RLS habilitado mas **zero políticas** — bloqueia tudo

---

### 7. Erros de Lógica SQL (Retorna Dados Errados Silenciosamente)

O query roda sem erro, mas os números estão errados. Os mais comuns:

**a) Fan Trap (JOINs Explosivos):**
```sql
-- ❌ Produtos x Vendas x Devoluções = multiplicação de linhas
SELECT p.name, SUM(s.amount), SUM(r.amount)
FROM products p
LEFT JOIN sales s ON p.id = s.product_id
LEFT JOIN returns r ON p.id = r.product_id
GROUP BY p.name;
-- Vendas e devoluções são inflados pelo produto cartesiano

-- ✅ Agregar ANTES do join
WITH sales_agg AS (
  SELECT product_id, SUM(amount) FROM sales GROUP BY product_id
),
returns_agg AS (
  SELECT product_id, SUM(amount) FROM returns GROUP BY product_id
)
SELECT p.name, COALESCE(s.sum, 0), COALESCE(r.sum, 0)
FROM products p
LEFT JOIN sales_agg s ON p.id = s.product_id
LEFT JOIN returns_agg r ON p.id = r.product_id;
```

**b) NOT IN com NULLs:**
```sql
-- ❌ Se a subquery tem QUALQUER NULL, retorna VAZIO
SELECT * FROM orders
WHERE order_id NOT IN (SELECT order_id FROM order_details);
-- Se order_details tem UM NULL em order_id → 0 linhas!

-- ✅ Usar NOT EXISTS ou IS NOT NULL
SELECT * FROM orders o
WHERE NOT EXISTS (
  SELECT 1 FROM order_details od WHERE od.order_id = o.order_id
);
```

**c) Filtros em LEFT JOIN no WHERE:**
```sql
-- ❌ Filtro no WHERE converte LEFT JOIN em INNER JOIN
SELECT a.col1, b.col2
FROM customers a
LEFT JOIN orders b ON a.customer_id = b.customer_id
WHERE b.order_number <> 'x2345'
-- Clientes sem pedidos somem!

-- ✅ Filtro no ON (ou IS NULL no WHERE)
LEFT JOIN orders b ON a.customer_id = b.customer_id
  AND b.order_number <> 'x2345'
```

**d) Divisão de Inteiros:**
```sql
-- ❌ Em PostgreSQL/SQL Server: 1/2 = 0 (não 0.5!)
SELECT 99/100;  -- Retorna 0

-- ✅ Forçar decimal
SELECT 1.0 * 99 / 100;  -- Retorna 0.99
```

---

## Erros Adicionais Documentados

### 8. Segredos Expostos no Client-Side
~40% dos apps Supabase escaneados tinham `service_role` key, Stripe `sk_live_`, ou OpenAI keys no bundle do browser. A IA usa `NEXT_PUBLIC_` para toda variável de ambiente.

### 9. Missing Authorization Checks (IDOR)
Rotas como `/api/orders/[id]` sem verificar ownership. IDs sequenciais permitem enumeração.

### 10. Hard Deletes (Sem Soft Delete)
A IA usa `DELETE` permanente. Sem `deleted_at`, sem undo, sem audit trail, sem compliance.

### 11. Soft Deletes Inconsistentes
A IA adiciona `deleted_at` mas esquece de filtrar em algumas queries — lista mostra 10, contador mostra 12.

### 12. SELECT * Sempre
A IA nunca especifica colunas. Problemas: dados sensíveis vazam, bandwidth desperdiçado, tipos TypeScript muito amplos, índices não aproveitáveis.

### 13. Funções em WHERE/JOIN
```sql
-- ❌ Impede uso de índice
WHERE DATEADD(d, 30, date_of_birth) > GETDATE()

-- ✅ Reescrever sem função na coluna
WHERE date_of_birth > DATEADD(d, -30, GETDATE())
```

### 14. Múltiplas Instâncias do Supabase Client
A IA cria `createClient()` em cada arquivo. Resultado: auth state não compartilhado, subscriptions duplicadas, 3x refresh de token.

### 15. Webhooks Não Verificados
A IA cria endpoints de webhook sem verificar assinatura. Qualquer um que saiba a URL pode enviar payloads falsos (ex: pagamento fictício do Stripe).

### 16. ORDER BY em Subqueries/CTEs Desnecessariamente
Sorting é caro. A IA coloca ORDER BY em CTEs intermediárias onde o resultado logo será re-processado.

### 17. UNION ao Invés de UNION ALL
UNION remove duplicatas (caro). UNION ALL não. Na maioria dos casos UNION ALL é suficiente.

---

## Anti-Padrões SQL Comuns Que a IA Reproduz

| Anti-Padrão | Tipo | Severidade |
|------------|------|-----------|
| ANSI-89 JOIN syntax (WHERE) | Legibilidade | Warning |
| COUNT(*) em OUTER JOIN | Correção | Warning |
| Subqueries escalares aninhadas no SELECT | Performance | Warning |
| Filtros no lado non-preserved do OUTER JOIN | Correção | Warning |
| Filtrar por `= NULL` ao invés de `IS NULL` | Correção | Warning |
| Colunas sem alias de tabela em multi-join | Correção | Warning |
| INNER JOIN após OUTER JOIN (converte implicitamente) | Correção | Warning |
| CROSS JOIN implícito (ANSI-89) | Performance/Correção | Warning |
| NATURAL JOIN | Correção | Warning |
| LIKE quando REGEX não é necessário | Performance | Caution |
| WHERE para filtrar agregados (deveria usar HAVING) | Performance | Caution |
| Self-join correlacionado (usar window functions) | Performance | Caution |
| SELECT DISTINCT como band-aid para duplicatas | Correção | Notice |
| ORDER BY em CTEs intermediárias | Performance | Caution |
| Funções em WHERE/JOIN (impede índice) | Performance | Caution |

---

## Checklist de Revisão para SQL Gerado por IA

### 🔒 Segurança
- [ ] Todas as queries usam parametrização (zero concatenação de strings)
- [ ] Service role key NUNCA no client-side
- [ ] RLS habilitado em TODAS as tabelas
- [ ] Políticas RLS escopam para `auth.uid()` (não `USING(true)`)
- [ ] Verificação de assinatura em todos os webhooks
- [ ] Checagem de ownership em endpoints por ID

### 📊 Performance
- [ ] Índices em TODAS as colunas FK (especialmente PostgreSQL/SQL Server)
- [ ] Zero padrões N+1 (usar JOINs ou `.in()` batch)
- [ ] Colunas especificadas no SELECT (não `SELECT *`)
- [ ] Sem funções em colunas de WHERE/JOIN
- [ ] UNION ALL ao invés de UNION quando duplicatas não importam
- [ ] Sem ORDER BY em CTEs/subqueries intermediárias

### ✅ Correção
- [ ] NOT IN com verificação de NULL (ou usar NOT EXISTS)
- [ ] Filtros em LEFT JOINs no ON, não no WHERE
- [ ] Agregações antes de JOINs que envolvam múltiplos "many" sides
- [ ] Divisões forçadas para decimal (`1.0 * / `)
- [ ] Soft deletes consistentes (`deleted_at IS NULL` em todas queries)
- [ ] Checar `deleted_at IS NULL` quando a tabela tem soft delete

### 🏗️ Manutenibilidade
- [ ] Engine/version especificado no prompt
- [ ] Schema DDL completo incluído no prompt
- [ ] Tipos gerados do banco (não interfaces manuais)
- [ ] Singleton do client Supabase/Prisma
- [ ] Connection pooling em serverless (port 6543 Supavisor)
- [ ] Sem APIs/imports alucinados (verificar em REPL)

---

## 4 Práticas Fundamentais (Red Gate / OpenSSF)

1. **Incluir o schema DDL completo** em todo prompt de banco de dados
2. **Especificar engine e versão** (ex: "PostgreSQL 16 com RLS habilitado")
3. **Pedir para a IA explicar o raciocínio** para JOINs, escolhas de índice, e limites de transação
4. **NUNCA dar write access a produção** para um agente de IA sem steps de confirmação e audit trail

---

## Ferramentas de Detecção Automatizada

| Ferramenta | Tipo | Usa para |
|-----------|------|----------|
| SQLmap | DAST | Pentesting SQL injection |
| OWASP ZAP | DAST | Scan automatizado de SQLi |
| Semgrep | SAST | Detectar concatenação em SQL |
| CodeQL | SAST | Análise estática de vulnerabilidades |
| Snyk | SCA | Vulnerabilidades em dependências |
| Bandit (Python) | SAST | Issues de segurança em Python |
| `npm audit` / `pip-audit` | SCA | Vulnerabilidades em pacotes |
| SonarQube | SAST | Análise contínua de qualidade |
| EXPLAIN ANALYZE | DB | Identificar Seq Scans, N+1 |
| FlowHigh SQL Analyser | SAST | Anti-patterns de SQL |

---

## O Loop de Revisão Recomendado

```
IA gera SQL → Humano revisa contra checklist → 
Testa com dados realistas → EXPLAIN ANALYZE → 
SAST/DAST automatizado → Deploy com audit trail
```

**O código AI é um primeiro rascunho, não um produto final.** A revisão humana NÃO é opcional para código de banco de dados.