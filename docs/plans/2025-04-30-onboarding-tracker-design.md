# Onboarding Tracker — Design & Implementation Plan

> **REQUIRED SUB-SKILL:** Use the executing-plans skill to implement this plan task-by-task.

**Goal:** Build a client-facing onboarding progress tracker (kanban-style) where internal teams manage onboarding boards and clients follow progress via shareable links.

**Architecture:** Monorepo (Turborepo + pnpm) with NestJS modular backend (REST API + Drizzle ORM) and Next.js frontend. Shared types package. Single-org SaaS. No real-time (refresh-based). Client access via public link without login.

**Tech Stack:** Next.js 15 (stable), NestJS 11 (stable), PostgreSQL 17 (stable), Drizzle ORM, Tailwind CSS 4, Zod, React Email, Resend (or SMTP), JSON Web Tokens, S3-compatible storage (or local), Turborepo, pnpm

---

## Table of Contents

1. [Product Summary](#1-product-summary)
2. [Architecture Overview](#2-architecture-overview)
3. [Data Model](#3-data-model)
4. [API Design](#4-api-design)
5. [Screens & UX](#5-screens--ux)
6. [Feature Specifications](#6-feature-specifications)
7. [Implementation Tasks](#7-implementation-tasks)

---

## 1. Product Summary

### What We're Building

A Trello-like kanban board system specifically designed for **client onboarding progression tracking**. Internal teams (admin + delivery) create and manage onboarding boards, while clients access a read-only view via a unique public URL — no login required.

### Key Decisions (from brainstorming)

| Aspect | Decision |
|---|---|
| Client interaction | Read-only — views progress only |
| Board management | Admin creates templates, delivery team executes |
| Client access | Unique public URL, no login |
| Board flexibility | Templates as starting point, fully editable after |
| Card data | Title, description, status, dates, assignee, due date, attachments, internal + client-visible comments |
| Views | Kanban only |
| Internal dashboard | All boards list + metrics (clients per phase, completion rate) |
| Templates | With variables (`{{client_name}}`) + categories by service type |
| Notifications | In-app for team, email for client milestones, webhooks |
| Branding | Logo + primary color on client view |
| Real-time | No — refresh-based |
| Tenancy | Single-org SaaS |
| Auth (internal) | Email/password + JWT |
| ORM | Drizzle |
| Stack | Next.js 15 + NestJS 11 + PostgreSQL 17 |

---

## 2. Architecture Overview

### 2.1 Repository Structure

```
onboarding-tracker/
├── apps/
│   ├── api/                    # NestJS backend
│   │   ├── src/
│   │   │   ├── main.ts
│   │   │   ├── app.module.ts
│   │   │   ├── modules/
│   │   │   │   ├── auth/
│   │   │   │   │   ├── auth.module.ts
│   │   │   │   │   ├── auth.controller.ts
│   │   │   │   │   ├── auth.service.ts
│   │   │   │   │   ├── guards/
│   │   │   │   │   │   ├── jwt-auth.guard.ts
│   │   │   │   │   │   └── public-board.guard.ts
│   │   │   │   │   └── strategies/
│   │   │   │   │       └── jwt.strategy.ts
│   │   │   │   ├── users/
│   │   │   │   │   ├── users.module.ts
│   │   │   │   │   ├── users.controller.ts
│   │   │   │   │   └── users.service.ts
│   │   │   │   ├── boards/
│   │   │   │   │   ├── boards.module.ts
│   │   │   │   │   ├── boards.controller.ts
│   │   │   │   │   ├── boards.service.ts
│   │   │   │   │   └── dto/
│   │   │   │   ├── lists/
│   │   │   │   │   ├── lists.module.ts
│   │   │   │   │   ├── lists.controller.ts
│   │   │   │   │   └── lists.service.ts
│   │   │   │   ├── cards/
│   │   │   │   │   ├── cards.module.ts
│   │   │   │   │   ├── cards.controller.ts
│   │   │   │   │   ├── cards.service.ts
│   │   │   │   │   └── dto/
│   │   │   │   ├── comments/
│   │   │   │   │   ├── comments.module.ts
│   │   │   │   │   ├── comments.controller.ts
│   │   │   │   │   └── comments.service.ts
│   │   │   │   ├── attachments/
│   │   │   │   │   ├── attachments.module.ts
│   │   │   │   │   ├── attachments.controller.ts
│   │   │   │   │   └── attachments.service.ts
│   │   │   │   ├── templates/
│   │   │   │   │   ├── templates.module.ts
│   │   │   │   │   ├── templates.controller.ts
│   │   │   │   │   ├── templates.service.ts
│   │   │   │   │   └── variable-resolver.ts
│   │   │   │   ├── notifications/
│   │   │   │   │   ├── notifications.module.ts
│   │   │   │   │   ├── notifications.controller.ts
│   │   │   │   │   ├── notifications.service.ts
│   │   │   │   │   ├── email.sender.ts
│   │   │   │   │   └── webhook.sender.ts
│   │   │   │   ├── dashboard/
│   │   │   │   │   ├── dashboard.module.ts
│   │   │   │   │   ├── dashboard.controller.ts
│   │   │   │   │   └── dashboard.service.ts
│   │   │   │   └── settings/
│   │   │   │       ├── settings.module.ts
│   │   │   │       ├── settings.controller.ts
│   │   │   │       └── settings.service.ts
│   │   │   ├── database/
│   │   │   │   ├── drizzle.config.ts
│   │   │   │   ├── connection.ts
│   │   │   │   └── schema/
│   │   │   │       ├── index.ts
│   │   │   │       ├── users.ts
│   │   │   │       ├── boards.ts
│   │   │   │       ├── lists.ts
│   │   │   │       ├── cards.ts
│   │   │   │       ├── card-comments.ts
│   │   │   │       ├── card-attachments.ts
│   │   │   │       ├── card-assignees.ts
│   │   │   │       ├── card-labels.ts
│   │   │   │       ├── labels.ts
│   │   │   │       ├── templates.ts
│   │   │   │       ├── template-categories.ts
│   │   │   │       ├── notifications.ts
│   │   │   │       ├── webhooks.ts
│   │   │   │       └── settings.ts
│   │   │   └── common/
│   │   │       ├── filters/
│   │   │       ├── interceptors/
│   │   │       └── decorators/
│   │   ├── test/
│   │   │   ├── app.e2e-spec.ts
│   │   │   └── modules/
│   │   ├── drizzle.config.ts
│   │   ├── nest-cli.json
│   │   ├── tsconfig.json
│   │   └── package.json
│   └── web/                     # Next.js frontend
│       ├── src/
│       │   ├── app/
│       │   │   ├── layout.tsx
│       │   │   ├── page.tsx               # Redirect to /boards
│       │   │   ├── (auth)/
│       │   │   │   ├── login/
│       │   │   │   │   └── page.tsx
│       │   │   │   └── layout.tsx
│       │   │   ├── (dashboard)/
│       │   │   │   ├── layout.tsx          # Sidebar + header
│       │   │   │   ├── boards/
│       │   │   │   │   └── page.tsx        # Board list + metrics
│       │   │   │   ├── boards/[id]/
│       │   │   │   │   └── page.tsx        # Board detail (kanban)
│       │   │   │   ├── templates/
│       │   │   │   │   └── page.tsx        # Template management
│       │   │   │   ├── members/
│       │   │   │   │   └── page.tsx        # Team member management
│       │   │   │   ├── settings/
│       │   │   │   │   └── page.tsx         # Branding, webhooks, notifications
│       │   │   │   └── notifications/
│       │   │   │       └── page.tsx
│       │   │   └── b/
│       │   │       └── [token]/
│       │   │           └── page.tsx        # Public board view (client)
│       │   ├── components/
│       │   │   ├── ui/                     # Shadcn/ui primitives
│       │   │   ├── board/
│       │   │   ├── card/
│       │   │   ├── template/
│       │   │   └── dashboard/
│       │   ├── lib/
│       │   │   ├── api-client.ts           # Fetch wrapper for NestJS API
│       │   │   ├── auth.ts
│       │   │   └── utils.ts
│       │   ├── hooks/
│       │   ├── types/                     # Re-exports from @onboarding-tracker/shared
│       │   └── styles/
│       ├── next.config.ts
│       ├── tailwind.config.ts
│       ├── tsconfig.json
│       └── package.json
├── packages/
│   └── shared/
│       ├── src/
│       │   ├── types/
│       │   │   ├── board.ts
│       │   │   ├── card.ts
│       │   │   ├── template.ts
│       │   │   ├── user.ts
│       │   │   ├── notification.ts
│       │   │   └── index.ts
│       │   ├── schemas/                   # Zod validation schemas
│       │   │   ├── board.ts
│       │   │   ├── card.ts
│       │   │   ├── template.ts
│       │   │   └── index.ts
│       │   ├── constants/
│       │   │   └── index.ts
│       │   └── index.ts
│       ├── tsconfig.json
│       └── package.json
├── tooling/
│   ├── eslint/
│   ├── prettier/
│   ├── tailwind/
│   └── typescript/
├── docker-compose.yml
├── turbo.json
├── pnpm-workspace.yaml
├── package.json
└── .env.example
```

### 2.2 Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                     Next.js Frontend                      │
│  ┌──────────┐  ┌──────────────┐  ┌───────────────────┐  │
│  │ Internal  │  │   Public     │  │  Login/Auth       │  │
│  │ Dashboard │  │   Board View │  │  Pages            │  │
│  │ + Board   │  │  (client)    │  │                   │  │
│  └─────┬─────┘  └──────┬──────┘  └────────┬──────────┘  │
│        │               │                   │              │
│        └───────────────┼───────────────────┘              │
│                        │  REST API calls                   │
└────────────────────────┼─────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│                    NestJS Backend                         │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────────┐    │
│  │ Auth │ │Board │ │Template│ │Notif │ │Dashboard │    │
│  │Module│ │Module│ │ Module │ │Module│ │ Module    │    │
│  └──┬───┘ └──┬───┘ └──┬───┘ └──┬───┘ └────┬─────┘    │
│     └────────┼───────┼────────┼──────────┼────────────┘ │
│              │       │        │          │               │
│              ▼       ▼        ▼          ▼               │
│  ┌────────────────────────────────────────────────────┐  │
│  │              Drizzle ORM (Query Layer)              │  │
│  └───────────────────────┬────────────────────────────┘  │
└──────────────────────────┼──────────────────────────────┘
                           │
                           ▼
                 ┌──────────────────┐
                 │   PostgreSQL 17   │
                 └──────────────────┘
```

### 2.3 Key Architectural Decisions

| Decision | Choice | Rationale |
|---|---|---|
| ORM | Drizzle | Lightweight, SQL-like, typesafe, no heavy abstraction |
| Monorepo tool | Turborepo + pnpm | Fast builds, shared caching, standard in ecosystem |
| UI Components | Shadcn/ui + Tailwind | Copy-paste components, full control, beautiful defaults |
| Auth (internal) | JWT + bcrypt | Simple, stateless, no session management |
| Auth (public) | Signed URL tokens | Cryptographic token in URL, no login needed |
| File storage | S3-compatible (MinIO local) | Portable, works locally and in prod |
| Email | React Email + Resend/SMTP | Beautiful transactional emails, provider-agnostic |
| Validation | Zod (shared schemas) | Same validation on client and server |
| API style | REST | NestJS idiomatic, simpler than tRPC for separate backend |

---

## 3. Data Model

### 3.1 ER Diagram

```
users
  ├── boards (created_by)
  ├── card_assignees (user_id)
  ├── card_comments (author_id)
  ├── notifications (user_id)

template_categories
  └── templates (category_id)
       ├── template_lists (template_id)
       │    └── template_cards (template_list_id)
       └── template_variables (template_id)

boards
  ├── lists (board_id)
  │    └── cards (list_id)
  │         ├── card_comments (card_id)
  │         ├── card_attachments (card_id)
  │         ├── card_assignees (card_id)
  │         └── card_labels (card_id)

labels
  └── card_labels (label_id)

webhooks
notifications
settings (singleton row)
```

### 3.2 Schema Definitions

#### `users`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | uuid | PK, default gen | |
| email | varchar(255) | UNIQUE, NOT NULL | |
| password_hash | varchar(255) | NOT NULL | bcrypt |
| display_name | varchar(255) | NOT NULL | |
| avatar_url | text | nullable | |
| role | varchar(20) | NOT NULL, default 'member' | 'admin' or 'member' |
| created_at | timestamptz | NOT NULL, default now() | |
| updated_at | timestamptz | NOT NULL, default now() | |

#### `boards`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | uuid | PK, default gen | |
| title | varchar(255) | NOT NULL | |
| description | text | nullable | |
| slug | varchar(100) | UNIQUE, NOT NULL | URL-friendly identifier |
| public_token | varchar(64) | UNIQUE, NOT NULL | Signed token for public access |
| client_name | varchar(255) | NOT NULL | Display name of the client |
| client_email | varchar(255) | nullable | For sending milestone emails |
| status | varchar(20) | NOT NULL, default 'active' | 'active', 'completed', 'archived' |
| template_id | uuid | nullable, FK → templates.id | Template applied (nullable if created from scratch) |
| created_by | uuid | NOT NULL, FK → users.id | |
| position | integer | NOT NULL, default 0 | Sort order in dashboard |
| created_at | timestamptz | NOT NULL, default now() | |
| updated_at | timestamptz | NOT NULL, default now() | |

#### `lists`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | uuid | PK, default gen | |
| board_id | uuid | NOT NULL, FK → boards.id, ON DELETE CASCADE | |
| title | varchar(255) | NOT NULL | |
| position | integer | NOT NULL, default 0 | Sort order within board |
| color | varchar(7) | nullable | Hex color, e.g. '#3B82F6' |
| created_at | timestamptz | NOT NULL, default now() | |
| updated_at | timestamptz | NOT NULL, default now() | |

#### `cards`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | uuid | PK, default gen | |
| list_id | uuid | NOT NULL, FK → lists.id, ON DELETE CASCADE | |
| title | text | NOT NULL | |
| description | text | nullable | Markdown supported |
| position | integer | NOT NULL, default 0 | Sort order within list |
| due_date | date | nullable | |
| completed_at | timestamptz | nullable | Set when card moved to "done" list |
| created_at | timestamptz | NOT NULL, default now() | |
| updated_at | timestamptz | NOT NULL, default now() | |

#### `card_comments`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | uuid | PK, default gen | |
| card_id | uuid | NOT NULL, FK → cards.id, ON DELETE CASCADE | |
| author_id | uuid | NOT NULL, FK → users.id | |
| content | text | NOT NULL | Markdown supported |
| visibility | varchar(10) | NOT NULL, default 'internal' | 'internal' or 'client' |
| created_at | timestamptz | NOT NULL, default now() | |
| updated_at | timestamptz | NOT NULL, default now() | |

#### `card_attachments`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | uuid | PK, default gen | |
| card_id | uuid | NOT NULL, FK → cards.id, ON DELETE CASCADE | |
| file_name | varchar(255) | NOT NULL | Original filename |
| file_url | text | NOT NULL | S3/MinIO URL |
| file_size | integer | NOT NULL | Bytes |
| mime_type | varchar(100) | NOT NULL | |
| uploaded_by | uuid | NOT NULL, FK → users.id | |
| visibility | varchar(10) | NOT NULL, default 'client' | 'internal' or 'client' |
| created_at | timestamptz | NOT NULL, default now() | |

#### `card_assignees`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| card_id | uuid | NOT NULL, FK → cards.id, ON DELETE CASCADE | |
| user_id | uuid | NOT NULL, FK → users.id | |
| assigned_at | timestamptz | NOT NULL, default now() | |
| PK | (card_id, user_id) | Composite primary key | |

#### `labels`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | uuid | PK, default gen | |
| board_id | uuid | NOT NULL, FK → boards.id, ON DELETE CASCADE | |
| name | varchar(50) | NOT NULL | |
| color | varchar(7) | NOT NULL | Hex color |
| created_at | timestamptz | NOT NULL, default now() | |

#### `card_labels`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| card_id | uuid | NOT NULL, FK → cards.id, ON DELETE CASCADE | |
| label_id | uuid | NOT NULL, FK → labels.id, ON DELETE CASCADE | |
| PK | (card_id, label_id) | Composite primary key | |

#### `template_categories`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | uuid | PK, default gen | |
| name | varchar(255) | NOT NULL | e.g. "SaaS Onboarding", "Consulting" |
| description | text | nullable | |
| position | integer | NOT NULL, default 0 | |
| created_at | timestamptz | NOT NULL, default now() | |

#### `templates`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | uuid | PK, default gen | |
| category_id | uuid | nullable, FK → template_categories.id | |
| name | varchar(255) | NOT NULL | |
| description | text | nullable | |
| is_default | boolean | NOT NULL, default false | Pre-installed template |
| created_by | uuid | NOT NULL, FK → users.id | |
| created_at | timestamplatez | NOT NULL, default now() | |
| updated_at | timestamptz | NOT NULL, default now() | |

#### `template_variables`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | uuid | PK, default gen | |
| template_id | uuid | NOT NULL, FK → templates.id, ON DELETE CASCADE | |
| key | varchar(100) | NOT NULL | e.g. "client_name", "start_date" |
| display_name | varchar(255) | NOT NULL | Human-readable label |
| default_value | text | nullable | Fallback if not provided |
| is_required | boolean | NOT NULL, default true | |
| UQ | (template_id, key) | | |

#### `template_lists`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | uuid | PK, default gen | |
| template_id | uuid | NOT NULL, FK → templates.id, ON DELETE CASCADE | |
| title | varchar(255) | NOT NULL | Template variable substitution supported |
| position | integer | NOT NULL, default 0 | |
| color | varchar(7) | nullable | |

#### `template_cards`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | uuid | PK, default gen | |
| template_list_id | uuid | NOT NULL, FK → template_lists.id, ON DELETE CASCADE | |
| title | text | NOT NULL | Template variable substitution supported |
| description | text | nullable | Template variable substitution supported |
| position | integer | NOT NULL, default 0 | |
| due_date_offset_days | integer | nullable | Days from board creation to set due date |

#### `webhooks`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | uuid | PK, default gen | |
| url | text | NOT NULL | Target URL |
| secret | varchar(255) | NOT NULL | For HMAC signature |
| events | text[] | NOT NULL | e.g. ['board.completed', 'card.completed'] |
| is_active | boolean | NOT NULL, default true | |
| created_by | uuid | NOT NULL, FK → users.id | |
| created_at | timestamptz | NOT NULL, default now() | |

#### `notifications`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | uuid | PK, default gen | |
| user_id | uuid | NOT NULL, FK → users.id | |
| type | varchar(50) | NOT NULL | e.g. 'card.due_soon', 'card.overdue' |
| title | varchar(255) | NOT NULL | |
| message | text | nullable | |
| board_id | uuid | nullable, FK → boards.id | Related board |
| card_id | uuid | nullable, FK → cards.id | Related card |
| is_read | boolean | NOT NULL, default false | |
| created_at | timestamptz | NOT NULL, default now() | |

#### `settings` (singleton)

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | integer | PK, default 1 | Always 1 — single row |
| company_name | varchar(255) | NOT NULL | Displayed on client view |
| logo_url | text | nullable | Company logo |
| primary_color | varchar(7) | NOT NULL, default '#3B82F6' | Brand color on client view |
| email_from | varchar(255) | nullable | Sender email for notifications |
| created_at | timestamptz | NOT NULL, default now() | |
| updated_at | timestamptz | NOT NULL, default now() | |

---

## 4. API Design

### 4.1 Authentication

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/auth/login` | Public | Email + password → JWT |
| POST | `/auth/register` | Admin only | Create new internal user |
| GET | `/auth/me` | JWT | Get current user profile |
| PATCH | `/auth/me` | JWT | Update own profile |
| PATCH | `/auth/me/password` | JWT | Change own password |

### 4.2 Boards

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/boards` | JWT | List all boards (with filters: status, search) |
| POST | `/boards` | JWT | Create board from scratch |
| POST | `/boards/from-template/:templateId` | JWT | Create board from template (with variables) |
| GET | `/boards/:id` | JWT | Get board detail (with lists + cards) |
| PATCH | `/boards/:id` | JWT | Update board title, description, client info |
| DELETE | `/boards/:id` | JWT (admin) | Archive/delete board |
| PATCH | `/boards/:id/status` | JWT | Change board status (active/completed/archived) |
| GET | `/boards/public/:token` | Public token | Client read-only view |
| GET | `/boards/:id/stats` | JWT | Board completion stats |

### 4.3 Lists

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/boards/:boardId/lists` | JWT | Create list |
| PATCH | `/lists/:id` | JWT | Update list title, color, position |
| DELETE | `/lists/:id` | JWT | Delete list (and all cards) |
| PATCH | `/boards/:boardId/lists/reorder` | JWT | Reorder lists |

### 4.4 Cards

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/lists/:listId/cards` | JWT | Create card |
| GET | `/cards/:id` | JWT | Get card detail (with comments, attachments, assignees) |
| PATCH | `/cards/:id` | JWT | Update card |
| DELETE | `/cards/:id` | JWT | Delete card |
| PATCH | `/cards/:id/move` | JWT | Move card to different list/position |
| PATCH | `/boards/:boardId/cards/reorder` | JWT | Reorder cards in bulk |

### 4.5 Card Sub-resources

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/cards/:cardId/comments` | JWT | Add comment (specify visibility) |
| PATCH | `/comments/:id` | JWT | Edit own comment |
| DELETE | `/comments/:id` | JWT | Delete own comment (or admin) |
| POST | `/cards/:cardId/attachments` | JWT | Upload attachment |
| DELETE | `/attachments/:id` | JWT | Delete attachment |
| POST | `/cards/:cardId/assignees/:userId` | JWT | Assign user to card |
| DELETE | `/cards/:cardId/assignees/:userId` | JWT | Unassign user |
| POST | `/cards/:cardId/labels/:labelId` | JWT | Add label to card |
| DELETE | `/cards/:cardId/labels/:labelId` | JWT | Remove label |

### 4.6 Labels

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/boards/:boardId/labels` | JWT | List board labels |
| POST | `/boards/:boardId/labels` | JWT | Create label |
| PATCH | `/labels/:id` | JWT | Update label |
| DELETE | `/labels/:id` | JWT | Delete label |

### 4.7 Templates

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/templates` | JWT | List all templates (with category filter) |
| GET | `/templates/:id` | JWT | Get template detail (with lists, cards, variables) |
| POST | `/templates` | JWT (admin) | Create template |
| PATCH | `/templates/:id` | JWT (admin) | Update template |
| DELETE | `/templates/:id` | JWT (admin) | Delete template |
| POST | `/templates/:id/duplicate` | JWT (admin) | Duplicate template |

### 4.8 Template Categories

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/template-categories` | JWT | List categories |
| POST | `/template-categories` | JWT (admin) | Create category |
| PATCH | `/template-categories/:id` | JWT (admin) | Update category |
| DELETE | `/template-categories/:id` | JWT (admin) | Delete category |

### 4.9 Dashboard & Metrics

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/dashboard/stats` | JWT | Overview: total boards, by status, avg completion |
| GET | `/dashboard/recent-activity` | JWT | Recent actions across boards |

### 4.10 Notifications

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/notifications` | JWT | List own notifications (paginated) |
| PATCH | `/notifications/:id/read` | JWT | Mark as read |
| PATCH | `/notifications/read-all` | JWT | Mark all as read |

### 4.11 Webhooks

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/webhooks` | JWT (admin) | List webhooks |
| POST | `/webhooks` | JWT (admin) | Create webhook |
| PATCH | `/webhooks/:id` | JWT (admin) | Update webhook |
| DELETE | `/webhooks/:id` | JWT (admin) | Delete webhook |
| POST | `/webhooks/:id/test` | JWT (admin) | Send test payload |

### 4.12 Settings

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/settings` | JWT | Get settings |
| PATCH | `/settings` | JWT (admin) | Update settings (logo, color, etc.) |
| GET | `/settings/public` | Public | Public branding info (logo + color) |

### 4.13 Webhook Events

| Event | Trigger | Payload |
|---|---|---|
| `board.created` | New board created | board, creator |
| `board.completed` | Board status → completed | board |
| `card.created` | New card created | card, board |
| `card.moved` | Card moved to different list | card, fromList, toList, board |
| `card.completed` | Card moved to "done" list | card, board |
| `card.overdue` | Card past due date (cron) | card, board |

---

## 5. Screens & UX

### 5.1 Screen Map

```
LOGIN FLOW
├── /login                          → Email + password form

INTERNAL DASHBOARD (authenticated)
├── /boards                         → Board list + metrics dashboard
├── /boards/[id]                    → Kanban board view
├── /templates                      → Template list with categories
├── /templates/[id]                 → Template detail/editor
├── /templates/new                  → Create new template
├── /members                        → Team member management
├── /settings                       → Settings (branding, webhooks, notifications)
└── /notifications                  → Notification list

PUBLIC CLIENT VIEW (no auth)
└── /b/[token]                      → Read-only kanban board view
```

### 5.2 Screen Descriptions

#### Login Page (`/login`)
- Centered card with email + password
- Company logo at top (from settings)
- Error messages inline
- Redirect to `/boards` on success

#### Dashboard (`/boards`)
- **Header:** App name, user menu (avatar, name, role), notification bell with badge
- **Stats row:** 4 cards — Total Boards, Active, Completed, Avg Completion %
- **Filters:** Search bar, status filter (All/Active/Completed/Archived)
- **Board grid:** Cards showing board title, client name, status badge, completion % bar, assignee avatars, last updated
- **Action:** "New Board" button → modal (from scratch or from template)
- **Board card click** → navigates to `/boards/[id]`

#### Board Detail (`/boards/[id]`)
- **Header:** Board title (editable inline), client name, status selector, back button
- **Toolbar:** Add list, add card, filter by assignee, search cards
- **Kanban area:** Horizontal scrollable columns (lists)
- **List:** Title (editable), card count, add card button, list menu (edit, delete, color)
- **Card (in list):** Title, labels (colored dots), assignee avatars, due date badge (red if overdue), attachment count, comment count
- **Card click** → opens card detail panel/modal (right sidebar slide-in)

#### Card Detail (modal/sidebar on `/boards/[id]`)
- **Header:** Card title (editable), list name, close button
- **Section: Details** — Assignees (avatar chips, add/remove), Due date (date picker), Labels (add/remove), Description (markdown editor)
- **Section: Attachments** — Upload area + file list, each with visibility toggle (internal/client)
- **Section: Comments** — Tab toggle: All / Internal / Client, comment input with visibility selector, comment list with author, timestamp, edit/delete

#### Public Board View (`/b/[token]`)
- **Header:** Company logo + name (from settings), primary color accent, board title, client name
- **Board info:** Completion %, last updated
- **Kanban area:** Read-only version of the same kanban — cards show title, labels, due date, client-visible comments only
- **Cards are not draggable**, no add/edit controls
- **Comments visible:** Only `visibility = 'client'` comments shown
- **No internal controls:** No sidebar, no admin menu, no settings

#### Templates (`/templates`)
- **Category tabs/pills** at top
- **Template cards** showing name, description, category badge, list count, card count, variable count
- **Actions:** Create new, Duplicate, Edit, Delete (admin only)
- **"Use Template"** button → modal to fill variables → creates new board

#### Template Editor (`/templates/[id]` or `/templates/new`)
- **Header:** Template name (editable), category selector, save/cancel
- **Variables section:** Table with key, display name, default value, required toggle, add/remove
- **Kanban preview:** Same drag-and-drop interface as board, but for template lists + cards
- **Template cards** support `{{variable_key}}` in title and description, shown with highlight
- **Due date offsets:** Card can set "X days from creation" for due dates

#### Members (`/members`)
- **Table:** Avatar, name, email, role (admin/member), actions
- **Invite member** → modal with email + role
- **Admin can:** Change roles, remove members
- **Self-service:** Change own display name, password, avatar

#### Settings (`/settings`)
- **Tabs:** Branding | Webhooks | Notifications
- **Branding tab:** Company name, logo upload, primary color picker, email sender
- **Webhooks tab:** Webhook list, add/edit modal (URL, events multi-select, test button)
- **Notifications tab:** Toggle notification types (due soon, overdue, card assigned, etc.), email template preview

---

## 6. Feature Specifications

### 6.1 Public Board Access

**Mechanism:**
- Each board has a `public_token` — a 32-char cryptographically random string
- URL format: `/b/{public_token}`
- The NestJS `PublicBoardGuard` validates the token by looking up the board
- No authentication required — anyone with the link can view
- The public view is a separate Next.js route that calls `GET /boards/public/:token`
- Public endpoint returns only: lists, cards (with client-visible data), client-visible comments, client-visible attachments, board title, client name

**Security considerations:**
- Token is long enough (32 chars) to prevent brute force
- Admin can regenerate token (invalidates old link)
- Rate limiting on public endpoint

### 6.2 Template Variable Substitution

**Syntax:** `{{variable_key}}` in template list titles, card titles, and card descriptions

**Flow:**
1. Admin creates template with lists/cards containing `{{client_name}}`, `{{start_date}}`, etc.
2. Admin defines variables in template: key, display name, default, required
3. User clicks "Use Template" → modal shows form with all variables
4. User fills in values (defaults pre-populated)
5. Backend substitutes all `{{key}}` occurrences with provided values
6. New board is created with the resolved content

**Implementation:**
```typescript
// packages/shared/src/utils/template-resolver.ts
export function resolveTemplateVariables(
  text: string,
  variables: Record<string, string>
): string {
  return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return variables[key] ?? match;
  });
}
```

### 6.3 Due Date Offset (Templates)

Template cards can define `due_date_offset_days` — an integer representing days from board creation.

When a board is created from a template:
```
card.due_date = board_created_at + due_date_offset_days
```

This allows templates like "Send welcome email" with offset 0, "Schedule kickoff call" with offset 3, "Deliver first draft" with offset 14, etc.

### 6.4 Card Completion Detection

A board can mark specific lists as "completion lists" (e.g., "Done", "Completed"). When a card is moved to a completion list:
- `card.completed_at` is set to current timestamp
- If board has client email, a client notification email may be sent
- Webhook `card.completed` is triggered
- Board completion stats are recalculated

Board completion % = `cards with completed_at NOT NULL / total cards * 100`

### 6.5 Notifications

**In-app notifications (internal team):**
- Created when: card assigned to user, card due in 3 days, card overdue, mentioned in comment
- Stored in `notifications` table
- Displayed as bell icon with badge count in header
- Click → notification list page

**Email notifications (client):**
- Triggered on milestone events: board created, card completed (if in completion list), board completed
- Uses React Email templates + Resend (or configured SMTP)
- Email contains: company branding, summary text, CTA button linking to public board URL
- Opt-in per board (client_email field)

**Webhook notifications:**
- Async fire-and-forget with retry (3 attempts, exponential backoff)
- Payload includes event type, timestamp, and relevant data
- HMAC signature in `X-Webhook-Signature` header for verification
- Webhook delivery log stored for debugging (optional, future)

### 6.6 Branding

- Settings table (singleton) stores: `company_name`, `logo_url`, `primary_color`, `email_from`
- Primary color applied as CSS variable on the public board view
- Logo displayed in header of public view and login page
- Next.js reads public settings via `GET /settings/public` (unauthenticated)

### 6.7 Drag and Drop

- Internal board view uses `@hello-pangea/dnd` (maintained fork of react-beautiful-dnd)
- Cards can be dragged within same list (reorder) or across lists (move)
- Lists can be reordered horizontally
- Each drag action calls the corresponding PATCH endpoint
- Public view: no drag-and-drop (read-only)

---

## 7. Implementation Tasks

### Phase 1: Foundation (Tasks 1-4)

---

### Task 1: Monorepo Scaffolding

**TDD scenario:** No TDD for scaffolding — project setup

**Files:**
- Create: `package.json`, `pnpm-workspace.yaml`, `turbo.json`, `.gitignore`, `.env.example`
- Create: `tooling/typescript/base.json`, `tooling/typescript/internal-package.json`
- Create: `tooling/eslint/base.js`, `tooling/prettier/index.js`, `tooling/tailwind/web.ts`

**Step 1: Initialize monorepo root**

```bash
mkdir onboarding-tracker && cd onboarding-tracker
git init
pnpm init
```

**Step 2: Create pnpm workspace config**

```yaml
# pnpm-workspace.yaml
packages:
  - "apps/*"
  - "packages/*"
  - "tooling/*"
```

**Step 3: Create turbo.json**

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
    "db:generate": {
      "cache": false
    },
    "db:migrate": {
      "cache": false
    }
  }
}
```

**Step 4: Create root package.json**

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
    "db:migrate": "turbo db:migrate"
  },
  "devDependencies": {
    "turbo": "^2.5.0",
    "prettier": "^3.5.0"
  },
  "packageManager": "pnpm@10.12.0"
}
```

**Step 5: Create shared tooling packages**

Create `tooling/typescript/package.json` with base TS configs, `tooling/eslint/package.json`, `tooling/prettier/package.json`.

**Step 6: Create .env.example**

```env
# Database
DATABASE_URL=postgres://postgres:postgres@localhost:5432/onboarding_tracker

# JWT
JWT_SECRET=change-me-to-a-long-random-string

# Storage (S3-compatible)
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

  minio:
    image: minio/minio
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

**Step 8: Install dependencies and verify**

```bash
pnpm install
turbo build --dry-run  # Verify turbo picks up workspace
```

**Step 9: Commit**

```bash
git add -A
git commit -m "chore: scaffold monorepo with Turborepo + pnpm"
```

---

### Task 2: Shared Package (Types + Schemas + Utils)

**TDD scenario:** Full TDD cycle — schemas and utils are pure functions, easy to test

**Files:**
- Create: `packages/shared/package.json`, `packages/shared/tsconfig.json`
- Create: `packages/shared/src/index.ts`
- Create: `packages/shared/src/types/board.ts`, `card.ts`, `template.ts`, `user.ts`, `notification.ts`
- Create: `packages/shared/src/schemas/board.ts`, `card.ts`, `template.ts`
- Create: `packages/shared/src/utils/template-resolver.ts`, `slug.ts`
- Create: `packages/shared/src/constants/index.ts`
- Test: `packages/shared/src/utils/template-resolver.test.ts`, `slug.test.ts`

**Step 1: Write failing test for template resolver**

```typescript
// packages/shared/src/utils/template-resolver.test.ts
import { describe, it, expect } from 'vitest';
import { resolveTemplateVariables } from './template-resolver';

describe('resolveTemplateVariables', () => {
  it('replaces single variable', () => {
    expect(resolveTemplateVariables('Welcome {{client_name}}!', { client_name: 'Acme' }))
      .toBe('Welcome Acme!');
  });

  it('replaces multiple variables', () => {
    expect(
      resolveTemplateVariables('{{client_name}} - {{service_type}}', {
        client_name: 'Acme',
        service_type: 'SaaS',
      })
    ).toBe('Acme - SaaS');
  });

  it('leaves unreplaced variables intact when no value provided', () => {
    expect(resolveTemplateVariables('Hello {{unknown}}', {}))
      .toBe('Hello {{unknown}}');
  });

  it('handles empty string', () => {
    expect(resolveTemplateVariables('', { client_name: 'Acme' }))
      .toBe('');
  });
});
```

**Step 2: Run test to verify it fails**

```bash
cd packages/shared && pnpm test
```
Expected: FAIL — module not found

**Step 3: Implement template resolver**

```typescript
// packages/shared/src/utils/template-resolver.ts
export function resolveTemplateVariables(
  text: string,
  variables: Record<string, string>
): string {
  return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return variables[key] ?? match;
  });
}
```

**Step 4: Run test to verify it passes**

```bash
cd packages/shared && pnpm test
```
Expected: PASS

**Step 5: Write failing test for slug generator**

```typescript
// packages/shared/src/utils/slug.test.ts
import { describe, it, expect } from 'vitest';
import { generateSlug } from './slug';

describe('generateSlug', () => {
  it('converts to lowercase and replaces spaces with hyphens', () => {
    expect(generateSlug('My Board Name')).toBe('my-board-name');
  });

  it('removes special characters', () => {
    expect(generateSlug('Board #123! @Test')).toBe('board-123-test');
  });

  it('collapses multiple hyphens', () => {
    expect(generateSlug('A   B')).toBe('a-b');
  });

  it('trims hyphens from ends', () => {
    expect(generateSlug('  hello world  ')).toBe('hello-world');
  });
});
```

**Step 6: Run test to verify it fails**

```bash
cd packages/shared && pnpm test
```

**Step 7: Implement slug generator**

```typescript
// packages/shared/src/utils/slug.ts
export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/--+/g, '-');
}
```

**Step 8: Run tests to verify pass**

```bash
cd packages/shared && pnpm test
```

**Step 9: Create Zod schemas and types**

```typescript
// packages/shared/src/schemas/board.ts
import { z } from 'zod';

export const createBoardSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  clientName: z.string().min(1).max(255),
  clientEmail: z.string().email().optional(),
  templateId: z.uuid().optional(),
  variables: z.record(z.string()).optional(),
});

export const updateBoardSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  clientName: z.string().min(1).max(255).optional(),
  clientEmail: z.string().email().optional().nullable(),
  status: z.enum(['active', 'completed', 'archived']).optional(),
});

export type CreateBoardInput = z.infer<typeof createBoardSchema>;
export type UpdateBoardInput = z.infer<typeof updateBoardSchema>;
```

```typescript
// packages/shared/src/schemas/card.ts
import { z } from 'zod';

export const createCardSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  dueDate: z.string().date().optional().nullable(),
});

export const updateCardSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  dueDate: z.string().date().optional().nullable(),
});

export const moveCardSchema = z.object({
  listId: z.uuid(),
  position: z.number().int().min(0),
});

export const createCommentSchema = z.object({
  content: z.string().min(1),
  visibility: z.enum(['internal', 'client']),
});

export type CreateCardInput = z.infer<typeof createCardSchema>;
export type UpdateCardInput = z.infer<typeof updateCardSchema>;
export type MoveCardInput = z.infer<typeof moveCardSchema>;
export type CreateCommentInput = z.infer<typeof createCommentSchema>;
```

```typescript
// packages/shared/src/schemas/template.ts
import { z } from 'zod';

export const createTemplateSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  categoryId: z.uuid().optional().nullable(),
  variables: z.array(z.object({
    key: z.string().min(1).max(100),
    displayName: z.string().min(1).max(255),
    defaultValue: z.string().optional(),
    isRequired: z.boolean().default(true),
  })).optional(),
});

export const applyTemplateSchema = z.object({
  boardTitle: z.string().min(1).max(255).optional(),
  clientName: z.string().min(1).max(255),
  clientEmail: z.string().email().optional(),
  variables: z.record(z.string()),
});

export type CreateTemplateInput = z.infer<typeof createTemplateSchema>;
export type ApplyTemplateInput = z.infer<typeof applyTemplateSchema>;
```

**Step 10: Create type definitions**

```typescript
// packages/shared/src/types/board.ts
export interface Board {
  id: string;
  title: string;
  description: string | null;
  slug: string;
  publicToken: string;
  clientName: string;
  clientEmail: string | null;
  status: 'active' | 'completed' | 'archived';
  templateId: string | null;
  createdBy: string;
  position: number;
  createdAt: Date;
  updatedAt: Date;
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
  createdAt: Date;
  updatedAt: Date;
}
```

```typescript
// packages/shared/src/types/card.ts
export interface Card {
  id: string;
  listId: string;
  title: string;
  description: string | null;
  position: number;
  dueDate: string | null;
  completedAt: Date | null;
  assignees: CardAssignee[];
  labels: CardLabel[];
  attachments: CardAttachment[];
  commentCount: number;
  clientCommentCount: number;
  createdAt: Date;
  updatedAt: Date;
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
  visibility: 'internal' | 'client';
  uploadedBy: string;
  createdAt: Date;
}

export interface CardComment {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatarUrl: string | null;
  content: string;
  visibility: 'internal' | 'client';
  createdAt: Date;
  updatedAt: Date;
}
```

**Step 11: Wire up exports in index.ts files**

**Step 12: Commit**

```bash
git add -A
git commit -m "feat: add shared package with types, schemas, and utils"
```

---

### Task 3: NestJS Backend Scaffolding + Database Schema

**TDD scenario:** New feature — full TDD for database connection, partial for scaffolding

**Files:**
- Create: `apps/api/package.json`, `apps/api/tsconfig.json`, `apps/api/nest-cli.json`
- Create: `apps/api/src/main.ts`, `apps/api/src/app.module.ts`
- Create: `apps/api/src/database/connection.ts`, `apps/api/src/database/schema/*.ts`
- Create: `apps/api/drizzle.config.ts`
- Create: `apps/api/test/app.e2e-spec.ts`

**Step 1: Create NestJS app package.json**

Install: `@nestjs/core`, `@nestjs/common`, `@nestjs/platform-express`, `drizzle-orm`, `postgres`, `dotenv`, `zod`, `bcrypt`, `jsonwebtoken`, `@nestjs/config`, `@nestjs/jwt`, `uuid`, and dev deps.

**Step 2: Create database connection**

```typescript
// apps/api/src/database/connection.ts
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL!;

const client = postgres(connectionString);
export const db = drizzle(client, { schema });
export type Database = typeof db;
```

**Step 3: Create Drizzle schema files**

```typescript
// apps/api/src/database/schema/users.ts
import { pgTable, uuid, varchar, timestamp, boolean } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  displayName: varchar('display_name', { length: 255 }).notNull(),
  avatarUrl: varchar('avatar_url').$type<string | null>(),
  role: varchar('role', { length: 20 }).notNull().default('member'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
```

(Create all remaining schema files following the data model in Section 3.2 — boards, lists, cards, cardComments, cardAttachments, cardAssignees, labels, cardLabels, templateCategories, templates, templateVariables, templateLists, templateCards, webhooks, notifications, settings)

**Step 4: Create Drizzle config + initial migration**

```typescript
// apps/api/drizzle.config.ts
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/database/schema/index.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

```bash
cd apps/api && pnpm drizzle-kit generate
```

**Step 5: Write health check e2e test**

```typescript
// apps/api/test/app.e2e-spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('App (e2e)', () => {
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

  it('/health (GET) => 200', () => {
    return request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect({ status: 'ok' });
  });
});
```

**Step 6: Run test — will fail (module not built)**

**Step 7: Create minimal AppModule with health endpoint**

```typescript
// apps/api/src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthController } from './health.controller';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true })],
  controllers: [HealthController],
})
export class AppModule {}
```

```typescript
// apps/api/src/health.controller.ts
import { Controller, Get } from '@nestjs/common';

@Controller()
export class HealthController {
  @Get('health')
  health() {
    return { status: 'ok' };
  }
}
```

**Step 8: Create main.ts with proper bootstrap**

```typescript
// apps/api/src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  await app.listen(process.env.API_PORT ?? 3001);
}
bootstrap();
```

**Step 9: Run e2e test — should pass**

**Step 10: Run migration against local database**

```bash
docker compose up -d postgres
cd apps/api && pnpm drizzle-kit migrate
```

**Step 11: Commit**

```bash
git add -A
git commit -m "feat: scaffold NestJS backend with Drizzle schema and health check"
```

---

### Task 4: Next.js Frontend Scaffolding

**TDD scenario:** No TDD for scaffolding

**Files:**
- Create: `apps/web/package.json`, `apps/web/next.config.ts`, `apps/web/tsconfig.json`, `apps/web/tailwind.config.ts`
- Create: `apps/web/src/app/layout.tsx`, `apps/web/src/app/page.tsx`
- Create: `apps/web/src/lib/api-client.ts`, `apps/web/src/lib/utils.ts`
- Create: `apps/web/src/styles/globals.css`

**Step 1: Initialize Next.js app**

```bash
cd apps && npx create-next-app@latest web --typescript --tailwind --eslint --app --src-dir --no-import-alias
```

**Step 2: Install additional dependencies**

```bash
cd apps/web && pnpm add @hello-pangea/dnd lucide-react date-fns zustand @tanstack/react-query
cd apps/web && pnpm add -D @types/node
```

**Step 3: Setup Tailwind + Shadcn/ui**

```bash
cd apps/web && pnpm dlx shadcn@latest init
```
Choose: New York style, Zinc color, CSS variables.

**Step 4: Create API client**

```typescript
// apps/web/src/lib/api-client.ts
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

interface FetchOptions extends RequestInit {
  token?: string;
}

export async function apiClient<T>(
  endpoint: string,
  options: FetchOptions = {}
): Promise<T> {
  const { token, ...fetchOptions } = options;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...((fetchOptions.headers as Record<string, string>) ?? {}),
  };

  const res = await fetch(`${API_URL}${endpoint}`, {
    ...fetchOptions,
    headers,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(error.message ?? 'API Error');
  }

  return res.json() as Promise<T>;
}
```

**Step 5: Create auth store (Zustand + localStorage)**

```typescript
// apps/web/src/lib/auth.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  token: string | null;
  user: { id: string; email: string; displayName: string; role: string } | null;
  setAuth: (token: string, user: AuthState['user']) => void;
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
    { name: 'onboarding-tracker-auth' }
  )
);
```

**Step 6: Create placeholder pages**

- `apps/web/src/app/layout.tsx` — root layout with providers
- `apps/web/src/app/page.tsx` — redirect to `/boards`
- `apps/web/src/app/(auth)/login/page.tsx` — login form placeholder
- `apps/web/src/app/(dashboard)/layout.tsx` — sidebar + header layout

**Step 7: Verify Next.js dev server starts**

```bash
cd apps/web && pnpm dev
```

**Step 8: Commit**

```bash
git add -A
git commit -m "feat: scaffold Next.js frontend with Tailwind, Shadcn, and API client"
```

---

### Phase 2: Auth + Core CRUD (Tasks 5-9)

---

### Task 5: Auth Module (NestJS)

**TDD scenario:** Full TDD cycle

**Files:**
- Create: `apps/api/src/modules/auth/auth.module.ts`, `auth.service.ts`, `auth.controller.ts`
- Create: `apps/api/src/modules/auth/strategies/jwt.strategy.ts`
- Create: `apps/api/src/modules/auth/guards/jwt-auth.guard.ts`
- Create: `apps/api/src/modules/auth/decorators/current-user.decorator.ts`
- Create: `apps/api/src/modules/users/users.module.ts`, `users.service.ts`, `users.controller.ts`
- Test: `apps/api/src/modules/auth/auth.service.spec.ts`

**Step 1: Write failing test for auth service**

```typescript
// apps/api/src/modules/auth/auth.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UnauthorizedException } from '@nestjs/common';

describe('AuthService', () => {
  let service: AuthService;
  let usersService: Partial<UsersService>;
  let jwtService: Partial<JwtService>;

  beforeEach(async () => {
    usersService = {
      findByEmail: jest.fn(),
      create: jest.fn(),
    };
    jwtService = {
      sign: jest.fn().mockReturnValue('test-jwt-token'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: JwtService, useValue: jwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('validateUser', () => {
    it('returns user when credentials are valid', async () => {
      const user = {
        id: '1',
        email: 'test@test.com',
        passwordHash: await bcrypt.hash('password123', 10),
        displayName: 'Test',
        role: 'admin',
      };
      jest.spyOn(usersService, 'findByEmail').mockResolvedValue(user as any);

      const result = await service.validateUser('test@test.com', 'password123');
      expect(result).toBeDefined();
      expect(result.email).toBe('test@test.com');
    });

    it('throws Unauthorized when password is wrong', async () => {
      const user = {
        id: '1',
        email: 'test@test.com',
        passwordHash: await bcrypt.hash('password123', 10),
        displayName: 'Test',
        role: 'admin',
      };
      jest.spyOn(usersService, 'findByEmail').mockResolvedValue(user as any);

      await expect(service.validateUser('test@test.com', 'wrong'))
        .rejects.toThrow(UnauthorizedException);
    });

    it('throws Unauthorized when user not found', async () => {
      jest.spyOn(usersService, 'findByEmail').mockResolvedValue(null);

      await expect(service.validateUser('no@user.com', 'password'))
        .rejects.toThrow(UnauthorizedException);
    });
  });

  describe('login', () => {
    it('returns access token', async () => {
      const user = { id: '1', email: 'test@test.com', role: 'admin' };
      const result = await service.login(user as any);
      expect(result.access_token).toBe('test-jwt-token');
      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: '1',
        email: 'test@test.com',
        role: 'admin',
      });
    });
  });
});
```

**Step 2: Run test to verify it fails**

```bash
cd apps/api && pnpm test auth.service.spec
```

**Step 3: Implement AuthService**

```typescript
// apps/api/src/modules/auth/auth.service.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async validateUser(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const { passwordHash, ...result } = user;
    return result;
  }

  async login(user: { id: string; email: string; role: string }) {
    const payload = { sub: user.id, email: user.email, role: user.role };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }
}
```

**Step 4: Run test to verify it passes**

**Step 5: Implement AuthController, JwtStrategy, Guards, Decorators**

(Create AuthController with POST /auth/login, GET /auth/me; JwtStrategy using passport-jwt; JwtAuthGuard; @CurrentUser() decorator)

**Step 6: Implement UsersService + UsersController**

(Create user CRUD: findByEmail, findById, create, updateProfile, list — with proper role checks)

**Step 7: Wire up AuthModule with JwtModule**

**Step 8: Create seed script for first admin user**

```typescript
// apps/api/src/database/seed.ts
import * as bcrypt from 'bcrypt';
import { db } from './connection';
import { users } from './schema';

async function seed() {
  const passwordHash = await bcrypt.hash('admin123', 10);
  await db.insert(users).values({
    email: 'admin@company.com',
    passwordHash,
    displayName: 'Admin',
    role: 'admin',
  }).onConflictDoNothing();
  console.log('Seed complete');
}

seed();
```

**Step 9: Write e2e test for login flow**

**Step 10: Run all tests**

**Step 11: Commit**

```bash
git add -A
git commit -m "feat: add auth module with JWT, login, and user management"
```

---

### Task 6: Boards Module (NestJS)

**TDD scenario:** Full TDD cycle

**Files:**
- Create: `apps/api/src/modules/boards/boards.module.ts`, `boards.service.ts`, `boards.controller.ts`
- Create: `apps/api/src/modules/boards/dto/` (request/response DTOs using shared schemas)
- Test: `apps/api/src/modules/boards/boards.service.spec.ts`

**Step 1: Write failing test for BoardsService**

Test: create board, get all boards with filters, get board by id with lists+cards, update board, archive board, get public board by token, get board stats.

**Step 2: Run test to verify it fails**

**Step 3: Implement BoardsService**

Key methods:
- `create(data)` — generates slug, generates public_token (crypto.randomUUID), creates board
- `findAll(filters)` — paginated list with status filter and search
- `findOne(id)` — board with lists + cards
- `update(id, data)` — partial update
- `archive(id)` — set status to 'archived'
- `findByPublicToken(token)` — for client view, filters out internal comments/attachments
- `getStats(id)` — completion percentage calculation

**Step 4: Run test to verify it passes**

**Step 5: Implement BoardsController with all endpoints from API design**

- Apply `@UseGuards(JwtAuthGuard)` on internal endpoints
- `GET /boards/public/:token` — no guard (public access)
- Proper DTOs with Zod validation pipes

**Step 6: Write e2e test for board CRUD**

**Step 7: Run all tests**

**Step 8: Commit**

```bash
git add -A
git commit -m "feat: add boards module with CRUD, public access, and stats"
```

---

### Task 7: Lists + Cards Modules (NestJS)

**TDD scenario:** Full TDD cycle

**Files:**
- Create: `apps/api/src/modules/lists/` — module, service, controller
- Create: `apps/api/src/modules/cards/` — module, service, controller
- Test: both service spec files

**Step 1: Write failing test for ListsService**

Test: create list, update list, delete list (cascades cards), reorder lists.

**Step 2: Run test — fails**

**Step 3: Implement ListsService**

**Step 4: Run test — passes**

**Step 5: Write failing test for CardsService**

Test: create card, update card, move card (different list + position), delete card, auto-set completedAt, get card detail with comments/attachments/assignees.

**Step 6: Run test — fails**

**Step 7: Implement CardsService**

Key logic in `moveCard`:
- When card moves to a list whose title contains "done"/"complete"/"concluído" (case-insensitive), set `completedAt = now()`
- When card moves OUT of a completion list, set `completedAt = null`
- Recalculate board stats

**Step 8: Run test — passes**

**Step 9: Implement ListController + CardController**

**Step 10: Write e2e test for list + card flows**

**Step 11: Commit**

```bash
git add -A
git commit -m "feat: add lists and cards modules with move and completion logic"
```

---

### Task 8: Comments + Attachments + Labels (NestJS)

**TDD scenario:** Full TDD cycle

**Files:**
- Create: `apps/api/src/modules/comments/` — module, service, controller
- Create: `apps/api/src/modules/attachments/` — module, service, controller
- Create: `apps/api/src/modules/labels/` — module, service, controller
- Test: service spec files for each

**Step 1: Write failing test for CommentsService**

Test: add comment with visibility, edit comment (only author), delete comment (author or admin), list comments filtered by visibility.

**Step 2-4: Implement and test CommentsService**

**Step 5: Write failing test for AttachmentsService**

Test: upload creates file in S3 + record in DB, set visibility, delete removes both, list filtered by visibility for public.

**Step 6-8: Implement AttachmentsService with S3 integration**

Use `@aws-sdk/client-s3` for file uploads. Create a `StorageService` wrapper that handles putObject/getSignedUrl/deleteObject.

**Step 9: Write failing test for LabelsService**

Test: create label for board, update label, delete label, assign/unassign label to card.

**Step 10-12: Implement and test LabelsService**

**Step 13: Implement Controllers**

**Step 14: Commit**

```bash
git add -A
git commit -m "feat: add comments, attachments, and labels modules"
```

---

### Task 9: Templates Module (NestJS)

**TDD scenario:** Full TDD cycle — core business logic

**Files:**
- Create: `apps/api/src/modules/templates/` — module, service, controller
- Create: `apps/api/src/modules/templates/variable-resolver.ts`
- Create: `apps/api/src/modules/templates/categories/` — sub-module for categories
- Test: `templates.service.spec.ts`

**Step 1: Write failing test for TemplatesService**

Test:
- create template with variables and lists/cards
- get template with all nested data
- apply template → creates board with variable substitution
- variable substitution replaces `{{key}}` in list titles, card titles, card descriptions
- due_date_offset_days calculates dates correctly
- duplicate template
- category CRUD

**Step 2: Run test — fails**

**Step 3: Implement TemplatesService**

Key `applyTemplate` method:
```typescript
async applyTemplate(templateId: string, input: ApplyTemplateInput) {
  const template = await this.findOne(templateId);
  
  // 1. Create board
  const board = await this.boardsService.create({
    title: input.boardTitle ?? resolveTemplateVariables(template.name, input.variables),
    clientName: input.clientName,
    clientEmail: input.clientEmail,
    templateId,
  });

  // 2. Create lists from template, resolving variables
  for (const tplList of template.lists) {
    const list = await this.listsService.create(board.id, {
      title: resolveTemplateVariables(tplList.title, input.variables),
      color: tplList.color,
      position: tplList.position,
    });

    // 3. Create cards from template, resolving variables + setting due dates
    for (const tplCard of tplCard.cards) {
      const dueDate = tplCard.dueDateOffsetDays != null
        ? dayjs(board.createdAt).add(tplCard.dueDateOffsetDays, 'day').format('YYYY-MM-DD')
        : null;

      await this.cardsService.create(list.id, {
        title: resolveTemplateVariables(tplCard.title, input.variables),
        description: tplCard.description ? resolveTemplateVariables(tplCard.description, input.variables) : null,
        dueDate,
      });
    }
  }

  return board;
}
```

**Step 4: Run test — passes**

**Step 5: Implement TemplateCategories sub-module**

**Step 6: Implement TemplateController**

**Step 7: Write e2e test for template → board flow**

**Step 8: Commit**

```bash
git add -A
git commit -m "feat: add templates module with variable substitution and board creation"
```

---

### Phase 3: Notifications, Dashboard, Settings, Webhooks (Tasks 10-13)

---

### Task 10: Notifications Module (NestJS)

**TDD scenario:** Full TDD cycle

**Files:**
- Create: `apps/api/src/modules/notifications/` — module, service, controller, email.sender.ts, webhook.sender.ts
- Create: Email templates in `apps/api/src/modules/notifications/emails/`
- Test: `notifications.service.spec.ts`, `webhook.sender.spec.ts`

**Step 1: Write failing test for NotificationsService**

Test: create in-app notification, list user notifications, mark as read, mark all as read.

**Step 2-4: Implement NotificationsService**

**Step 5: Write failing test for WebhookSender**

Test: sends POST with correct payload, includes HMAC signature, retries on failure (up to 3 times).

**Step 6-8: Implement WebhookSender**

```typescript
// apps/api/src/modules/notifications/webhook.sender.ts
import * as crypto from 'crypto';

export class WebhookSender {
  async send(url: string, secret: string, payload: object) {
    const body = JSON.stringify(payload);
    const signature = crypto
      .createHmac('sha256', secret)
      .update(body)
      .digest('hex');

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': `sha256=${signature}`,
      },
      body,
    });

    if (!response.ok) {
      throw new Error(`Webhook failed: ${response.status}`);
    }
  }

  async sendWithRetry(url: string, secret: string, payload: object, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await this.send(url, secret, payload);
        return;
      } catch (error) {
        if (attempt === maxRetries) throw error;
        await new Promise(r => setTimeout(r, 1000 * 2 ** (attempt - 1))); // exponential backoff
      }
    }
  }
}
```

**Step 9: Create email templates with React Email**

- `board-created.tsx` — sent to client when board created
- `card-completed.tsx` — sent to client when milestone card completed
- `board-completed.tsx` — sent to client when all cards done

**Step 10: Implement EmailSender using nodemailer / Resend SDK**

**Step 11: Wire up event listeners (card moved → check completion → trigger notifications)**

**Step 12: Commit**

```bash
git add -A
git commit -m "feat: add notifications module with in-app, email, and webhook delivery"
```

---

### Task 11: Dashboard Module (NestJS)

**TDD scenario:** Full TDD cycle

**Files:**
- Create: `apps/api/src/modules/dashboard/` — module, service, controller
- Test: `dashboard.service.spec.ts`

**Step 1: Write failing test for DashboardService**

Test: returns total boards, boards by status (active/completed/archived), average completion rate, recent activity.

**Step 2: Run test — fails**

**Step 3: Implement DashboardService**

```typescript
// Key SQL queries
// Total boards by status
db.select({ status: boards.status, count: count() })
  .from(boards)
  .groupBy(boards.status);

// Average completion
// = avg(completed_cards * 100.0 / total_cards) across active boards

// Recent activity
db.select().from(cardComments)
  .orderBy(desc(cardComments.createdAt))
  .limit(20);
```

**Step 4: Run test — passes**

**Step 5: Implement DashboardController**

**Step 6: Commit**

```bash
git add -A
git commit -m "feat: add dashboard module with stats and recent activity"
```

---

### Task 12: Settings Module (NestJS)

**TDD scenario:** Full TDD cycle

**Files:**
- Create: `apps/api/src/modules/settings/` — module, service, controller
- Test: `settings.service.spec.ts`

**Step 1: Write failing test for SettingsService**

Test: get settings (singleton), update settings, get public settings (logo + color only).

**Step 2-4: Implement SettingsService**

Singleton pattern — always id=1. On first GET, create default row if not exists.

**Step 5: Implement SettingsController**

- `GET /settings` — JWT required
- `PATCH /settings` — JWT + admin guard
- `GET /settings/public` — no auth (for client view branding)

**Step 6: Commit**

```bash
git add -A
git commit -m "feat: add settings module with branding configuration"
```

---

### Task 13: Webhooks CRUD Module (NestJS)

**TDD scenario:** Full TDD cycle

**Files:**
- Create: `apps/api/src/modules/webhooks/` — module, service, controller
- Test: `webhooks.service.spec.ts`

**Step 1: Write failing test for WebhooksService**

Test: create webhook, list webhooks, update webhook, toggle active, delete webhook, test webhook (send test payload).

**Step 2-4: Implement WebhooksService**

**Step 5: Implement WebhooksController (admin-only)**

Include `POST /webhooks/:id/test` that sends a test event payload to the configured URL.

**Step 6: Commit**

```bash
git add -A
git commit -m "feat: add webhooks CRUD module with test endpoint"
```

---

### Phase 4: Frontend Implementation (Tasks 14-18)

---

### Task 14: Login + Auth Flow (Frontend)

**TDD scenario:** Component testing with React Testing Library

**Files:**
- Create: `apps/web/src/app/(auth)/login/page.tsx`
- Create: `apps/web/src/components/auth/login-form.tsx`
- Create: `apps/web/src/lib/auth.tsx` (AuthProvider)
- Create: `apps/web/src/middleware.ts` (route protection)
- Test: `apps/web/src/components/auth/login-form.test.tsx`

**Step 1: Write failing test for LoginForm component**

Test: renders email + password inputs, shows error on failed login, calls onSuccess with valid credentials.

**Step 2: Run test — fails**

**Step 3: Implement LoginForm component**

- Shadcn Card with email and password inputs
- Submit calls `POST /auth/login` via apiClient
- On success, stores JWT + user in Zustand auth store
- Redirects to `/boards`

**Step 4: Run test — passes**

**Step 5: Implement Next.js middleware for route protection**

```typescript
// apps/web/src/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('auth-token')?.value;
  const isAuthPage = request.nextUrl.pathname.startsWith('/login');
  const isPublicBoard = request.nextUrl.pathname.startsWith('/b/');

  if (isPublicBoard) return NextResponse.next();

  if (!token && !isAuthPage) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (token && isAuthPage) {
    return NextResponse.redirect(new URL('/boards', request.url));
  }

  return NextResponse.next();
}
```

**Step 6: Implement AuthProvider that syncs Zustand store with cookie**

**Step 7: Commit**

```bash
git add -A
git commit -m "feat: add login page, auth flow, and route protection"
```

---

### Task 15: Dashboard + Board List (Frontend)

**TDD scenario:** Component testing

**Files:**
- Create: `apps/web/src/app/(dashboard)/layout.tsx` (sidebar + header)
- Create: `apps/web/src/app/(dashboard)/boards/page.tsx`
- Create: `apps/web/src/components/dashboard/stats-cards.tsx`
- Create: `apps/web/src/components/dashboard/board-card.tsx`
- Create: `apps/web/src/components/dashboard/create-board-modal.tsx`
- Test: component tests

**Step 1: Build dashboard layout**

- Sidebar: Logo/App name, navigation (Boards, Templates, Members, Settings), user menu at bottom
- Header: Page title, notification bell, user avatar dropdown
- Responsive: sidebar collapses on mobile

**Step 2: Build stats cards row**

- 4 cards: Total Boards, Active, Completed, Avg Completion %
- Fetch from `GET /dashboard/stats`
- Use Shadcn Card with lucide-react icons

**Step 3: Build board list**

- Fetch from `GET /boards`
- Each board card shows: title, client name, status badge, completion bar, assignee avatars, updated date
- Filter bar: search + status dropdown
- Click → `/boards/[id]`

**Step 4: Build "New Board" modal**

- Option: From Scratch or From Template
- If template: shows category tabs + template cards + variable input form
- If scratch: just title + client name

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: add dashboard with stats, board list, and create board modal"
```

---

### Task 16: Kanban Board View (Frontend — Internal)

**TDD scenario:** Component testing

**Files:**
- Create: `apps/web/src/app/(dashboard)/boards/[id]/page.tsx`
- Create: `apps/web/src/components/board/kanban-board.tsx`
- Create: `apps/web/src/components/board/board-list.tsx`
- Create: `apps/web/src/components/board/board-card.tsx`
- Create: `apps/web/src/components/board/card-detail-panel.tsx`
- Create: `apps/web/src/components/board/add-list-form.tsx`
- Create: `apps/web/src/components/board/add-card-form.tsx`
- Test: component tests for kanban interactions

**Step 1: Build KanbanBoard component**

- Horizontal scrollable container
- Renders lists as columns
- Uses `@hello-pangea/dnd` for drag and drop
- `onDragEnd` calls `PATCH /cards/:id/move` or `PATCH /boards/:id/lists/reorder`

**Step 2: Build BoardList component**

- Column header: title (editable inline), card count, color indicator, menu (edit/delete)
- Cards sorted by position
- "Add card" button at bottom (opens inline form)

**Step 3: Build BoardCard component**

- Compact card showing: title, label dots, assignee avatars, due date badge (red if overdue), 📎 icon if attachments, 💬 icon if comments
- Click → opens CardDetailPanel

**Step 4: Build CardDetailPanel (slide-in sidebar)**

- Header: card title (editable), list name badge, close button
- Section: assignees (chip list + add button opens member picker)
- Section: due date (date picker)
- Section: labels (label picker)
- Section: description (markdown editor with preview)
- Section: attachments (upload dropzone + file list with visibility toggle)
- Section: comments (tab: All/Internal/Client, new comment form with visibility selector)

**Step 5: Wire up all API calls**

**Step 6: Commit**

```bash
git add -A
git commit -m "feat: add kanban board view with drag-and-drop and card detail panel"
```

---

### Task 17: Public Board View (Frontend — Client)

**TDD scenario:** Component testing

**Files:**
- Create: `apps/web/src/app/b/[token]/page.tsx`
- Create: `apps/web/src/components/board/public-board-view.tsx`
- Test: component test verifying read-only rendering

**Step 1: Build public board page**

- Fetches from `GET /boards/public/:token`
- Server component that fetches branding from `GET /settings/public`
- Applies primary color as CSS variable
- Displays company logo + name in header
- Renders same KanbanBoard component in read-only mode (no drag, no add buttons)

**Step 2: Make kanban read-only for public view**

- Pass `readOnly` prop to KanbanBoard
- When `readOnly=true`: no drag handlers, no add buttons, no edit affordances
- Show only client-visible comments and attachments

**Step 3: Add completion indicator**

- Board header shows: title, client name, "X% Complete" with progress bar
- Show last updated timestamp

**Step 4: Handle 404/invalid token**

- If token not found, show "Board not found" page
- Clean, branded 404 page

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: add public board view for client access with branding"
```

---

### Task 18: Templates UI + Members + Settings (Frontend)

**TDD scenario:** Component testing

**Files:**
- Create: `apps/web/src/app/(dashboard)/templates/page.tsx`
- Create: `apps/web/src/app/(dashboard)/templates/new/page.tsx`
- Create: `apps/web/src/app/(dashboard)/templates/[id]/page.tsx`
- Create: `apps/web/src/app/(dashboard)/members/page.tsx`
- Create: `apps/web/src/app/(dashboard)/settings/page.tsx`
- Create: `apps/web/src/components/template/` — template card, editor, variable form
- Test: component tests

**Step 1: Build Templates list page**

- Category tabs/pills
- Template cards in grid
- "New Template" button
- "Use Template" opens modal with variable form

**Step 2: Build Template Editor**

- Template name, category selector, description
- Variables table (add/remove rows: key, display name, default, required)
- Same KanbanBoard component for editing template lists + cards
- Template card titles with `{{variable_key}}` highlighted in a different color
- Due date offset field per card (integer input: "days from creation")

**Step 3: Build Members page**

- Table with avatar, name, email, role badge
- Invite member modal (email + role)
- Edit role / remove member (admin only)

**Step 4: Build Settings page**

- Tabs: Branding | Webhooks | Notifications
- Branding: company name input, logo upload, color picker, email sender
- Webhooks: list + add/edit modal (URL, events checkboxes, test button)
- Notifications: toggle switches per notification type

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: add templates editor, members, and settings pages"
```

---

### Phase 5: Polish + Integration (Tasks 19-20)

---

### Task 19: Notification System Integration (Backend → Frontend)

**TDD scenario:** Integration testing

**Files:**
- Modify: `apps/api/src/modules/cards/cards.service.ts` — add event hooks
- Modify: `apps/api/src/modules/boards/boards.service.ts` — add completion detection
- Create: `apps/api/src/modules/notifications/event-bus.ts` — internal event emitter
- Create: `apps/web/src/app/(dashboard)/notifications/page.tsx`
- Create: `apps/web/src/components/layout/notification-bell.tsx`

**Step 1: Create internal event bus**

```typescript
// apps/api/src/modules/notifications/event-bus.ts
import { EventEmitter2 } from 'eventemitter2';

export const eventBus = new EventEmitter2();

// Events:
// 'card.created', 'card.moved', 'card.completed', 'card.overdue'
// 'board.created', 'board.completed'
```

**Step 2: Hook events into CardsService and BoardsService**

- When card is moved to completion list → emit `card.completed`
- When all cards in board are completed → emit `board.completed`
- On `card.completed` → create notification for assignees, send client email if applicable, fire webhooks
- Schedule daily check for overdue cards → emit `card.overdue`

**Step 3: Add overdue card detection (cron job)**

Use `@nestjs/schedule` to run daily check:
```typescript
@Cron('0 9 * * *') // 9 AM daily
async checkOverdueCards() {
  const overdueCards = await db.select().from(cards)
    .where(and(lt(cards.dueDate, new Date()), isNull(cards.completedAt)));
  // Create notifications for each
}
```

**Step 4: Build notification bell + list page on frontend**

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: integrate notification system with event bus, email, and webhooks"
```

---

### Task 20: E2E Flow Testing + Production Prep

**TDD scenario:** E2E testing

**Files:**
- Create: `apps/api/test/e2e/full-flow.e2e-spec.ts`
- Create: `apps/web/.env.production.example`
- Modify: `docker-compose.yml` — add production config

**Step 1: Write full E2E test flow**

```
1. Register admin user
2. Login as admin
3. Create template category
4. Create template with variables + lists + cards
5. Apply template to create board (with variable substitution)
6. Verify board has correct lists, cards, resolved variables, due dates
7. Add comment (internal + client-visible)
8. Move card to "Done" list → verify completed_at set
9. Verify notification created
10. Access public board URL → verify client view shows correct data
11. Verify client can only see 'client' visibility comments/attachments
12. Check dashboard stats reflect the board
13. Trigger webhook test → verify payload received
```

**Step 2: Run E2E test — fix any issues**

**Step 3: Create production Dockerfile for both apps**

```dockerfile
# apps/api/Dockerfile
FROM node:22-alpine AS builder
WORKDIR /app
COPY . .
RUN corepack enable && pnpm install --frozen-lockfile
RUN pnpm --filter api build

FROM node:22-alpine AS runner
WORKDIR /app
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/node_modules ./node_modules
COPY --from=builder /app/apps/api/package.json .
CMD ["node", "dist/main.js"]
```

```dockerfile
# apps/web/Dockerfile
FROM node:22-alpine AS builder
WORKDIR /app
COPY . .
RUN corepack enable && pnpm install --frozen-lockfile
RUN pnpm --filter web build

FROM node:22-alpine AS runner
WORKDIR /app
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./.next/static
COPY --from=builder /app/apps/web/public ./public
CMD ["node", "server.js"]
```

**Step 4: Update docker-compose with production services**

**Step 5: Create CI workflow (GitHub Actions)**

```yaml
name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:17
        env:
          POSTGRES_DB: onboarding_tracker_test
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
        ports: ['5432:5432']
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22 }
      - run: pnpm install --frozen-lockfile
      - run: pnpm test
      - run: pnpm lint
      - run: pnpm build
```

**Step 6: Final commit**

```bash
git add -A
git commit -m "feat: add E2E tests, production Dockerfiles, and CI workflow"
```

---

## Appendix A: Environment Variables Reference

| Variable | Description | Required | Example |
|---|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | Yes | `postgres://postgres:postgres@localhost:5432/onboarding_tracker` |
| `JWT_SECRET` | Secret for JWT signing | Yes | Random 32+ char string |
| `API_PORT` | NestJS server port | No | `3001` (default) |
| `NEXT_PUBLIC_API_URL` | Backend URL for frontend | Yes | `http://localhost:3001` |
| `S3_ENDPOINT` | S3-compatible storage endpoint | Yes | `http://localhost:9000` |
| `S3_ACCESS_KEY_ID` | S3 access key | Yes | `minioadmin` |
| `S3_SECRET_ACCESS_KEY` | S3 secret key | Yes | `minioadmin` |
| `S3_BUCKET` | S3 bucket name | Yes | `onboarding-tracker` |
| `S3_REGION` | S3 region | Yes | `us-east-1` |
| `EMAIL_FROM` | Sender email address | No | `onboarding@company.com` |
| `SMTP_HOST` | SMTP server | No | `smtp.resend.com` |
| `SMTP_PORT` | SMTP port | No | `465` |
| `SMTP_USER` | SMTP username | No | `resend` |
| `SMTP_PASSWORD` | SMTP password/token | No | `re_xxxx` |

## Appendix B: Shadcn/ui Components to Install

```
button, card, input, label, textarea, select, dialog, dropdown-menu,
tabs, badge, avatar, separator, tooltip, toast, command, popover,
calendar, checkbox, switch, table, progress, skeleton, sheet
```

## Appendix C: Drizzle Kit Commands

```bash
# Generate migration from schema changes
pnpm drizzle-kit generate

# Apply migrations
pnpm drizzle-kit migrate

# Open Drizzle Studio (DB browser)
pnpm drizzle-kit studio
```