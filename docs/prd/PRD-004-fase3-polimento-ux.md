```yaml
---
title: "Fase 3 — Polimento e UX Final: Dashboard, Search, Theme, Mobile, Profile, Categories"
prd: PRD-004
status: Draft
owner: TBD
issue: N/A
date: 2026-05-06
version: "1.0"
---

# PRD: Fase 3 — Polimento e UX Final: Dashboard, Search, Theme, Mobile, Profile, Categories

---

## 1. Problem & Context

As Fases 1 (PRD-002) e 2 (PRD-003) entregaram funcionalidade completa e confiabilidade operacional. Com o núcleo sólido, é hora de polir a **experiência de uso**, **corrigir inconsistências de UI**, e **adicionar funcionalidades de conveniência** que tornam o produto profissional e agradável de usar diariamente.

**Gaps de polimento mapeados:**
- **Dashboard avg completion:** O `DashboardService.getOverview()` calcula `completedBoardPercentage` (boards completados), mas o `StatsCards` frontend espera `avgCompletionPercentage` (média de completion por board). O valor sempre aparece como `undefined`/`0`.
- **Search por título:** O backend de boards só filtra por `clientName` via `ilike`. Não busca por `title`.
- **Filtro de status no frontend:** O `BoardList` não tem tabs de filtro (All/Active/Completed/Archived). Sempre mostra todos.
- **Card number display:** O schema tem `cardNumber` (auto-incremental por board), mas não aparece na UI do kanban nem no detail panel.
- **Board description:** O schema tem `description`, é criado no form, mas nunca é exibido no dashboard nem no board header.
- **Template card description:** O editor de templates aceita `description` nos cards, mas não mostra campo de descrição no frontend.
- **Notification links:** Notificações no bell popover não são clicáveis. Não redirecionam para board/card.
- **Public board stats:** A public view recalcula completion manualmente no frontend. Deveria usar `stats` do backend.
- **Copy link / regenerate token — feedback:** Copiar public link não mostra toast. Regenerar token não atualiza UI.
- **Error handling padronizado:** Muitos `catch` blocks fazem `console.error` genérico ou toast sem contexto.
- **Profile update:** Usuários não podem atualizar displayName, avatar, ou password.
- **Template categories no frontend:** O backend tem CRUD de categorias, mas o frontend não tem UI.
- **Dark/Light theme:** `next-themes` está no package.json do web mas não é usado.
- **Mobile responsive:** Sidebar fixa em 256px não colapsa. Kanban não adapta a telas pequenas.

**Por que agora:** Com as funcionalidades core implementadas (Fase 1) e confiabilidade garantida (Fase 2), o polimento é o que diferencia um "sistema funcional" de um "produto profissional". Clientes julgam a qualidade pela UI. O time interno julga pela velocidade de navegação.

---

## 2. Goals & Success Metrics

| Goal | Metric | Target |
|------|--------|--------|
| **Dashboard avg completion fix** | Avg completion mostra valor real no StatsCards | 100% |
| **Search por título** | Busca por "title ou clientName" funciona no backend | 100% |
| **Filtro de status** | Usuário consegue filtrar por All/Active/Completed/Archived | 100% |
| **Card number display** | Card number (#1, #2, etc.) visível no kanban e detail panel | 100% |
| **Board description display** | Descrição visível no board header ou card do dashboard | 100% |
| **Notification links** | Clique em notificação navega para board/card relacionado | 100% |
| **Error handling** | Todos os erros de API mostram mensagem contextual (não genérica) | 100% |
| **Profile update** | Usuário pode editar displayName, avatar, password | 100% |
| **Template categories** | CRUD de categorias visível no frontend | 100% |
| **Dark/Light theme** | Toggle de tema funcional em toda a aplicação | 100% |
| **Mobile responsive** | Kanban scrolla horizontalmente; sidebar colapsa em mobile | 100% |
| **Copy link feedback** | Toast de confirmação ao copiar public link | 100% |
| **Regenerate token feedback** | UI atualiza com novo token e toast de confirmação | 100% |

**Guardrails (must not regress):**
- Todos os endpoints de API devem continuar respondendo em < 500ms.
- A view pública deve continuar funcionando sem autenticação.
- O sistema deve continuar passando nos testes E2E existentes.
- A cor primária do branding deve continuar aplicada corretamente em todas as páginas.

---

## 3. Users & Use Cases

### Primary: Team Member (Delivery)

> As a team member, I want to quickly find boards by title or client name, filter by status, see accurate dashboard stats, and navigate from notifications so that I can work efficiently without hunting for information.

**Preconditions:** Logged in.

### Secondary: Admin

> As an admin, I want to organize templates by categories, update my profile, and toggle between light/dark themes so that the tool feels polished and professional to both our team and clients.

**Preconditions:** Logged in, admin role.

### Secondary: Client (indirect)

> As a client, I want the public board view to show accurate stats and be accessible on my phone so that I can check progress anywhere.

**Preconditions:** Access via public token on any device.

---

## 4. Scope

### In scope

1. **Dashboard avg completion fix** — Backend deve calcular média de `completionPercentage` por board.
2. **Search por título** — Backend deve suportar OR em `boards.title` e `boards.clientName`.
3. **Filtro de status no frontend** — Tabs All/Active/Completed/Archived no `BoardList`.
4. **Card number display** — Mostrar `#123` no `BoardCardItem` e no `CardDetailPanel`.
5. **Board description display** — Mostrar descrição truncada no `BoardCard` e no header do board.
6. **Template card description** — Campo de descrição no editor de templates.
7. **Notification links** — `boardId`/`cardId` em notificações devem permitir navegação.
8. **Public board stats** — Usar `board.stats` do backend se disponível.
9. **Copy link feedback** — Toast ao copiar public link.
10. **Regenerate token feedback** — Invalidar board query e mostrar toast após regenerate.
11. **Error handling padronizado** — Interceptor global com mapeamento de status → mensagem/ação.
12. **Profile update** — Página/modal para usuário editar próprio perfil.
13. **Template categories** — CRUD de categorias + filtro por categoria na lista de templates.
14. **Dark/Light theme** — Usar `next-themes` com toggle e CSS variables.
15. **Mobile responsive** — Sidebar colapsável, kanban scroll horizontal, drawer para detail em mobile.

### Out of scope / later

| What | Why | Tracked in |
|------|-----|------------|
| Drag-and-drop de cards em touch devices | Comportamento complexo, não bloqueante para mobile. Gestos touch são tricky. | V2 |
| Offline support / PWA | Fora do escopo do MVP. | V2 |
| Card checklists / subtasks | Feature nova, não polish. | V2 |
| Time tracking em cards | Feature nova, não polish. | V2 |
| Gantt/calendar views | Fora do escopo V1 por design. | V2 |
| Export boards | Feature nova. | V2 |
| Batch operations (multi-select cards) | Feature nova. | V2 |

### Design for future (build with awareness)

- **Error handling:** O interceptor global de erros deve ser extensível para adicionar novos status codes sem modificar múltiplos files.
- **Theme:** O `next-themes` com `class` strategy permite CSS variables que funcionam tanto com Tailwind quanto com custom CSS. O sistema não deve hardcodar cores — usar CSS variables do Tailwind.
- **Mobile:** O layout mobile deve usar CSS Grid/Flexbox responsivo. O kanban horizontal scroll já é padrão Trello/Jira. Não usar breakpoints quebrados.

---

## 5. Functional Requirements

---

### FR-1: Dashboard Avg Completion Fix

O backend deve calcular corretamente a média de `completionPercentage` entre todos os boards ativos.

**Acceptance criteria:**

```gherkin
Given boards com completion percentages: Board A 50%, Board B 100%, Board C 0%
When o endpoint /dashboard/stats é chamado
Then avgCompletionPercentage retorna 50

Given não há nenhum board ativo
When o endpoint é chamado
Then avgCompletionPercentage retorna 0

Given o StatsCards no frontend renderiza
When avgCompletionPercentage = 50
Then o card "Avg Completion" mostra "50%"
```

**Files:**
- `apps/api/src/modules/dashboard/dashboard.service.ts` — Modify `getOverview()` to calculate avg completion
- `apps/web/src/components/boards/stats-cards.tsx` — Already expects `avgCompletionPercentage`; no change needed

---

### FR-2: Search por Título

O backend de busca de boards deve procurar tanto em `title` quanto em `clientName`.

**Acceptance criteria:**

```gherkin
Given um board com title="Acme Onboarding" e clientName="Acme Corp"
When o usuário busca por "Acme" no campo de search
Then o board aparece no resultado (match em title)

When o usuário busca por "Corp"
Then o board aparece no resultado (match em clientName)

When o usuário busca por "não-existe"
Then nenhum board aparece
```

**Files:**
- `apps/api/src/modules/boards/boards.service.ts` — Modify `findAll` to use `OR(ilike(title, ...), ilike(clientName, ...))`

---

### FR-3: Filtro de Status no Frontend

Adicionar tabs de filtro no `BoardList` para alternar entre All / Active / Completed / Archived.

**Acceptance criteria:**

```gherkin
Given 4 boards: 2 active, 1 completed, 1 archived
When o usuário abre o dashboard
Then a tab "All" é selecionada por padrão e todos 4 boards aparecem

When o usuário clica "Active"
Then apenas os 2 boards ativos aparecem

When o usuário clica "Completed"
Then apenas o board completed aparece

When o usuário clica "Archived"
Then apenas o board archived aparece

When o usuário busca por "Acme" com filtro "Active"
Then aparecem apenas boards ativos que contêm "Acme" em title ou clientName
```

**Files:**
- `apps/web/src/components/boards/board-list.tsx` — Add tab navigation and status filter
- `apps/web/src/components/boards/board-filter-tabs.tsx` | New | Tab component for status filtering
- `apps/api/src/modules/boards/boards.controller.ts` — Already supports `status` query param

---

### FR-4: Card Number Display

Mostrar o número sequencial do card (`#1`, `#2`, etc.) no kanban card e no detail panel.

**Acceptance criteria:**

```gherkin
Given um board com cards de número 1, 2, 3
When o board é visualizado no kanban
Then cada card mostra "#1", "#2", "#3" antes do título

Given o card #2 é aberto no detail panel
Then o header do panel mostra "#2 - Título do Card"
```

**Files:**
- `apps/web/src/components/board/board-card-item.tsx` — Show `#{card.cardNumber}` before title
- `apps/web/src/components/board/card-detail-panel.tsx` — Show `#{card.cardNumber}` in SheetTitle

---

### FR-5: Board Description Display

Mostrar a descrição do board no card do dashboard e no header do board.

**Acceptance criteria:**

```gherkin
Given um board com description="Primeiro projeto do Q3"
When o board aparece no dashboard
Then o card do board mostra a descrição truncada (1 linha, ellipsis)

Given o board detail é aberto
Then o header mostra a descrição abaixo do título (2 linhas máx)
```

**Files:**
- `apps/web/src/components/boards/board-card.tsx` — Add description line with truncation
- `apps/web/src/app/(dashboard)/boards/[id]/page.tsx` — Show description below title in header

---

### FR-6: Template Card Description

Adicionar campo de descrição para cards no editor de templates.

**Acceptance criteria:**

```gherkin
Given o admin abre o template editor
When adiciona um card a uma lista
Then há um campo "Description" (textarea) abaixo do título do card

Given o admin salva o template com cards com descrição
When aplica o template
Then os cards criados no board recebem a descrição dos template cards
```

**Files:**
- `apps/web/src/components/template/template-editor.tsx` — Add description textarea per card
- `apps/web/src/components/template/kanban-preview.tsx` — Optionally show description in preview

---

### FR-7: Notification Links

Cada notificação deve ser clicável e redirecionar para o board/card relacionado.

**Acceptance criteria:**

```gherkin
Given uma notificação "Card 'Setup' assigned to you" com boardId e cardId
When o usuário clica na notificação no popover
Then ele é redirecionado para /boards/{boardId}
  E opcionalmente o card detail panel abre automaticamente

Given uma notificação "Board 'Acme' completed" com apenas boardId
When o usuário clica
Then ele é redirecionado para /boards/{boardId}
```

**Files:**
- `apps/web/src/components/layout/notification-bell.tsx` — Wrap notification items in Link
- `apps/web/src/app/(dashboard)/boards/[id]/page.tsx` — Accept optional `?cardId=` query param to auto-open panel

---

### FR-8: Public Board Stats

A public view deve usar `board.stats` se disponível no backend, em vez de recalcular no frontend.

**Acceptance criteria:**

```gherkin
Given o endpoint /boards/public/{token} retorna board com stats property
When a public view é carregada
Then o progress bar usa board.stats.completionPercentage
  E não há cálculo manual no frontend

Given stats não está presente (compatibilidade)
When a public view carrega
Then fallback para cálculo manual (comportamento atual)
```

**Files:**
- `apps/api/src/modules/boards/boards.controller.ts` — Ensure public endpoint includes stats
- `apps/web/src/app/b/[token]/page.tsx` — Use board.stats if available

---

### FR-9: Copy Link / Regenerate Token Feedback

Mostrar toast de confirmação ao copiar public link e ao regenerar token.

**Acceptance criteria:**

```gherkin
Given o board detail é aberto
When o member clica "Copy Public Link"
Then aparece toast "Link copied to clipboard!"
  E o link está no clipboard

When o member clica "Regenerate public link"
  E o backend retorna novo token
Then aparece toast "Public link regenerated!"
  E o novo link é copiado automaticamente para clipboard
  E o UI do header mostra o novo token
```

**Files:**
- `apps/web/src/app/(dashboard)/boards/[id]/page.tsx` — Add toast.success on copy, invalidate query on regenerate

---

### FR-10: Error Handling Padronizado

Implementar interceptor global para mapear status codes de erro em mensagens e ações contextuais.

**Acceptance criteria:**

```gherkin
Given uma requisição retorna 401 Unauthorized
When o erro é interceptado
Then o usuário é redirecionado para /login
  E uma mensagem "Session expired. Please log in again." é exibida

Given uma requisição retorna 403 Forbidden
When interceptado
Then toast.error("You don't have permission to perform this action.")

Given uma requisição retorna 404 Not Found
When interceptado
Then toast.error("Resource not found.")

Given uma requisição retorna 500 Internal Server Error
When interceptado
Then toast.error("Something went wrong. Please try again.")
  E o erro é logado no console para debugging
```

**Files:**
- `apps/web/src/lib/api-client.ts` — Add error interceptor with status mapping
- `apps/web/src/lib/error-handler.ts` | New | Centralized error handling utility

---

### FR-11: Profile Update

Permitir que o usuário edite displayName, avatar, e password.

**Acceptance criteria:**

```gherkin
Given o usuário está logado
When ele clica no avatar no header > "Profile"
Then uma página/modal de perfil é aberta

Given o usuário altera displayName para "John Updated"
When salva
Then o display name é atualizado no backend
  E o avatar no header reflete o novo nome imediatamente

Given o usuário altera a password
When preenche old password, new password, e confirm
Then a senha é atualizada no backend
  E uma mensagem de sucesso é exibida

Given o usuário tenta alterar a role
Then o campo não aparece (só admin pode mudar roles)
```

**Files:**
- `apps/api/src/modules/users/users.controller.ts` — Add `PATCH /users/me` endpoint
- `apps/api/src/modules/users/users.service.ts` — Add `updateProfile()` and `updatePassword()` methods
- `apps/web/src/app/(dashboard)/profile/page.tsx` | New | Profile settings page
- `apps/web/src/components/layout/header.tsx` — Add "Profile" link in user dropdown
- `apps/web/src/lib/auth.ts` — Update zustand store when profile changes

---

### FR-12: Template Categories

CRUD de categorias de templates no frontend + filtro por categoria na lista.

**Acceptance criteria:**

```gherkin
Given o admin abre /templates
When ele vê um dropdown "Categories"
Then ele pode selecionar uma categoria para filtrar templates

Given o admin clica "Manage Categories"
Then um modal abre para criar/editar/deletar categorias

Given uma categoria "SaaS" é criada
When o admin edita um template
Then ele pode selecionar "SaaS" como categoria do template
```

**Files:**
- `apps/web/src/components/template/category-manager.tsx` | New | Modal for category CRUD
- `apps/web/src/components/template/category-filter.tsx` | New | Dropdown for filtering templates by category
- `apps/web/src/app/(dashboard)/templates/page.tsx` — Integrate category filter
- `apps/web/src/components/template/template-editor.tsx` — Add category dropdown in editor

---

### FR-13: Dark/Light Theme

Implementar toggle de tema usando `next-themes`.

**Acceptance criteria:**

```gherkin
Given o usuário abre qualquer página
When o tema é "light"
Then o background é branco e texto é escuro

When o usuário clica no toggle de tema no header
Then o tema muda para "dark"
  E o background fica escuro
  E o texto fica claro
  E a preferência é persistida em localStorage

Given o usuário recarrega a página
When o tema está salvo como "dark"
Then a página carrega já em dark mode (sem flash)
```

**Files:**
- `apps/web/src/providers/theme-provider.tsx` | New | next-themes provider wrapper
- `apps/web/src/components/layout/header.tsx` — Add theme toggle button (sun/moon icon)
- `apps/web/src/app/layout.tsx` — Wrap app in ThemeProvider with suppressHydrationWarning
- `apps/web/src/app/globals.css` — Ensure CSS variables work with both themes

---

### FR-14: Mobile Responsive

Tornar a aplicação utilizável em tablets e telefones.

**Acceptance criteria:**

```gherkin
Given o usuário abre o dashboard em um tablet (768px)
Then a sidebar é visível mas compacta (icon-only quando possível)
  E o grid de boards mostra 2 colunas

Given o usuário abre em um telefone (< 640px)
Then a sidebar é substituída por um menu hamburger
  E o kanban permite scroll horizontal livremente
  E os cards são touch-friendly (mínimo 44px de área de toque)

Given o usuário abre o card detail em mobile
Then o panel é um bottom sheet (drawer) em vez de sidebar direita
```

**Files:**
- `apps/web/src/components/layout/sidebar.tsx` — Add mobile drawer variant, collapsible state
- `apps/web/src/components/layout/header.tsx` — Add hamburger menu button for mobile
- `apps/web/src/components/board/kanban-board.tsx` — Ensure horizontal scroll with overflow-x-auto
- `apps/web/src/components/board/card-detail-panel.tsx` — Use Sheet (bottom) on mobile, Sheet (right) on desktop
- `apps/web/src/app/(dashboard)/layout.tsx` — Add responsive breakpoints

---

## 6. Non-Functional Requirements

| Category | Requirement |
|----------|-------------|
| **Performance** | Theme toggle deve ser instantâneo (< 16ms) sem recalcular layout |
| **Performance** | Mobile first CSS deve não carregar assets desktop desnecessários |
| **UX** | Card number deve ser legível mas não dominar visual (text-xs, muted color) |
| **UX** | Board description no dashboard deve truncar em 1 linha com ellipsis |
| **UX** | Notifications devem ter hover/click affordance clara |
| **Accessibility** | Todos os botões de ação devem ter `aria-label` |
| **Accessibility** | Tabs de filtro devem usar `role="tablist"` e navegação por teclado |

---

## 7. Risks & Assumptions

### Risks

| Risk | Severity | Likelihood | Mitigation |
|------|----------|------------|------------|
| Dark mode causa flash de conteúdo não-estilizado (FOUC) no SSR | Medium | Medium | Usar `suppressHydrationWarning` e inicializar tema no `html` tag server-side |
| Mobile responsive quebra o drag-and-drop do Pangea DnD | Medium | Medium | DnD continua funcional; apenas adicionar scroll e touch targets maiores |
| Profile update sem validação de senha fraca | Low | Medium | Adicionar validação mínima de senha (8 chars, 1 special) no backend |
| Template categories UI polui a lista se houver muitas categorias | Low | Medium | Limitar a 10 categorias visíveis, scroll para mais |

### Assumptions

- **Tailwind CSS v4 já é utilizado no projeto** e suporta dark mode via `dark:` prefix.
- **`@hello-pangea/dnd` já suporta touch** — não precisamos de biblioteca adicional.
- **O usuário não espera gestos complexos em mobile** — swipe, pinch, etc. são out of scope.
- **A foto de perfil (avatar) é opcional** — fallback para iniciais continua existindo.

---

## 8. Design Decisions

### D1: next-themes vs implementação manual

**Options considered:**
1. **Implementação manual** — Menor bundle, mais controle. Requer lógica de persistência e detecção de preferência do sistema.
2. **next-themes** — Já instalado, resolução completa de edge cases (FOUC, system preference, localStorage, SSR).

**Decision:** Usar `next-themes`.

**Rationale:** Já está no `package.json` como dependência. Resolve todos os edge cases de tema (Flicker, SSR, system preference). API simples: `useTheme() { theme, setTheme }`.

### D2: Sheet vs Modal para card detail em mobile

**Options considered:**
1. **Modal central** — Padrão web, mas ocupa pouco espaço vertical em mobile.
2. **Bottom Sheet** — Usa toda a altura disponível, padrão nativo de apps, melhor para leitura.

**Decision:** Bottom Sheet em mobile, right Sheet em desktop.

**Rationale:** O componente `Sheet` do shadcn/ui já suporta posicionamento dinâmico com `side="bottom"`. A lógica de abertura/fechamento é a mesma.

### D3: Inline editing vs navegação para /profile

**Options considered:**
1. **Modal inline no header** — Rápido, mas limitado em espaço.
2. **Página separada /profile** — Mais espaço, permite seções (Profile, Security, etc.).

**Decision:** Página separada `/profile`.

**Rationale:** O formulário de senha requer campos adicionais (old password, new password, confirm). Uma página permite validação de formulário completa e espaço para mensagens de erro.Contexto futuro: a página pode ter tabs (Profile, Appearance, etc.).

---

## 9. File Breakdown

| File | Change type | FR | Description |
|------|-------------|-----|-------------|
| `apps/api/src/modules/dashboard/dashboard.service.ts` | Modify | FR-1 | Calculate avgCompletionPercentage across all boards |
| `apps/api/src/modules/boards/boards.service.ts` | Modify | FR-2 | Add OR filter for title + clientName in findAll |
| `apps/api/src/modules/users/users.controller.ts` | Modify | FR-11 | Add PATCH /users/me endpoint |
| `apps/api/src/modules/users/users.service.ts` | Modify | FR-11 | Add updateProfile, updatePassword methods |
| `apps/api/src/modules/boards/boards.controller.ts` | Modify | FR-8 | Ensure public endpoint includes stats property |
| `apps/web/src/components/boards/stats-cards.tsx` | Modify | FR-1 | No change needed (already expects correct prop) |
| `apps/web/src/components/boards/board-list.tsx` | Modify | FR-3 | Add tab navigation and status filter |
| `apps/web/src/components/boards/board-filter-tabs.tsx` | New | FR-3 | Tab component for status filtering |
| `apps/web/src/components/boards/board-card.tsx` | Modify | FR-4, FR-5 | Show cardNumber prefix and description line |
| `apps/web/src/components/board/board-card-item.tsx` | Modify | FR-4 | Show cardNumber before title |
| `apps/web/src/components/board/card-detail-panel.tsx` | Modify | FR-4 | Show cardNumber in SheetTitle |
| `apps/web/src/app/(dashboard)/boards/[id]/page.tsx` | Modify | FR-5, FR-9 | Show board description in header; add toast feedback for copy and regenerate |
| `apps/web/src/components/template/template-editor.tsx` | Modify | FR-6 | Add description textarea per template card |
| `apps/web/src/components/layout/notification-bell.tsx` | Modify | FR-7 | Wrap notifications in Link with boardId/cardId |
| `apps/web/src/app/b/[token]/page.tsx` | Modify | FR-8 | Use board.stats.completionPercentage if available |
| `apps/web/src/lib/api-client.ts` | Modify | FR-10 | Add error interceptor with status mapping |
| `apps/web/src/lib/error-handler.ts` | New | FR-10 | Centralized error handling utility |
| `apps/web/src/app/(dashboard)/profile/page.tsx` | New | FR-11 | Profile settings page with displayName, avatar, password |
| `apps/web/src/components/layout/header.tsx` | Modify | FR-11, FR-13, FR-14 | Add profile link, theme toggle, hamburger menu |
| `apps/web/src/components/template/category-manager.tsx` | New | FR-12 | Modal for category CRUD |
| `apps/web/src/components/template/category-filter.tsx` | New | FR-12 | Dropdown for filtering templates by category |
| `apps/web/src/app/(dashboard)/templates/page.tsx` | Modify | FR-12 | Integrate category filter |
| `apps/web/src/components/template/template-editor.tsx` | Modify | FR-12 | Add category dropdown |
| `apps/web/src/providers/theme-provider.tsx` | New | FR-13 | next-themes provider wrapper |
| `apps/web/src/app/layout.tsx` | Modify | FR-13 | Wrap app in ThemeProvider |
| `apps/web/src/app/globals.css` | Modify | FR-13 | Ensure CSS variables for dark/light |
| `apps/web/src/components/layout/sidebar.tsx` | Modify | FR-14 | Add mobile drawer, collapsible state |
| `apps/web/src/components/board/kanban-board.tsx` | Modify | FR-14 | Ensure horizontal scroll with overflow-x-auto |
| `apps/web/src/app/(dashboard)/layout.tsx` | Modify | FR-14 | Add responsive breakpoints |
| `apps/web/src/app/b/[token]/page.tsx` | Modify | FR-14 | Responsive public board view |

---

## 10. Dependencies & Constraints

- **next-themes** (^0.4.x) — Já no package.json do web.
- **lucide-react** — Ícones de sun/moon para toggle.
- **Tailwind CSS v4** — `dark:` prefix para dark mode.
- **shadcn/ui Sheet** — Já usado no CardDetailPanel; reutilizar para mobile bottom sheet.

---

## 11. Rollout Plan

1. **Phase 3a: Data & Backend Fixes** — Dashboard avg completion, search por título, board stats no public endpoint.
2. **Phase 3b: Dashboard Polishing** — BoardList tabs, card number display, board description display.
3. **Phase 3c: Interaction Polishing** — Notification links, copy link feedback, error handling padronizado.
4. **Phase 3d: Template Categories** — Category CRUD UI, filter na template list.
5. **Phase 3e: Profile Update** — Profile page, header integration, password update.
6. **Phase 3f: Theme** — ThemeProvider setup, toggle button, CSS variable adjustments.
7. **Phase 3g: Mobile** — Sidebar responsive, kanban scroll, mobile card detail (bottom sheet).
8. **Phase 3h: Template Card Description** — Add field in editor.
9. **Phase 3i: Integration & Testing** — Verificar todos os polish em devices reais (browser dev tools mobile).

---

## 12. Open Questions

| # | Question | Owner | Due | Status |
|---|----------|-------|-----|--------|
| Q1 | Devemos mostrar card number como #1 ou formato mais longo (ex: "CARD-1")? | Dev | Phase 3b | Open |
| Q2 | O bottom sheet em mobile deve cobrir 100% da tela ou parcial (80%)? | Dev | Phase 3g | Open |
| Q3 | As cores do tema dark devem ser derivadas automaticamente ou hardcoded? | Dev | Phase 3f | Open |
| Q4 | Template categories devem ter cor/ícone além de nome? | Dev | Phase 3d | Open |

---

## 13. Related

| Issue / PRD | Relationship |
|-------|-------------|
| PRD-001-onboarding-tracker.md | **Depends-on / extends** — Este PRD implementa polish nas funcionalidades do PRD-001 |
| PRD-002-fase1-core-funcional.md | **Depends-on** — Assume que funcionalidades core já existem |
| PRD-003-fase2-experiencia-cliente.md | **Depends-on** — Assume que emails, activity log, soft delete, etc. já existem |
| ADR-0004-template-variable-substitution.md | **Completed** — Variáveis de template já implementadas |

---

## 14. Changelog

| Date | Change | Author |
|------|--------|--------|
| 2026-05-06 | Initial draft | Claude + User |

---

## 15. Verification (Appendix)

1. **Dashboard stats**: Criar 3 boards com completions 0%, 50%, 100%. Verificar que avg completion mostra 50%.
2. **Search**: Buscar por termo que existe apenas em title → board aparece. Buscar por termo que existe apenas em clientName → board aparece.
3. **Status tabs**: Criar boards em cada status. Clicar cada tab e verificar filtragem correta.
4. **Card number**: Card #1 deve mostrar "#1" no kanban e no detail panel.
5. **Board description**: Adicionar descrição longa. Verificar ellipsis no dashboard e quebra de linha no header.
6. **Notification link**: Receber notificação de card assigned. Clicar → navega para board e card detail abre.
7. **Theme**: Toggle 5 vezes entre light e dark. Verificar persistência após refresh.
8. **Mobile**: Abrir em viewport 375px. Verificar sidebar collapse, kanban scroll, card detail como bottom sheet.
9. **Profile**: Alterar display name, recarregar. Verificar header atualizado. Alterar senha e testar login com nova senha.
10. **Categories**: Criar categoria "Enterprise". Mover template para categoria. Filtrar por categoria na lista.
