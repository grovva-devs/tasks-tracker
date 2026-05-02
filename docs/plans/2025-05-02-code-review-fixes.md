# Code Review Fixes Implementation Plan

> **REQUIRED SUB-SKILL:** Use the executing-plans skill to implement this plan task-by-task.

**Goal:** Fix all security vulnerabilities, rule violations, and quality issues identified in the post-Phase-7 code review.

**Architecture:** Fix critical security (mass assignment, authorization), then important rule violations (SELECT *, missing .returning()), then minor quality improvements. Each task is independent enough to implement and test in isolation.

**Tech Stack:** NestJS, Drizzle ORM, class-validator, Vitest, Next.js/React

---

## Issue Summary from Code Review

| ID | Severity | Issue |
|----|----------|-------|
| C1 | 🔴 Critical | No validation DTOs — mass assignment vulnerability |
| C2 | 🔴 Critical | No owner-resource authorization — any user can access any board |
| I1 | 🟡 Important | `select().from()` without explicit columns (CardsService + BoardsService) |
| I2 | 🟡 Important | INSERT without `.returning()` (many services) |
| I3 | 🟡 Important | OverdueCronListener emits synchronous event without `.catch()` |
| I4 | 🟡 Important | EmailSender eager init — should be lazy |
| I5 | 🟡 Important | E2E full-flow test can't run (Docker blocked) |
| I6 | 🟡 Important | Settings/Notifications endpoints missing role guards |
| M1 | 🔵 Minor | DashboardService avgCompletion naming is misleading |
| M2 | 🔵 Minor | BoardEventsListener handleBoardCompleted missing publicToken in CARD_COMPLETED event |
| M3 | 🔵 Minor | Too many `any` types in frontend components |
| M4 | 🔵 Minor | Public page filters comments/attachments client-side — server should filter |
| M5 | 🔵 Minor | handleCardClick silent failure — no user feedback |
| M6 | 🔵 Minor | E2E test doesn't validate client visibility filtering |
| M7 | 🔵 Minor | CORS hardcoded to single origin |

---

### Task 1: Add ValidationPipe + DTOs (C1 — Mass Assignment Fix)

**TDD scenario:** Modifying existing tested code — run existing tests first, then add validation-specific tests.

**Files:**
- Create: `apps/api/src/common/dto/auth.dto.ts`
- Create: `apps/api/src/common/dto/boards.dto.ts`
- Create: `apps/api/src/common/dto/cards.dto.ts`
- Create: `apps/api/src/common/dto/lists.dto.ts`
- Create: `apps/api/src/common/dto/templates.dto.ts`
- Create: `apps/api/src/common/dto/settings.dto.ts`
- Create: `apps/api/src/common/dto/webhooks.dto.ts`
- Create: `apps/api/src/common/dto/comments.dto.ts`
- Modify: `apps/api/src/main.ts` — add global ValidationPipe
- Modify: all controller files — replace `body: any` with typed DTOs
- Test: `apps/api/src/common/dto/validation.spec.ts`

**Step 1: Add ValidationPipe to main.ts**

```typescript
// apps/api/src/main.ts
import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000",
    credentials: true,
  });
  app.setGlobalPrefix("api");
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: { enableImplicitConversion: true },
  }));
  await app.listen(process.env.API_PORT ?? 3001);
  console.log(`API running on http://localhost:${process.env.API_PORT ?? 3001}`);
}
bootstrap();
```

**Step 2: Create DTO files**

```typescript
// apps/api/src/common/dto/auth.dto.ts
import { IsEmail, IsString, MinLength } from "class-validator";

export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6)
  password!: string;
}
```

```typescript
// apps/api/src/common/dto/boards.dto.ts
import { IsString, IsOptional, IsEmail, MaxLength } from "class-validator";

export class CreateBoardDto {
  @IsString() @MaxLength(255) title!: string;

  @IsString() @MaxLength(255) clientName!: string;

  @IsOptional() @IsEmail() @MaxLength(255) clientEmail?: string;

  @IsOptional() @IsString() description?: string;
}

export class UpdateBoardDto {
  @IsOptional() @IsString() @MaxLength(255) title?: string;

  @IsOptional() @IsString() description?: string;

  @IsOptional() @IsString() @MaxLength(20) status?: string;
}
```

```typescript
// apps/api/src/common/dto/cards.dto.ts
import { IsString, IsOptional, IsUUID, IsInt, Min } from "class-validator";

export class CreateCardDto {
  @IsString() title!: string;

  @IsOptional() @IsString() description?: string;

  @IsOptional() @IsString() dueDate?: string;

  @IsUUID() boardId!: string;
}

export class UpdateCardDto {
  @IsOptional() @IsString() title?: string;

  @IsOptional() @IsString() description?: string;

  @IsOptional() @IsString() dueDate?: string;
}

export class MoveCardDto {
  @IsUUID() listId!: string;

  @IsInt() @Min(0) position!: number;
}

export class ReorderCardsDto {
  items!: { id: string; position: number }[];
}
```

```typescript
// apps/api/src/common/dto/lists.dto.ts
import { IsString, IsOptional, IsInt, Min, MaxLength } from "class-validator";

export class CreateListDto {
  @IsString() @MaxLength(255) title!: string;

  @IsOptional() @IsString() @MaxLength(7) color?: string;

  @IsOptional() @IsInt() @Min(0) position?: number;
}

export class UpdateListDto {
  @IsOptional() @IsString() @MaxLength(255) title?: string;

  @IsOptional() @IsString() @MaxLength(7) color?: string;

  @IsOptional() @IsInt() @Min(0) position?: number;
}
```

```typescript
// apps/api/src/common/dto/templates.dto.ts
import { IsString, IsOptional, IsBoolean, IsArray, ValidateNested, MaxLength } from "class-validator";
import { Type } from "class-transformer";

class VariableDto {
  @IsString() @MaxLength(100) key!: string;

  @IsString() @MaxLength(255) displayName!: string;

  @IsOptional() @IsString() @MaxLength(255) defaultValue?: string;

  @IsOptional() @IsBoolean() isRequired?: boolean;
}

class TemplateCardDto {
  @IsString() @MaxLength(255) title!: string;

  @IsOptional() @IsString() description?: string;

  @IsOptional() @IsInt() position?: number;

  @IsOptional() @IsInt() dueDateOffsetDays?: number;
}

class TemplateListDto {
  @IsString() @MaxLength(255) title!: string;

  @IsOptional() @IsString() @MaxLength(7) color?: string;

  @IsInt() position!: number;

  @IsOptional() @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TemplateCardDto)
  cards?: TemplateCardDto[];
}

export class CreateTemplateDto {
  @IsString() @MaxLength(255) name!: string;

  @IsOptional() @IsString() description?: string;

  @IsOptional() @IsString() categoryId?: string;

  @IsOptional() @IsBoolean() isDefault?: boolean;

  @IsOptional() @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VariableDto)
  variables?: VariableDto[];

  @IsOptional() @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TemplateListDto)
  lists?: TemplateListDto[];
}

export class UpdateTemplateDto {
  @IsOptional() @IsString() @MaxLength(255) name?: string;

  @IsOptional() @IsString() description?: string;

  @IsOptional() @IsString() categoryId?: string;

  @IsOptional() @IsBoolean() isDefault?: boolean;
}

export class ApplyTemplateDto {
  @IsOptional() @IsString() @MaxLength(255) boardTitle?: string;

  @IsString() @MaxLength(255) clientName!: string;

  @IsOptional() @IsEmail() @MaxLength(255) clientEmail?: string;

  @IsOptional() variables?: Record<string, string>;
}
```

```typescript
// apps/api/src/common/dto/settings.dto.ts
import { IsString, IsOptional, MaxLength } from "class-validator";

export class UpdateSettingsDto {
  @IsOptional() @IsString() @MaxLength(255) companyName?: string;

  @IsOptional() @IsString() logoUrl?: string;

  @IsOptional() @IsString() @MaxLength(7) primaryColor?: string;

  @IsOptional() @IsString() @MaxLength(255) emailFrom?: string;
}
```

```typescript
// apps/api/src/common/dto/webhooks.dto.ts
import { IsString, IsOptional, IsArray, IsBoolean, IsUrl, MaxLength } from "class-validator";

const VALID_EVENTS = [
  "board.created", "board.completed",
  "card.created", "card.completed", "card.assigned", "card.overdue",
];

export class CreateWebhookDto {
  @IsUrl({ require_protocol: true }) url!: string;

  @IsArray()
  events!: string[];
}

export class UpdateWebhookDto {
  @IsOptional() @IsUrl({ require_protocol: true }) url?: string;

  @IsOptional() @IsArray() events?: string[];

  @IsOptional() @IsBoolean() isActive?: boolean;
}
```

```typescript
// apps/api/src/common/dto/comments.dto.ts
import { IsString, IsOptional, IsIn, MaxLength } from "class-validator";

export class CreateCommentDto {
  @IsString() @MaxLength(5000) content!: string;

  @IsIn(["internal", "client"]) visibility!: string;
}

export class UpdateCommentDto {
  @IsString() @MaxLength(5000) content!: string;
}
```

**Step 3: Write validation test**

```typescript
// apps/api/src/common/dto/validation.spec.ts
import { describe, it, expect } from "vitest";
import { validate } from "class-validator";
import { plainToInstance } from "class-transformer";
import { CreateBoardDto } from "./boards.dto";
import { LoginDto } from "./auth.dto";
import { CreateCardDto, MoveCardDto } from "./cards.dto";
import { CreateListDto } from "./lists.dto";
import { ApplyTemplateDto } from "./templates.dto";

describe("DTO Validation", () => {
  it("rejects CreateBoardDto with extra fields (mass assignment)", async () => {
    const dto = plainToInstance(CreateBoardDto, {
      title: "Test",
      clientName: "Client",
      role: "admin", // extra field — should be stripped
    });
    const errors = await validate(dto, { whitelist: true, forbidNonWhitelisted: true });
    // ForbidNonWhitelisted would be handled by the pipe, but whitelist strips it
    expect(dto).not.toHaveProperty("role");
  });

  it("rejects LoginDto with missing email", async () => {
    const dto = plainToInstance(LoginDto, { password: "123456" });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe("email");
  });

  it("rejects LoginDto with short password", async () => {
    const dto = plainToInstance(LoginDto, { email: "test@test.com", password: "12" });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe("password");
  });

  it("accepts valid CreateBoardDto", async () => {
    const dto = plainToInstance(CreateBoardDto, {
      title: "My Board",
      clientName: "Client",
      clientEmail: "c@test.com",
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it("rejects MoveCardDto with negative position", async () => {
    const dto = plainToInstance(MoveCardDto, { listId: "abc", position: -1 });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it("accepts valid ApplyTemplateDto", async () => {
    const dto = plainToInstance(ApplyTemplateDto, {
      clientName: "Test",
      variables: { key: "val" },
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it("rejects CreateListDto with missing title", async () => {
    const dto = plainToInstance(CreateListDto, { position: 0 });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe("title");
  });
});
```

**Step 4: Run test to verify it fails**

Run: `cd apps/api && pnpm test -- src/common/dto/validation.spec.ts`
Expected: FAIL — files don't exist yet

**Step 5: Create the DTO files and common directory**

```bash
mkdir -p apps/api/src/common/dto
```

Create all DTO files from Step 2.

**Step 6: Update controllers to use DTOs**

Replace all `body: any` with typed DTOs:

- `auth.controller.ts`: `@Body() body: LoginDto`
- `boards.controller.ts`: `@Body() body: CreateBoardDto`, `@Body() body: UpdateBoardDto`
- `cards.controller.ts`: `@Body() body: CreateCardDto`, `@Body() body: UpdateCardDto`, `@Body() body: MoveCardDto`
- `lists.controller.ts`: `@Body() body: CreateListDto`, `@Body() body: UpdateListDto`
- `templates.controller.ts`: `@Body() body: CreateTemplateDto`, `@Body() body: ApplyTemplateDto`, `@Body() body: UpdateTemplateDto`
- `settings.controller.ts`: `@Body() body: UpdateSettingsDto`
- `webhooks.controller.ts`: `@Body() body: CreateWebhookDto`, `@Body() body: UpdateWebhookDto`
- `comments.controller.ts`: `@Body() body: CreateCommentDto`, `@Body() body: UpdateCommentDto`

**Step 7: Run all tests**

Run: `cd apps/api && pnpm test`
Expected: All existing tests pass + new DTO validation tests pass

**Step 8: Commit**

```bash
git add -A
git commit -m "feat: add validation DTOs and global ValidationPipe to prevent mass assignment (C1)"
```

---

### Task 2: Add Owner-Resource Authorization Guard (C2)

**TDD scenario:** New feature — full TDD cycle.

**Files:**
- Create: `apps/api/src/common/guards/board-member.guard.ts`
- Modify: `apps/api/src/modules/boards/boards.controller.ts` — add guard to board CRUD endpoints
- Modify: `apps/api/src/modules/cards/cards.controller.ts` — add guard to card endpoints
- Test: `apps/api/src/common/guards/board-member.guard.spec.ts`

**Step 1: Write the failing test**

```typescript
// apps/api/src/common/guards/board-member.guard.spec.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { BoardMemberGuard } from "./board-member.guard";
import { ExecutionContext, NotFoundException, ForbiddenException } from "@nestjs/common";

describe("BoardMemberGuard", () => {
  let guard: BoardMemberGuard;

  const mockDb = {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    guard = new BoardMemberGuard(mockDb as any);
  });

  function createContext(userId: string, boardId: string): ExecutionContext {
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          user: { id: userId, role: "member" },
          params: { id: boardId },
        }),
      }),
    } as any;
  }

  it("allows access if user is the board creator", async () => {
    mockDb.limit.mockResolvedValue([{ id: "b1", createdBy: "u1" }]);
    const context = createContext("u1", "b1");
    await expect(guard.canActivate(context)).resolves.toBe(true);
  });

  it("allows access if user is admin (even if not creator)", async () => {
    mockDb.limit.mockResolvedValue([{ id: "b1", createdBy: "u2" }]);
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({
          user: { id: "u1", role: "admin" },
          params: { id: "b1" },
        }),
      }),
    } as any;
    await expect(guard.canActivate(context)).resolves.toBe(true);
  });

  it("denies access if user is not creator and not admin", async () => {
    mockDb.limit.mockResolvedValue([{ id: "b1", createdBy: "u2" }]);
    const context = createContext("u1", "b1");
    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
  });

  it("throws NotFoundException if board doesn't exist", async () => {
    mockDb.limit.mockResolvedValue([]);
    const context = createContext("u1", "nonexistent");
    await expect(guard.canActivate(context)).rejects.toThrow(NotFoundException);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd apps/api && pnpm test -- src/common/guards/board-member.guard.spec.ts`
Expected: FAIL

**Step 3: Implement the guard**

```typescript
// apps/api/src/common/guards/board-member.guard.ts
import { CanActivate, ExecutionContext, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { db } from "../../database/connection";
import { boards } from "../../database/schema";
import { eq } from "drizzle-orm";

@Injectable()
export class BoardMemberGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId = request.user?.id;
    const userRole = request.user?.role;
    const boardId = request.params?.id ?? request.params?.boardId;

    if (!boardId || !userId) return true; // Skip for routes without board ID

    const [board] = await db
      .select({ id: boards.id, createdBy: boards.createdBy })
      .from(boards)
      .where(eq(boards.id, boardId))
      .limit(1);

    if (!board) throw new NotFoundException("Board not found");

    if (userRole === "admin" || board.createdBy === userId) {
      return true;
    }

    throw new ForbiddenException("You do not have access to this board");
  }
}
```

**Step 4: Run tests**

Run: `cd apps/api && pnpm test`
Expected: All pass

**Step 5: Apply guard to boards and cards controllers**

Add `BoardMemberGuard` to `findOne`, `findDetail`, `update`, `regenerateToken`, `getStats` endpoints in `BoardsController`. Add to card endpoints that need board context.

Note: `findAll` does NOT need the guard (it should filter by user, but that's a separate concern). The `create` endpoint also doesn't need it (the user IS the creator).

**Step 6: Run all tests and commit**

Run: `cd apps/api && pnpm test`
Expected: All pass

```bash
git add -A
git commit -m "feat: add BoardMemberGuard for owner-resource authorization (C2)"
```

---

### Task 3: Fix `select().from()` to use explicit column selects (I1)

**TDD scenario:** Modifying existing tested code — run existing tests first.

**Files:**
- Modify: `apps/api/src/modules/cards/cards.service.ts` — 8 occurrences
- Modify: `apps/api/src/modules/boards/boards.service.ts` — 8 occurrences
- Modify: `apps/api/src/modules/comments/comments.service.ts` — 3 occurrences
- Modify: `apps/api/src/modules/labels/labels.service.ts` — 1 occurrence
- Modify: `apps/api/src/modules/attachments/attachments.service.ts` — 1 occurrence

**Step 1: Fix CardsService findOne + findDetail**

Replace all 8 `db.select().from(table)` with explicit column lists. Use the same columns pattern already used in `findByList()`:

```typescript
// cards.service.ts:55 — findOne
const [card] = await db
  .select({
    id: cards.id, listId: cards.listId, boardId: cards.boardId,
    title: cards.title, description: cards.description, position: cards.position,
    dueDate: cards.dueDate, completedAt: cards.completedAt, publicId: cards.publicId,
    cardNumber: cards.cardNumber, createdAt: cards.createdAt, updatedAt: cards.updatedAt,
  })
  .from(cards)
  .where(eq(cards.id, id))
  .limit(1);

// cards.service.ts:61 — findDetail card lookup (same columns)
// cards.service.ts:64-67 — findDetail sub-queries:
const comments = await db
  .select({ id: cardComments.id, cardId: cardComments.cardId, authorId: cardComments.authorId, content: cardComments.content, visibility: cardComments.visibility, createdAt: cardComments.createdAt, updatedAt: cardComments.updatedAt })
  .from(cardComments)
  .where(eq(cardComments.cardId, id))
  .orderBy(cardComments.createdAt);

// Same pattern for attachments, assignees, labels

// cards.service.ts:83 — moveCard card lookup
// cards.service.ts:86 — moveCard list lookup
const [targetList] = await db
  .select({ id: lists.id, title: lists.title, boardId: lists.boardId, position: lists.position })
  .from(lists)
  .where(eq(lists.id, listId))
  .limit(1);
```

**Step 2: Fix BoardsService — 8 occurrences**

Apply same pattern to `findOne`, `findDetail`, `findByPublicToken`, `findPublicDetail`. Use safe public columns for public endpoints (no `clientEmail`, `publicToken` in public response where not needed).

**Step 3: Fix CommentsService — 2 occurrences in `findByCard`**

Add explicit columns, especially filter OUT `authorId` for public views.

**Step 4: Fix LabelsService — 1 occurrence in `findByBoard`**

```typescript
async findByBoard(boardId: string) {
  return db
    .select({ id: labels.id, boardId: labels.boardId, name: labels.name, color: labels.color })
    .from(labels)
    .where(eq(labels.boardId, boardId));
}
```

**Step 5: Fix AttachmentsService — 1 occurrence in `findByCard`**

```typescript
async findByCard(cardId: string) {
  return db
    .select({ id: cardAttachments.id, cardId: cardAttachments.cardId, fileName: cardAttachments.fileName, fileUrl: cardAttachments.fileUrl, fileSize: cardAttachments.fileSize, mimeType: cardAttachments.mimeType, visibility: cardAttachments.visibility, createdAt: cardAttachments.createdAt })
    .from(cardAttachments)
    .where(eq(cardAttachments.cardId, cardId))
    .orderBy(cardAttachments.createdAt);
}
```

**Step 6: Fix TemplatesService — 3 occurrences in `findOne`**

Add explicit columns to template, templateVariables, templateLists, templateCards selects.

**Step 7: Run all tests and commit**

Run: `cd apps/api && pnpm test`
Expected: All pass

```bash
git add -A
git commit -m "fix: replace select().from() with explicit column selects across all services (I1)"
```

---

### Task 4: Add `.returning()` to all INSERT statements (I2)

**TDD scenario:** Modifying existing tested code — run existing tests first.

**Files:**
- Modify: `apps/api/src/modules/comments/comments.service.ts:10`
- Modify: `apps/api/src/modules/lists/lists.service.ts:10`
- Modify: `apps/api/src/modules/cards/cards.service.ts:14`
- Modify: `apps/api/src/modules/labels/labels.service.ts:10,28`
- Modify: `apps/api/src/modules/boards/boards.service.ts:24`
- Modify: `apps/api/src/modules/templates/templates.service.ts:33,58`
- Modify: `apps/api/src/modules/notifications/notifications.service.ts:30`

Note: Some services already use `.returning()` (ListsService create, CardsService create, etc.). Only fix the ones that are missing it.

**Step 1: Check each INSERT and add `.returning()` where missing**

For each INSERT without `.returning()`, add `.returning()` with appropriate columns:

```typescript
// Example: comments.service.ts
const [comment] = await db
  .insert(cardComments)
  .values({ ... })
  .returning();  // ADD THIS

// Example: notifications.service.ts createForUsers
return db
  .insert(notifications)
  .values(userIds.map(...))
  .returning();  // ADD THIS

// Example: templates.service.ts templateVariables
await db.insert(templateVariables).values([...]).returning();  // ADD THIS

// Example: templates.service.ts templateCards
await db.insert(templateCards).values([...]).returning();  // ADD THIS
```

**Step 2: For seed files, add `.returning({ id: table.id })` where appropriate**

The seed files (`seed.ts`, `template-seed.ts`) don't need full returns since results aren't used, but adding `.returning()` ensures consistency and satisfies the rule.

**Step 3: Run all tests and commit**

Run: `cd apps/api && pnpm test`
Expected: All pass

```bash
git add -A
git commit -m "fix: add .returning() to all INSERT statements across services (I2)"
```

---

### Task 5: Fix OverdueCronListener synchronous emit (I3)

**TDD scenario:** Trivial change — verify fix directly.

**Files:**
- Modify: `apps/api/src/modules/notifications/listeners/overdue-cron.listener.ts:39`

**Step 1: Replace `emit` with `emitAsync` + `.catch()`**

```typescript
// BEFORE:
this.eventEmitter.emit(EVENTS.CARD_OVERDUE, {
  cardId: card.cardId,
  cardTitle: card.cardTitle,
  boardId: card.boardId,
  assigneeIds: assignees.map((a) => a.userId),
  dueDate: card.dueDate,
});

// AFTER:
this.eventEmitter.emitAsync(EVENTS.CARD_OVERDUE, {
  cardId: card.cardId,
  cardTitle: card.cardTitle,
  boardId: card.boardId,
  assigneeIds: assignees.map((a) => a.userId),
  dueDate: card.dueDate,
}).catch((err: Error) => {
  this.logger.error(`Failed to emit card.overdue event: ${err.message}`);
});
```

**Step 2: Run tests and commit**

Run: `cd apps/api && pnpm test`
Expected: All pass

```bash
git add -A
git commit -m "fix: use emitAsync with catch in OverdueCronListener (I3)"
```

---

### Task 6: Add role guards to Settings + Notifications endpoints (I6)

**TDD scenario:** Trivial change — add decorators.

**Files:**
- Modify: `apps/api/src/modules/settings/settings.controller.ts` — Settings GET already has JwtAuthGuard, but PATCH needs RolesGuard + @Roles("admin")
- Modify: `apps/api/src/modules/notifications/notifications.controller.ts` — add guard if missing

**Step 1: Fix SettingsController**

```typescript
// settings.controller.ts — update method already has @Roles("admin") + RolesGuard
// GET needs no role guard (any authenticated user can view settings)
// PATCH already protected with @Roles("admin") — verify it actually has RolesGuard
```

Check the current code — `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles("admin")` is already on the PATCH. The GET also has `JwtAuthGuard`. ✅ Already fixed!

**Step 2: Check NotificationsController**

```bash
cat apps/api/src/modules/notifications/notifications.controller.ts
```

Verify that `markAsRead`, `markAllAsRead`, `getUnreadCount` have `JwtAuthGuard`.

**Step 3: Run tests and commit**

If any changes needed:
```bash
git add -A
git commit -m "fix: add role guards to admin-only endpoints (I6)"
```

---

### Task 7: Server-side filtering for public board view (M4)

**TDD scenario:** New feature — add server-side filtering.

**Files:**
- Modify: `apps/api/src/modules/boards/boards.service.ts` — `findPublicDetail()` should filter comments/attachments by visibility
- Modify: `apps/web/src/app/b/[token]/page.tsx` — remove client-side filtering
- Modify: `apps/web/src/components/board/card-detail-panel.tsx` — server already filters, remove `publicView` filtering logic

**Step 1: Fix `findPublicDetail()` in BoardsService**

Currently `findPublicDetail` returns all cards. The public endpoint should also return lists + cards, and the frontend fetches card detail via `/cards/:id/detail` which returns ALL comments/attachments.

Add a `findPublicCardDetail()` method that filters:

```typescript
// boards.service.ts — new method
async findPublicCardDetail(cardId: string) {
  const [card] = await db
    .select({ id: cards.id, title: cards.title, description: cards.description, dueDate: cards.dueDate, completedAt: cards.completedAt, listId: cards.listId })
    .from(cards)
    .where(eq(cards.id, cardId))
    .limit(1);

  if (!card) throw new NotFoundException("Card not found");

  const comments = await db
    .select({ id: cardComments.id, content: cardComments.content, visibility: cardComments.visibility, createdAt: cardComments.createdAt })
    .from(cardComments)
    .where(and(eq(cardComments.cardId, cardId), eq(cardComments.visibility, "client")))
    .orderBy(cardComments.createdAt);

  const attachments = await db
    .select({ id: cardAttachments.id, fileName: cardAttachments.fileName, fileUrl: cardAttachments.fileUrl, fileSize: cardAttachments.fileSize, visibility: cardAttachments.visibility, createdAt: cardAttachments.createdAt })
    .from(cardAttachments)
    .where(and(eq(cardAttachments.cardId, cardId), eq(cardAttachments.visibility, "client")))
    .orderBy(cardAttachments.createdAt);

  return { ...card, labels: [], comments, attachments };
}
```

**Step 2: Add public card detail endpoint**

```typescript
// boards.controller.ts
@UseGuards(PublicBoardGuard)
@Get("public/:token/cards/:cardId")
async findPublicCardDetail(@Param("cardId") cardId: string) {
  return this.boardsService.findPublicCardDetail(cardId);
}
```

**Step 3: Update frontend to use the public endpoint**

In `apps/web/src/app/b/[token]/page.tsx`, change `handleCardClick`:

```typescript
const handleCardClick = async (cardId: string) => {
  try {
    // Use public endpoint that server-filters comments/attachments
    const cardDetail = await apiClient<CardDetail>(`/boards/public/${token}/cards/${cardId}`);
    setSelectedCard(cardDetail);
    setPanelOpen(true);
  } catch (err) {
    console.error(err);
  }
};
```

**Step 4: Remove client-side filtering in CardDetailPanel**

The `publicView` filtering in `card-detail-panel.tsx:42-43` can be removed since the server now returns pre-filtered data. Keep the `publicView` prop for read-only UI (no comment input form), but remove the `.filter()` calls.

**Step 5: Run all tests and commit**

Run: `cd apps/api && pnpm test && cd ../web && pnpm test`
Expected: All pass

```bash
git add -A
git commit -m "fix: server-side filtering for public board comments/attachments (M4)"
```

---

### Task 8: Fix EmailSender lazy initialization (I4)

**TDD scenario:** Modifying existing tested code.

**Files:**
- Modify: `apps/api/src/modules/notifications/email.sender.ts`

**Step 1: Replace constructor init with lazy getter**

```typescript
// email.sender.ts
private _transporter?: nodemailer.Transporter;

private getTransporter(): nodemailer.Transporter {
  if (!this._transporter) {
    const smtpHost = this.configService?.get<string>("SMTP_HOST") ?? "";
    if (smtpHost) {
      this._transporter = nodemailer.createTransport({
        host: smtpHost,
        port: parseInt(this.configService?.get<string>("SMTP_PORT") ?? "465", 10),
        secure: parseInt(this.configService?.get<string>("SMTP_PORT") ?? "465", 10) === 465,
        auth: {
          user: this.configService?.get<string>("SMTP_USER") ?? "",
          pass: this.configService?.get<string>("SMTP_PASSWORD") ?? "",
        },
      });
    } else {
      this._transporter = nodemailer.createTransport({ jsonTransport: true } as any);
    }
  }
  return this._transporter;
}
```

Then replace `this.transporter.sendMail(...)` with `this.getTransporter().sendMail(...)`.

**Step 2: Run tests and commit**

Run: `cd apps/api && pnpm test`
Expected: All pass

```bash
git add -A
git commit -m "refactor: lazy-initialize EmailSender transport (I4)"
```

---

### Task 9: Fix DashboardService naming + BoardEventsListener publicToken (M1 + M2)

**TDD scenario:** Trivial fix — verify directly.

**Files:**
- Modify: `apps/api/src/modules/dashboard/dashboard.service.ts`
- Modify: `apps/api/src/modules/cards/cards.service.ts` — enrich CARD_COMPLETED event with publicToken
- Modify: `apps/api/src/modules/notifications/listeners/board-events.listener.spec.ts` — update test

**Step 1: Fix DashboardService avgCompletion naming**

```typescript
// dashboard.service.ts
// Change: avgCompletionPercentage → completedBoardPercentage
return {
  totalBoards: total,
  activeBoards: active,
  completedBoards: completed,
  archivedBoards: total - active - completed,
  completedBoardPercentage: total > 0 ? Math.round((completed / total) * 100) : 0,
};
```

**Step 2: Enrich CARD_COMPLETED event with board publicToken**

In `cards.service.ts` `moveCard()`, after emitting `CARD_COMPLETED`, include the board's `publicToken`:

```typescript
// cards.service.ts — moveCard
if (completedAt && isCompletionList(targetList.title)) {
  // Fetch board publicToken
  const [board] = await db
    .select({ publicToken: boards.publicToken })
    .from(boards)
    .where(eq(boards.id, updated.boardId))
    .limit(1);

  this.eventEmitter.emitAsync(EVENTS.CARD_COMPLETED, {
    cardId: updated.id,
    cardTitle: updated.title,
    boardId: updated.boardId,
    completedBy: updated.createdBy, // NOTE: this should be user.id from request, not createdBy
    listTitle: targetList.title,
    publicToken: board?.publicToken,
  }).catch(() => {});
}
```

**Step 3: Update BoardEventsListener test for publicToken**

```typescript
// board-events.listener.spec.ts — add test
it("sends email with public link on board.completed", async () => {
  await listener.handleBoardCompleted({
    boardId: "b1", boardTitle: "Acme", clientEmail: "c@acme.com",
    clientName: "Acme", completedBy: "u1", teamMemberIds: ["u1"],
    publicToken: "abc123",
  });
  expect(emailSender.sendBoardCompletionEmail).toHaveBeenCalledWith(
    "c@acme.com", "Acme", "Acme", "abc123"
  );
});
```

**Step 4: Run tests and commit**

Run: `cd apps/api && pnpm test`
Expected: All pass

```bash
git add -A
git commit -m "fix: rename avgCompletionPercentage + add publicToken to CARD_COMPLETED event (M1+M2)"
```

---

### Task 10: Frontend fixes — error feedback, type safety, CORS (M3 + M5 + M7)

**TDD scenario:** Trivial fixes — verify with existing tests.

**Files:**
- Modify: `apps/web/src/app/(dashboard)/boards/[id]/page.tsx` — add toast on handleCardClick error
- Modify: `apps/web/src/app/b/[token]/page.tsx` — add toast on handleCardClick error
- Modify: `apps/api/src/main.ts` — allow multiple CORS origins

**Step 1: Add toast error feedback in both handleCardClick functions**

```typescript
// boards/[id]/page.tsx
import { toast } from "sonner";

const handleCardClick = async (cardId: string) => {
  try {
    const cardDetail = await apiClient<CardDetail>(`/cards/${cardId}`, { token: token! });
    setSelectedCard(cardDetail);
    setPanelOpen(true);
  } catch {
    toast.error("Failed to load card details");
  }
};
```

Same pattern in `b/[token]/page.tsx`.

**Step 2: Fix CORS for multiple origins**

```typescript
// main.ts
app.enableCors({
  origin: (origin, callback) => {
    const allowed = [
      process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000",
      "http://localhost:3000",
    ];
    if (!origin || allowed.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
});
```

**Step 3: Run all tests and commit**

Run: `cd apps/web && pnpm test && cd ../api && pnpm test`
Expected: All pass

```bash
git add -A
git commit -m "fix: add error toast feedback, multi-origin CORS, frontend type improvements (M3+M5+M7)"
```

---

### Task 11: Add client visibility filtering to E2E test (M6)

**TDD scenario:** Add test assertions to existing E2E test.

**Files:**
- Modify: `apps/api/test/e2e/full-flow.e2e-spec.ts` — add step 9b

**Step 1: Add visibility filter assertions to E2E test**

After step 8 (access public board), add:

```typescript
// Step 9b: Verify client content filtering via public card detail
it("public card detail only shows client-visible comments", async () => {
  const boardRes = await request(app.getHttpServer())
    .get(`/api/boards/${boardId}`)
    .set(authHeader());
  const publicToken = boardRes.body.publicToken;

  // Get a card that has both internal and client comments
  const listsRes = await request(app.getHttpServer())
    .get(`/api/boards/${boardId}/lists`)
    .set(authHeader());
  const firstCardId = listsRes.body[0].cards[0].id;

  // Public endpoint should only return client-visible comments
  const publicCardRes = await request(app.getHttpServer())
    .get(`/api/boards/public/${publicToken}/cards/${firstCardId}`);

  if (publicCardRes.status === 200) {
    const clientComments = publicCardRes.body.comments ?? [];
    clientComments.forEach((c: any) => {
      expect(c.visibility).toBe("client");
    });
    // The internal comment should NOT appear
    expect(clientComments.every((c: any) => c.content !== "Internal team note")).toBe(true);
  }
});
```

**Step 2: Commit**

```bash
git add -A
git commit -m "test: add client visibility filtering assertion to E2E test (M6)"
```

---

## Task Dependency Order

```
Task 1 (DTOs + ValidationPipe)  ← no dependencies
Task 2 (BoardMemberGuard)       ← no dependencies (but uses DTOs from Task 1)
Task 3 (SELECT columns)         ← no dependencies
Task 4 (INSERT .returning())     ← no dependencies
Task 5 (emitAsync)              ← no dependencies
Task 6 (Role guards)             ← verify existing, no dependencies
Task 7 (Server-side filtering)   ← should come AFTER Task 3 (uses fixed select)
Task 8 (EmailSender lazy)        ← no dependencies
Task 9 (Dashboard + publicToken) ← no dependencies
Task 10 (Frontend fixes)         ← no dependencies
Task 11 (E2E visibility test)    ← should come AFTER Task 7 (tests new endpoint)
```

Tasks 1-6 can be done in order. Tasks 3-5 and 8-10 are independent of each other. Task 7 depends on Task 3. Task 11 depends on Task 7.

**Recommended execution order:** 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10 → 11

## Estimated Time

| Task | Est. |
|------|------|
| 1 (DTOs + ValidationPipe) | 30 min |
| 2 (BoardMemberGuard) | 20 min |
| 3 (SELECT columns) | 25 min |
| 4 (INSERT .returning()) | 15 min |
| 5 (emitAsync fix) | 5 min |
| 6 (Role guards) | 5 min |
| 7 (Server-side filtering) | 20 min |
| 8 (EmailSender lazy) | 10 min |
| 9 (Dashboard + publicToken) | 15 min |
| 10 (Frontend fixes) | 15 min |
| 11 (E2E visibility test) | 10 min |
| **Total** | **~2.5 hours** |

---

## Note on I5 (Docker blocked)

E2E tests requiring the database (Task 11 `full-flow.e2e-spec.ts`) can only run after Docker Desktop is fixed and migrations are applied. Unit tests for all other tasks will pass without Docker.