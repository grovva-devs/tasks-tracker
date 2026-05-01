# 🏛️ Agente de IA — Regras Obrigatórias

> **Cole este arquivo como PRIMEIRA mensagem em toda sessão de código.**  
> Stack: NestJS + Drizzle ORM + PostgreSQL 17+

---

## CONSTITUIÇÃO — VIOLAR = BUG CRÍTICO

```
1. NUNCA sql.raw() com interpolação — use sql`` template tag ou query builder
2. NUNCA queries em loop (N+1) — usar db.query com with ou JOINs
3. Toda FK com index() explícito no schema
4. .returning() em INSERT e UPDATE
5. deletedAt IS NULL em tabelas com soft delete
6. organizationId do auth context, nunca do query param
7. SELECT com colunas explícitas, nunca select all
8. Validação zod ANTES do banco
9. Transações para operações multi-step
10. Erros de banco traduzidos para HTTP errors
11. Paginação em listagens
12. drizzle-kit generate, nunca push em produção
13. Nunca exponha erros de banco ao client
14. Nunca hardcode secrets — use env vars
15. Constructor injection, nunca service locator
16. Feature modules, nunca technical layers
17. Exception filters globais, nunca try/catch em controllers
18. Zod + ValidationPipe, nunca confie em req.body
19. Guards JWT globais + @Public() para rotas abertas
20. Event handlers SEMPRE com try/catch + dead letter queue
```

---

## REGRAS POR CATEGORIA

Antes de gerar código, verifique contra as rules relevantes:

### Banco de Dados (Drizzle)
- `rules/db-avoid-n-plus-one.md` — db.query com `with`, nunca loop
- `rules/db-use-migrations.md` — drizzle-kit generate
- `rules/db-use-transactions.md` — db.transaction() para multi-step

### Arquitetura (NestJS)
- `rules/arch-feature-modules.md` — organizar por feature
- `rules/arch-avoid-circular-deps.md` — extrair SharedModule ou usar eventos
- `rules/arch-single-responsibility.md` — 1 service = 1 domínio
- `rules/arch-use-repository-pattern.md` — repository encapsula queries
- `rules/arch-use-events.md` — EventEmitter2 para desacoplar
- `rules/arch-module-sharing.md` — export module, nunca service direto

### Dependency Injection
- `rules/di-prefer-constructor-injection.md` — constructor injection sempre
- `rules/di-avoid-service-locator.md` — nunca ModuleRef.get()
- `rules/di-interface-segregation.md` — interfaces pequenas e focadas
- `rules/di-use-interfaces-tokens.md` — Symbol tokens para interfaces

### Erros
- `rules/error-throw-http-exceptions.md` — throw do service, nunca return error
- `rules/error-use-exception-filters.md` — filters globais, nunca try/catch em controller
- `rules/error-handle-async-errors.md` — fire-and-forget com .catch()

### Segurança
- `rules/security-auth-jwt.md` — JWT curto + refresh + validação no strategy
- `rules/security-use-guards.md` — Guards globais + @Public()
- `rules/security-validate-all-input.md` — Zod + ValidationPipe
- `rules/security-sanitize-output.md` — @Exclude() + Helmet
- `rules/security-rate-limiting.md` — @nestjs/throttler

### Performance
- `rules/perf-optimize-database.md` — colunas no SELECT, indexes, paginação
- `rules/perf-use-caching.md` — CacheModule com Redis + invalidação por evento

### API
- `rules/api-use-dto-serialization.md` — nunca retornar entity direto
- `rules/api-use-pipes.md` — ParseUUIDPipe, DefaultValuePipe
- `rules/api-use-interceptors.md` — logging, transform, timeout
- `rules/api-versioning.md` — VersioningType.URI para breaking changes

### Testes
- `rules/test-use-testing-module.md` — Test.createTestingModule com mocks
- `rules/test-e2e-supertest.md` — Supertest com banco de teste
- `rules/test-mock-external-services.md` — Mock via injection tokens

### DevOps
- `rules/devops-use-config-module.md` — ConfigService + Joi validation
- `rules/devops-graceful-shutdown.md` — enableShutdownHooks + SIGTERM
- `rules/devops-use-logging.md` — Pino com JSON em produção

### Microservices
- `rules/micro-use-health-checks.md` — /health/live + /health/ready
- `rules/micro-use-patterns.md` — MessagePattern=sinc, EventPattern=async
- `rules/micro-use-queues.md` — BullMQ para jobs pesados

---

## CHECKLIST PÓS-GERAÇÃO

Antes de entregar qualquer código de banco:

- [ ] Nenhuma `sql.raw()` com interpolação?
- [ ] Zero loops com queries individuais (N+1)?
- [ ] Toda FK tem `index()`?
- [ ] `.returning()` em INSERT/UPDATE?
- [ ] `deletedAt IS NULL` em queries de leitura?
- [ ] Filtro por orgId do auth?
- [ ] SELECT com colunas explícitas?
- [ ] Input validado com zod?
- [ ] Operações multi-step em transação?
- [ ] Erros traduzidos antes da resposta?

Hub completo: `docs/plans/IMPLEMENTATION-HUB.md`
**Style Guide:** `docs/plans/STYLE-GUIDE.md` — Paleta, tipografia, grid, motion, tom de voz do Grovva.**Ref Kan+Focalboard (Schema):** `docs/plans/REFERENCE-kan-focalboard-extraction.md` — padrões de schema extraídos de projetos reais de kanban
**Ref Kan+Focalboard (UI/UX):** `docs/plans/REFERENCE-kan-focalboard-ui-ux.md` — drag-to-scroll, scroll restore, optimistic updates, onboarding tour, empty states, card badges, filtros, sidebar (⚠️ SEM keyboard shortcuts — usuário decidiu)