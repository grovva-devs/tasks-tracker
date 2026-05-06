```yaml
---
title: "Fase 3 — Polimento e UX Final: Dashboard, Search, Theme, Mobile, Profile, Categories"
prd: PRD-004
status: Draft
author: "Claude Code"
date: 2026-05-06
---

# Plan: Fase 3 — Polimento e UX Final

## Source

- **PRD**: `docs/prd/PRD-004-fase3-polimento-ux.md`
- **Context**: PRD-002 e PRD-003 entregaram funcionalidade core e confiabilidade. Fase 3 é puramente polish — corrige inconsistências de UI, adiciona conveniência, e diferencia o produto como profissional.
- **Date**: 2026-05-06
- **Author**: Claude Code

## Architecture Overview

A Fase 3 não introduz novos domínios de negócio nem novas tabelas no banco. É uma fase de **refinamento transversal** que toca múltiplos pontos da aplicação simultaneamente — do dashboard ao kanban, do header ao card detail, do desktop ao mobile. A estrutura arquitetural permanece inalterada (NestJS modular, Drizzle ORM, React Query no frontend).

O foco arquitetural aqui é **consistência de dados e estado**. Muitos dos "polimentos" corrigem desconexões entre backend e frontend:
- O backend calcula `completedBoardPercentage` mas o frontend espera `avgCompletionPercentage`.
- O backend retorna `cardNumber` mas o frontend nunca o renderiza.
- O backend retorna `description` mas o frontend nunca a mostra.
- O backend fornece `board.stats` no endpoint autenticado, mas a view pública recalcula manualmente.

Além das correções de dados, há três novos componentes de UX que exigem atenção arquitetural:

1. **Tema (Dark/Light)** — Usa `next-themes` com `class` strategy. Requer atenção ao SSR: o `html` tag deve receber `class="dark"` antes do primeiro render para evitar FOUC (flash de conteúdo não-estilizado). `suppressHydrationWarning` é necessário porque o tema no servidor e no cliente podem divergir.

2. **Mobile responsive** — A sidebar fixa de 256px deve colapsar para um drawer em telas menores. O kanban já usa `overflow-x-auto`, mas precisa de touch targets maiores (mínimo 44px). O card detail (Sheet) deve posicionar-se `side="bottom"` em mobile e `side="right"` em desktop.

3. **Error handling padronizado** — Todos os `catch` espalhados ao redor da aplicação são consolidados em um interceptor global no `apiClient.ts`. Isso significa que a lógica de "401 -> redirect para login" e "403 -> toast de erro" vive em um único lugar, não replicada em cada componente.

## Components

### C1: Backend Data Fixes

**Purpose**: Corrigir dados retornados pelo backend que estão desconectados das expectativas do frontend.

**Key Details**:
- **Avg completion** (FR-1): `DashboardService.getOverview()` deve calcular `AVG(completionPercentage)` entre boards ativos, não `COUNT(completed) / COUNT(all)`. A query atual retorna `completedBoardPercentage`; renomear/adicionar `avgCompletionPercentage`.
- **Search por título** (FR-2): `BoardsService.findAll()` usa `ilike(clientName, ...)` apenas. Adicionar `OR ilike(boards.title, ...)`. O Drizzle ORM suporta `or()` com `ilike`.
- **Public board stats** (FR-8): `BoardsService.findPublicDetail()` deve chamar `getStats(boardId)` e incluir `stats` no objeto retornado. O frontend então usa `board.stats.completionPercentage` em vez de recalcular.
- **Users profile endpoint** (FR-11): Novo `PATCH /users/me` para `displayName` e `avatarUrl`. Novo `PATCH /users/me/password` para troca de senha com validação de old password via bcrypt.

**Dependencies**: None (modificações puras de queries/endpoints)

### C2: Dashboard Polishing

**Purpose**: Adicionar dados que já existem (mas não são exibidos) e melhorar navegação.

**Key Details**:
- **Board description no dashboard** (FR-5): `BoardCard` recebe `description` do board e mostra com `line-clamp-1` (1 linha, ellipsis). Se não houver descrição, a linha não aparece.
- **Card number** (FR-4): `BoardCardItem` mostra `#{cardNumber}` antes do título, em `text-xs text-muted-foreground`. No `CardDetailPanel`, o `SheetTitle` também mostra `#{cardNumber} - {title}`.
- **Status filter tabs** (FR-3): `BoardListPage` adiciona tabs (`Tabs` do shadcn/ui) para All / Active / Completed / Archived. A query para o backend inclui `?status=active` conforme o tab selecionado. "All" não envia filtro.
- **Copy link feedback** (FR-9): Toast `sonner` no `BoardDetailPage` quando o botão "Copy Public Link" é clicado.
- **Regenerate token feedback** (FR-9): Ao regenerar, invalidar query do board (`queryClient.invalidateQueries(['board', boardId])`) para atualizar o token no header. Mostrar toast de confirmação.

**Dependencies**: C1 (board description precisa do backend retornar description)

### C3: Interaction Polishing

**Purpose**: Conectar clicks a navegação, padronizar tratamento de erros, e adicionar feedback visual.

**Key Details**:
- **Notification links** (FR-7): O `NotificationBell` envolve cada notificação em um `<Link>` do Next.js com `href={/boards/${n.boardId}}`. Se houver `cardId`, adicionar `?cardId={n.cardId}` na URL. O `BoardDetailPage` lê `searchParams` no carregamento e, se `cardId` presente, abre o `CardDetailPanel` automaticamente (chama `handleCardClick(cardId)` no `useEffect`).
- **Error handling global** (FR-10): `apiClient.ts` recebe um wrapper de `fetch`. Em `!res.ok`, extrai o JSON de erro. Baseado no `status`:
  - 401: salva url atual em `sessionStorage`, redireciona para `/login`
  - 403: `toast.error("You don't have permission to perform this action.")`
  - 404: `toast.error("Resource not found.")`
  - 422 (validation): `toast.error(error.message)` (mensagem do backend)
  - 500/503: `toast.error("Something went wrong. Please try again.")`
- **Template card description** (FR-6): No editor de templates (`TemplateEditor`), cada card listado em uma list tem um `Textarea` adicional para descrição. Salva em `description` do template card. Aplicação de template copia `description` para o card criado.

**Dependencies**: C1 (para notifications links precisar de boardId/cardId)

### C4: Template Categories Frontend

**Purpose**: Expor o CRUD de `template_categories` que já existe no backend.

**Key Details**:
- **Category Manager** (FR-12): Modal (`Dialog`) para criar/editar/deletar categorias. Só admin vê o botão "Manage Categories". Endpoint existente: `template-categories` (controller da Fase 1).
- **Category Filter** (FR-12): `TemplatesPage` recebe dropdown (`Select`) com categorias. Se uma categoria é selecionada, a query para `/templates` inclui `?categoryId=X`.
- **Template Editor** (FR-12): Dropdown de categoria no form de criação/edição de template. Salva `categoryId` no body do POST/PATCH.

**Dependencies**: PRD-002 (backend de categorias já implementado; Fase 1 não adicionou guard BoardMemberGuard em categorias, pois templates são globais)

### C5: Profile Update

**Purpose**: Página dedicada para o usuário gerenciar próprio perfil.

**Key Details**:
- Nova página `/profile` com layout clean (sem sidebar).
- Seções: **Profile** (displayName, avatar URL), **Security** (old password, new password, confirm new password).
- Upload de avatar usa o mesmo endpoint de upload multipart do sistema (reutiliza config S3). Bucket `avatars/`.
- Avatar atualiza o `useAuthStore` imediatamente para refletir no header.
- Role não é editável (só admin).

**Dependencies**: C1 (endpoint `PATCH /users/me`)

### C6: Theme (Dark/Light)

**Purpose**: Permitir alternância entre temas claro e escuro.

**Key Details**:
- `ThemeProvider` envolve o app em `apps/web/src/app/layout.tsx`. Usa `next-themes` com `attribute="class"`.
- Toggle no header (botão com ícones `Sun`/`Moon` do lucide-react).
- `globals.css` usa CSS variables do Tailwind v4 e classes `dark:` para ambos os temas. Nenhuma cor hardcoded (exceto branding `primaryColor` que é dinâmico e aplicado via inline style ou CSS variable).
- **`suppressHydrationWarning` no body** para suprimir aviso de mismatch SSR/hidratação.

**Dependencies**: None

### C7: Mobile Responsive

**Purpose**: Tornar a interface usável em tablets e smartphones.

**Key Details**:
- **Sidebar** (`Sidebar.tsx`): Em telas < 768px (`md:` breakpoint do Tailwind), a sidebar não é renderizada. Em vez disso, um ícone de hambúrguer no header abre um `Sheet` com o menu de navegação.
- **Kanban**: Adicionar `min-w-fit` nas listas para garantir que não comprimem em mobile. Scroll horizontal funciona via drag-and-touch (o DnD do Pangea já suporta touch).
- **Card Detail**: Usar `const isMobile = useMediaQuery('(max-width: 768px)')` (ou via CSS) para determinar `side={isMobile ? "bottom" : "right"}` no `Sheet`.
- **Touch targets**: Todos os botões de ação (`Add card`, `Edit`, `Delete`) devem ter mínimo `h-10` (40px) ou preferencialmente `h-11` (44px).

**Dependencies**: C6 (theme deve funcionar em mobile também)

## Implementation Order

| Phase | Component | FRs | Dependencies | Estimated Scope | Milestone |
|-------|-----------|-----|-------------|-----------------|-----------|
| 1 | **C1: Backend Data Fixes** | FR-1, FR-2, FR-8, FR-11 | None | Small | Stats card calcula avg corretamente; public endpoint inclui stats; search por título funciona; profile endpoints existem |
| 2 | **C2: Dashboard Polishing** | FR-3, FR-4, FR-5, FR-9 | Phase 1 (backend fixes) | Small | Tabs de status, card number visível, description truncada, copy/regenerate com toast |
| 3 | **C3: Interaction Polishing** | FR-6, FR-7, FR-10 | Phase 1 (backend fixes) | Small | Notification links, error handling global, template card description |
| 4 | **C4: Template Categories** | FR-12 | Backend já pronto (Fase 1) | Small | CRUD de categorias visível; templates filtráveis por categoria |
| 5 | **C5: Profile Update** | FR-11 | Phase 1 (profile endpoint) | Small | Página de perfil funcional; avatar e senha atualizáveis |
| 6 | **C6: Theme** | FR-13 | None (independent) | Small | Toggle dark/light; persistência em localStorage; sem FOUC |
| 7 | **C7: Mobile Responsive** | FR-14 | Phase 2, 3, 6 (UI polida) | Medium | Sidebar colapsa em mobile; kanban scrolla; card detail é bottom sheet |
| 8 | **Integration & QA** | All | All above | Small | Teste visual em 3 viewports (desktop 1440px, tablet 768px, mobile 375px) |

**Dependency Rationale:**
- **C1 (Backend fixes)** é o único trabalho de backend desta fase. Ele desbloqueia C2, C3, e C5 porque sem os endpoints corretos, o frontend não pode exibir os dados.
- **C2, C3, C4, C5, C6** são majoritariamente frontend e podem rodar em paralelo após C1.
- **C7 (Mobile)** deve vir por último porque precisa testar a interface completa em mobile. Se outras fases ainda estão sendo implementadas, o layout mobile pode quebar a cada mudança.
- **C6 (Theme)** é independente mas interage com C7: o tema dark deve ser testado em mobile também.

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| **FOUC ao carregar dark mode** — página pisca branca antes de aplicar tema escuro | Medium | Medium | Usar `next-themes` com `defaultTheme="system"` e `disableTransitionOnChange`. Adicionar `<script>` inline no `head` do layout para setar tema antes do primeiro paint (evita hidratação). |
| **Mobile sidebar quebra layout do kanban** — sidebar oculta em mobile faz o main area expandir, mas kanban pode não respeitar novo width | Medium | Medium | Testar kanban com flex container `w-full`. Usar `min-w-max` nas colunas para impedir compressão. |
| **DnD do Pangea conflita com scroll em mobile** — drag iniciado acidentalmente ao tentar scrollar horizontalmente | Medium | Medium | Adicionar `delay` de 100ms no drag para distinguir tap de drag. Usar `touch-action: pan-x` na container do kanban. |
| **Error handling global esconde erros inesperados** — interceptor 500 mostra mensagem genérica que impede debugging | Low | High | Sempre logar o erro original no `console.error()` antes de mostrar toast genérico. Manter `error.message` do backend no toast para 422. |
| **Notification link para card deletado** — se card foi deletado, o link `?cardId=X` abre o board mas o card detail falha com 404 | Low | Medium | Se `handleCardClick` retorna 404, toast.warn("Card no longer exists") e não abre o panel. Redirecionar para o board sem query param. |
| **Status tabs + paginação** — filtrar por status com paginação pode causar saltos de página (ex: pag 2 de active mostra menos itens) | Low | Medium | Resetar `page` para 1 sempre que o filtro de status mudar. Invalidar query com nova key. |
| **Template categories empty state** — se não há categorias, o dropdown fica vazio e confuso | Low | Low | Mostrar "No categories" com link para "Create first category". O botão "Manage Categories" sempre visível. |

## Open Questions

- **Q1: O bottom sheet de card detail em mobile deve ser full-screen ou 80% height?** Full-screen facilita leitura longa, mas 80% permite ver o board por trás. Decisão de UX.
- **Q2: O toggle de tema deve refletir no logo do branding?** Se o admin enviou um logo com fundo branco, em dark mode o logo fica feio. Deveríamos permitir upload de "logo dark mode"?
- **Q3: A busca por título deve ser case-insensitive e acentos?** `"Acme"` deve encontrar `"Ácme"`? Drizzle `ilike` não lida com acentos no PostgreSQL por padrão. Precisa `unaccent` extension ou normalização manual.

## ADR Index

| ADR | Title | Status | Rationale |
|-----|-------|--------|-----------|
| Existing | ADR-0004: Template Variable Substitution | Completed | Template card description e categories são extensions do template system. Nenhuma mudança fundamental. |
| Proposed | Theme Strategy with next-themes | Pending | Decision D1 do PRD-004. Já decidido usar `next-themes`, mas formalizar escolha de `class` vs `data-theme` pode ser útil para manutenção futura. |
| Proposed | Bottom Sheet para Mobile vs Full Screen | Pending | Decision D2 do PRD-004. Apenas relevante se a equipe de UX precisar revisitar. |

---
