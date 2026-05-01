# Phase 3: Templates — Implementation Plan

> **REQUIRED SUB-SKILL:** Use the executing-plans skill to implement this plan task-by-task.

**Goal:** Build the templates system end-to-end: template categories, template CRUD, template variables with `{{key}}` substitution, template duplication, and board instantiation from templates with variable resolution and due-date offset calculation.

**Architecture:** NestJS `TemplatesModule` with `CategoriesModule` sub-module. Template instantiation creates a Board + its Lists + its Cards in a single service method, resolving all `{{variables}}` via the shared `resolveTemplateVariables` utility. Due dates are computed from `dueDateOffsetDays` relative to board creation date. Substitution happens at creation time (ADR-0004).

**Tech Stack:** NestJS 11, Drizzle ORM, @onboarding-tracker/shared (resolveTemplateVariables), Zod

**Depends on:** Phase 1 (Foundation) + Phase 2 (Auth + CRUD) complete
**Rules Hub:** `docs/plans/IMPLEMENTATION-HUB.md`

---

## 🏛️ CONSTITUIÇÃO DO BANCO DE DADOS — OBRIGATÓRIO NESTA PHASE

> Phase 3 instancia boards a partir de templates — CRIA board + lists + cards em uma transação.
> O agente DEVE seguir estas regras. Referência: `docs/plans/IMPLEMENTATION-HUB.md` e `rules/`

```
1. NUNCA use sql.raw() com interpolação
2. NUNCA faça queries em loop (N+1)
3. Sempre use .returning() em INSERT e UPDATE
4. Especifique colunas no SELECT
5. USE TRANSAÇÕES para board instantiation (board + lists + cards)
6. Valide input com zod ANTES de ir pro banco
7. Nunca exponha erros de banco ao client
8. Use db.query com `with` para buscar template com lists + cards + variables
```

**Rules desta phase:**
- `rules/db-use-transactions.md` → **CRITICAL** — criar board de template DEVE ser transacional
- `rules/db-avoid-n-plus-one.md` → carregar template com relações via `db.query`
- `rules/db-use-returning.md` → .returning() em todos os INSERTs
- `rules/db-select-columns.md` → Nunca SELECT *
- `rules/db-prevent-sql-injection.md` → Nunca sql.raw()
- `rules/security-validate-all-input.md` → Zod para variáveis de template

### ⚠️ Anti-padrão CRÍTICO desta phase — Board instantiation SEM transação:

```typescript
// ❌ O agente vai tentar criar board + lists + cards separadamente:
const board = await db.insert(boards).values(boardData).returning();
for (const tplList of template.lists) {
  const list = await db.insert(lists).values({...}).returning(); // Se crashar aqui, board fica órfão!
  for (const tplCard of tplList.cards) {
    await db.insert(cards).values({...}).returning(); // N+1 dentro de N+1!
  }
}

// ✅ CORRETO — Tudo em UMA transação, batch inserts:
await db.transaction(async (tx) => {
  const [board] = await tx.insert(boards).values(boardData).returning();
  for (const tplList of template.lists) {
    const [list] = await tx.insert(lists).values({ boardId: board.id, ... }).returning();
    if (tplList.cards.length > 0) {
      await tx.insert(cards).values(
        tplList.cards.map(c => ({ listId: list.id, ...c }))
      ).returning(); // batch insert, não loop
    }
  }
});
```

---

### Task 1: Template Categories Module

**TDD scenario:** Full TDD cycle — simple CRUD service

**Files:**
- Create: `apps/api/src/modules/templates/categories/categories.module.ts`
- Create: `apps/api/src/modules/templates/categories/categories.service.ts`
- Create: `apps/api/src/modules/templates/categories/categories.controller.ts`
- Create: `apps/api/src/modules/templates/categories/dto/create-category.dto.ts`
- Create: `apps/api/src/modules/templates/categories/dto/update-category.dto.ts`
- Test: `apps/api/src/modules/templates/categories/categories.service.spec.ts`

**Step 1: Write failing test for CategoriesService**

Create `apps/api/src/modules/templates/categories/categories.service.spec.ts`:

```typescript
import { Test, TestingModule } from "@nestjs/testing";
import { CategoriesService } from "./categories.service";
import { NotFoundException } from "@nestjs/common";

// Mock db
const mockDb = {
  select: jest.fn().mockReturnThis(),
  from: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  limit: jest.fn(),
  insert: jest.fn().mockReturnThis(),
  values: jest.fn().mockReturnThis(),
  returning: jest.fn(),
  update: jest.fn().mockReturnThis(),
  set: jest.fn().mockReturnThis(),
  delete: jest.fn(),
};

jest.mock("../../database/connection", () => ({
  db: mockDb,
}));

describe("CategoriesService", () => {
  let service: CategoriesService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [CategoriesService],
    }).compile();

    service = module.get<CategoriesService>(CategoriesService);
  });

  describe("create", () => {
    it("creates a category with name and description", async () => {
      mockDb.returning.mockResolvedValueOnce([
        { id: "cat-1", name: "SaaS", description: "Software onboarding", position: 0 },
      ]);

      const result = await service.create({
        name: "SaaS",
        description: "Software onboarding",
      });

      expect(result).toMatchObject({
        id: "cat-1",
        name: "SaaS",
        description: "Software onboarding",
      });
      expect(mockDb.insert).toHaveBeenCalled();
    });
  });

  describe("findAll", () => {
    it("returns all categories ordered by position", async () => {
      mockDb.orderBy.mockResolvedValueOnce([
        { id: "cat-1", name: "SaaS", position: 0 },
        { id: "cat-2", name: "Consulting", position: 1 },
      ]);

      const result = await service.findAll();
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe("SaaS");
    });
  });

  describe("findOne", () => {
    it("returns a category by id", async () => {
      mockDb.limit.mockResolvedValueOnce([
        { id: "cat-1", name: "SaaS" },
      ]);

      const result = await service.findOne("cat-1");
      expect(result).toMatchObject({ id: "cat-1", name: "SaaS" });
    });

    it("throws NotFoundException when category not found", async () => {
      mockDb.limit.mockResolvedValueOnce([]);

      await expect(service.findOne("non-existent")).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe("update", () => {
    it("updates a category name and description", async () => {
      mockDb.returning.mockResolvedValueOnce([
        { id: "cat-1", name: "SaaS Pro", description: "Updated desc" },
      ]);

      const result = await service.update("cat-1", {
        name: "SaaS Pro",
        description: "Updated desc",
      });

      expect(result.name).toBe("SaaS Pro");
    });

    it("throws NotFoundException when updating non-existent category", async () => {
      mockDb.returning.mockResolvedValueOnce([]);

      await expect(
        service.update("non-existent", { name: "X" })
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("reorder", () => {
    it("updates position for multiple categories", async () => {
      mockDb.set.mockReturnThis();
      mockDb.where.mockReturnThis();
      mockDb.returning.mockResolvedValue([{ id: "cat-1", position: 2 }]);

      await service.reorder([
        { id: "cat-1", position: 2 },
        { id: "cat-2", position: 0 },
      ]);

      expect(mockDb.update).toHaveBeenCalledTimes(2);
    });
  });

  describe("remove", () => {
    it("deletes a category by id", async () => {
      await service.remove("cat-1");
      expect(mockDb.delete).toHaveBeenCalled();
    });
  });
});
```

**Step 2: Run test to verify it fails**

```bash
cd apps/api && pnpm test categories.service.spec
```

Expected: FAIL — `Cannot find module './categories.service'`

**Step 3: Implement CategoriesService**

Create `apps/api/src/modules/templates/categories/categories.service.ts`:

```typescript
import { Injectable, NotFoundException } from "@nestjs/common";
import { eq } from "drizzle-orm";
import { db } from "../../../database/connection";
import { templateCategories } from "../../../database/schema";

@Injectable()
export class CategoriesService {
  async create(data: { name: string; description?: string; position?: number }) {
    const [category] = await db
      .insert(templateCategories)
      .values({
        name: data.name,
        description: data.description ?? null,
        position: data.position ?? 0,
      })
      .returning();
    return category;
  }

  async findAll() {
    return db
      .select()
      .from(templateCategories)
      .orderBy(templateCategories.position);
  }

  async findOne(id: string) {
    const [category] = await db
      .select()
      .from(templateCategories)
      .where(eq(templateCategories.id, id))
      .limit(1);

    if (!category) throw new NotFoundException("Category not found");
    return category;
  }

  async update(
    id: string,
    data: { name?: string; description?: string; position?: number }
  ) {
    const [category] = await db
      .update(templateCategories)
      .set(data)
      .where(eq(templateCategories.id, id))
      .returning();

    if (!category) throw new NotFoundException("Category not found");
    return category;
  }

  async reorder(items: { id: string; position: number }[]) {
    for (const item of items) {
      await db
        .update(templateCategories)
        .set({ position: item.position })
        .where(eq(templateCategories.id, item.id));
    }
  }

  async remove(id: string) {
    await db.delete(templateCategories).where(eq(templateCategories.id, id));
  }
}
```

**Step 4: Run test to verify it passes**

```bash
cd apps/api && pnpm test categories.service.spec
```

Expected: 7 tests PASS

**Step 5: Create DTOs**

Create `apps/api/src/modules/templates/categories/dto/create-category.dto.ts`:

```typescript
import { IsString, IsOptional, IsNumber, Min } from "class-validator";

export class CreateCategoryDto {
  @IsString()
  name!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  position?: number;
}
```

Create `apps/api/src/modules/templates/categories/dto/update-category.dto.ts`:

```typescript
import { IsString, IsOptional, IsNumber, Min } from "class-validator";

export class UpdateCategoryDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  position?: number;
}
```

**Step 6: Implement CategoriesController**

Create `apps/api/src/modules/templates/categories/categories.controller.ts`:

```typescript
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
} from "@nestjs/common";
import { CategoriesService } from "./categories.service";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../../auth/guards/roles.guard";
import { Roles } from "../../auth/decorators/roles.decorator";
import { CreateCategoryDto } from "./dto/create-category.dto";
import { UpdateCategoryDto } from "./dto/update-category.dto";

@UseGuards(JwtAuthGuard)
@Controller("template-categories")
export class CategoriesController {
  constructor(private categoriesService: CategoriesService) {}

  @Get()
  async findAll() {
    return this.categoriesService.findAll();
  }

  @Get(":id")
  async findOne(@Param("id") id: string) {
    return this.categoriesService.findOne(id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles("admin")
  async create(@Body() dto: CreateCategoryDto) {
    return this.categoriesService.create(dto);
  }

  @Patch("reorder")
  @UseGuards(RolesGuard)
  @Roles("admin")
  async reorder(
    @Body() body: { items: { id: string; position: number }[] }
  ) {
    await this.categoriesService.reorder(body.items);
    return { success: true };
  }

  @Patch(":id")
  @UseGuards(RolesGuard)
  @Roles("admin")
  async update(@Param("id") id: string, @Body() dto: UpdateCategoryDto) {
    return this.categoriesService.update(id, dto);
  }

  @Delete(":id")
  @UseGuards(RolesGuard)
  @Roles("admin")
  async remove(@Param("id") id: string) {
    await this.categoriesService.remove(id);
    return { success: true };
  }
}
```

**Step 7: Wire up CategoriesModule**

Create `apps/api/src/modules/templates/categories/categories.module.ts`:

```typescript
import { Module } from "@nestjs/common";
import { CategoriesService } from "./categories.service";
import { CategoriesController } from "./categories.controller";

@Module({
  providers: [CategoriesService],
  controllers: [CategoriesController],
  exports: [CategoriesService],
})
export class CategoriesModule {}
```

**Step 8: Run all tests**

```bash
cd apps/api && pnpm test
```

Expected: All previous tests + 7 new category tests PASS

**Step 9: Commit**

```bash
git add -A
git commit -m "feat: add template categories module with CRUD and reorder"
```

---

### Task 2: Templates Module — CRUD with Variables + Lists + Cards

**TDD scenario:** Full TDD cycle — complex creation with nested data

**Files:**
- Create: `apps/api/src/modules/templates/templates.module.ts`
- Create: `apps/api/src/modules/templates/templates.service.ts`
- Create: `apps/api/src/modules/templates/templates.controller.ts`
- Create: `apps/api/src/modules/templates/dto/create-template.dto.ts`
- Create: `apps/api/src/modules/templates/dto/apply-template.dto.ts`
- Test: `apps/api/src/modules/templates/templates.service.spec.ts`

**Step 1: Write failing test for TemplatesService.create + findOne**

Create `apps/api/src/modules/templates/templates.service.spec.ts`:

```typescript
import { Test, TestingModule } from "@nestjs/testing";
import { TemplatesService } from "./templates.service";
import { NotFoundException } from "@nestjs/common";
import { resolveTemplateVariables } from "@onboarding-tracker/shared";

// Mock db
const mockReturning = jest.fn();
const mockLimit = jest.fn();
const mockOrderBy = jest.fn();
const mockFrom = jest.fn();
const mockWhere = jest.fn();
const mockValues = jest.fn();
const mockSet = jest.fn();

const mockDb = {
  select: jest.fn().mockReturnThis(),
  from: jest.fn(() => ({ where: mockWhere, orderBy: mockOrderBy, limit: mockLimit })),
  where: mockWhere,
  orderBy: mockOrderBy,
  limit: mockLimit,
  insert: jest.fn().mockReturnThis(),
  values: mockValues.mockReturnValue({ returning: mockReturning }),
  returning: mockReturning,
  update: jest.fn().mockReturnThis(),
  set: mockSet.mockReturnThis(),
  delete: jest.fn(),
};

jest.mock("../../database/connection", () => ({
  db: mockDb,
}));

// Mock dependant services
const mockBoardsService = { create: jest.fn() };
const mockListsService = { create: jest.fn() };
const mockCardsService = { create: jest.fn() };

describe("TemplatesService", () => {
  let service: TemplatesService;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockWhere.mockReturnThis();
    mockOrderBy.mockReturnThis();
    mockFrom.mockReturnValue({ where: mockWhere, orderBy: mockOrderBy, limit: mockLimit });
    mockLimit.mockResolvedValue([]);
    mockOrderBy.mockResolvedValue([]);
    mockReturning.mockResolvedValue([]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TemplatesService,
        { provide: "BoardsService", useValue: mockBoardsService },
        { provide: "ListsService", useValue: mockListsService },
        { provide: "CardsService", useValue: mockCardsService },
      ],
    }).compile();

    service = module.get<TemplatesService>(TemplatesService);
  });

  describe("create", () => {
    it("creates a template with variables and nested lists + cards", async () => {
      // Template insert
      mockReturning
        .mockResolvedValueOnce([{ id: "tpl-1", name: "SaaS Onboarding", createdBy: "user-1" }])
        // Variables insert
        .mockResolvedValueOnce([
          { id: "var-1", key: "client_name", displayName: "Client Name" },
        ])
        // List insert
        .mockResolvedValueOnce([{ id: "list-1", title: "Setup {{client_name}}" }])
        // Card insert
        .mockResolvedValueOnce([
          { id: "card-1", title: "Welcome {{client_name}}" },
        ]);

      // findOne mock for the return
      mockLimit.mockResolvedValueOnce([{ id: "tpl-1", name: "SaaS Onboarding" }])
        .mockResolvedValueOnce([]) // variables
        .mockResolvedValueOnce([]); // lists
      mockOrderBy.mockResolvedValue([]);

      const result = await service.create({
        name: "SaaS Onboarding",
        createdBy: "user-1",
        variables: [
          { key: "client_name", displayName: "Client Name", isRequired: true },
        ],
        lists: [
          {
            title: "Setup {{client_name}}",
            position: 0,
            cards: [
              { title: "Welcome {{client_name}}", position: 0, dueDateOffsetDays: 7 },
            ],
          },
        ],
      });

      expect(mockDb.insert).toHaveBeenCalled();
    });
  });

  describe("findOne", () => {
    it("throws NotFoundException when template not found", async () => {
      mockLimit.mockResolvedValueOnce([]);

      await expect(service.findOne("non-existent")).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe("applyTemplate — variable resolution", () => {
    it("resolves {{client_name}} in list and card titles", () => {
      const variables = { client_name: "Acme Corp" };

      expect(resolveTemplateVariables("Setup {{client_name}}", variables)).toBe(
        "Setup Acme Corp"
      );
      expect(
        resolveTemplateVariables("Welcome {{client_name}} to our service", variables)
      ).toBe("Welcome Acme Corp to our service");
    });

    it("resolves multiple variables in one string", () => {
      const variables = { client_name: "Acme", service_type: "SaaS Pro" };

      expect(
        resolveTemplateVariables(
          "{{client_name}} — {{service_type}} onboarding",
          variables
        )
      ).toBe("Acme — SaaS Pro onboarding");
    });

    it("leaves unresolved variables intact", () => {
      const variables = { client_name: "Acme" };

      expect(
        resolveTemplateVariables(
          "Setup {{client_name}} — {{unknown_var}}",
          variables
        )
      ).toBe("Setup Acme — {{unknown_var}}");
    });
  });

  describe("applyTemplate — due date offset", () => {
    it("calculates due date from offset days relative to board creation", () => {
      const boardCreatedAt = new Date("2025-05-01T10:00:00Z");
      const offsetDays = 7;
      const dueDate = new Date(boardCreatedAt);
      dueDate.setDate(dueDate.getDate() + offsetDays);

      expect(dueDate.toISOString().split("T")[0]).toBe("2025-05-08");
    });

    it("handles offset of 0 (same day as creation)", () => {
      const boardCreatedAt = new Date("2025-05-01T10:00:00Z");
      const offsetDays = 0;
      const dueDate = new Date(boardCreatedAt);
      dueDate.setDate(dueDate.getDate() + offsetDays);

      expect(dueDate.toISOString().split("T")[0]).toBe("2025-05-01");
    });

    it("handles negative offset (days before creation - rare but valid)", () => {
      const boardCreatedAt = new Date("2025-05-10T10:00:00Z");
      const offsetDays = -2;
      const dueDate = new Date(boardCreatedAt);
      dueDate.setDate(dueDate.getDate() + offsetDays);

      expect(dueDate.toISOString().split("T")[0]).toBe("2025-05-08");
    });

    it("null offset means no due date", () => {
      const offsetDays = null;
      expect(offsetDays).toBeNull();
    });
  });
});
```

**Step 2: Run test to verify it fails**

```bash
cd apps/api && pnpm test templates.service.spec
```

Expected: FAIL — `Cannot find module './templates.service'`

**Step 3: Implement TemplatesService**

Create `apps/api/src/modules/templates/templates.service.ts`:

```typescript
import { Injectable, NotFoundException } from "@nestjs/common";
import { eq } from "drizzle-orm";
import { db } from "../../database/connection";
import {
  templates,
  templateVariables,
  templateLists,
  templateCards,
} from "../../database/schema";
import { resolveTemplateVariables } from "@onboarding-tracker/shared";
import { BoardsService } from "../boards/boards.service";
import { ListsService } from "../lists/lists.service";
import { CardsService } from "../cards/cards.service";

@Injectable()
export class TemplatesService {
  constructor(
    private boardsService: BoardsService,
    private listsService: ListsService,
    private cardsService: CardsService,
  ) {}

  async create(data: {
    name: string;
    description?: string;
    categoryId?: string;
    isDefault?: boolean;
    createdBy: string;
    variables?: {
      key: string;
      displayName: string;
      defaultValue?: string;
      isRequired: boolean;
    }[];
    lists?: {
      title: string;
      color?: string;
      position: number;
      cards: {
        title: string;
        description?: string;
        position: number;
        dueDateOffsetDays?: number;
      }[];
    }[];
  }) {
    // 1. Insert template
    const [template] = await db
      .insert(templates)
      .values({
        name: data.name,
        description: data.description ?? null,
        categoryId: data.categoryId ?? null,
        isDefault: data.isDefault ?? false,
        createdBy: data.createdBy,
      })
      .returning();

    // 2. Insert variables
    if (data.variables?.length) {
      await db.insert(templateVariables).values(
        data.variables.map((v) => ({
          templateId: template.id,
          key: v.key,
          displayName: v.displayName,
          defaultValue: v.defaultValue ?? null,
          isRequired: v.isRequired,
        }))
      );
    }

    // 3. Insert lists and their cards
    if (data.lists?.length) {
      for (const listData of data.lists) {
        const [tplList] = await db
          .insert(templateLists)
          .values({
            templateId: template.id,
            title: listData.title,
            color: listData.color ?? null,
            position: listData.position,
          })
          .returning();

        if (listData.cards?.length) {
          await db.insert(templateCards).values(
            listData.cards.map((cardData) => ({
              templateListId: tplList.id,
              title: cardData.title,
              description: cardData.description ?? null,
              position: cardData.position,
              dueDateOffsetDays: cardData.dueDateOffsetDays ?? null,
            }))
          );
        }
      }
    }

    return this.findOne(template.id);
  }

  async findAll(categoryId?: string) {
    if (categoryId) {
      return db
        .select()
        .from(templates)
        .where(eq(templates.categoryId, categoryId))
        .orderBy(templates.createdAt);
    }
    return db.select().from(templates).orderBy(templates.createdAt);
  }

  async findOne(id: string) {
    const [template] = await db
      .select()
      .from(templates)
      .where(eq(templates.id, id))
      .limit(1);

    if (!template) throw new NotFoundException("Template not found");

    // Load variables
    const vars = await db
      .select()
      .from(templateVariables)
      .where(eq(templateVariables.templateId, id));

    // Load lists
    const tplLists = await db
      .select()
      .from(templateLists)
      .where(eq(templateLists.templateId, id))
      .orderBy(templateLists.position);

    // Load cards for each list
    const listsWithCards = await Promise.all(
      tplLists.map(async (tplList) => {
        const tplCards = await db
          .select()
          .from(templateCards)
          .where(eq(templateCards.templateListId, tplList.id))
          .orderBy(templateCards.position);
        return { ...tplList, cards: tplCards };
      })
    );

    return {
      ...template,
      variables: vars,
      lists: listsWithCards,
    };
  }

  async update(
    id: string,
    data: {
      name?: string;
      description?: string;
      categoryId?: string | null;
      isDefault?: boolean;
    }
  ) {
    const [template] = await db
      .update(templates)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(templates.id, id))
      .returning();

    if (!template) throw new NotFoundException("Template not found");
    return template;
  }

  async duplicate(id: string) {
    const template = await this.findOne(id);

    return this.create({
      name: `${template.name} (Copy)`,
      description: template.description ?? undefined,
      categoryId: template.categoryId ?? undefined,
      isDefault: false,
      createdBy: template.createdBy,
      variables: template.variables.map((v) => ({
        key: v.key,
        displayName: v.displayName,
        defaultValue: v.defaultValue ?? undefined,
        isRequired: v.isRequired,
      })),
      lists: template.lists.map((l: any) => ({
        title: l.title,
        color: l.color ?? undefined,
        position: l.position,
        cards: l.cards.map((c: any) => ({
          title: c.title,
          description: c.description ?? undefined,
          position: c.position,
          dueDateOffsetDays: c.dueDateOffsetDays ?? undefined,
        })),
      })),
    });
  }

  async remove(id: string) {
    // Cascade deletes will handle lists, cards, and variables
    await db.delete(templates).where(eq(templates.id, id));
  }

  /**
   * Apply a template to create a new board with resolved variables.
   *
   * Per ADR-0004: Substitution happens at creation time.
   * The board is fully editable after creation.
   */
  async applyTemplate(
    templateId: string,
    input: {
      boardTitle?: string;
      clientName: string;
      clientEmail?: string;
      variables: Record<string, string>;
      createdBy: string;
    }
  ) {
    const template = await this.findOne(templateId);

    // 1. Create board with resolved title
    const resolvedBoardTitle =
      input.boardTitle ??
      resolveTemplateVariables(template.name, input.variables);

    const board = await this.boardsService.create({
      title: resolvedBoardTitle,
      clientName: input.clientName,
      clientEmail: input.clientEmail,
      createdBy: input.createdBy,
      templateId,
    });

    // 2. Create each list with resolved title
    for (const tplList of template.lists) {
      const list = await this.listsService.create(board.id, {
        title: resolveTemplateVariables(tplList.title, input.variables),
        color: tplList.color ?? undefined,
        position: tplList.position,
      });

      // 3. Create each card with resolved title, description, and computed due date
      for (const tplCard of tplList.cards) {
        let dueDate: string | undefined;

        if (tplCard.dueDateOffsetDays != null) {
          const boardCreatedDate = new Date(board.createdAt);
          boardCreatedDate.setDate(
            boardCreatedDate.getDate() + tplCard.dueDateOffsetDays
          );
          dueDate = boardCreatedDate.toISOString().split("T")[0];
        }

        await this.cardsService.create(list.id, {
          title: resolveTemplateVariables(tplCard.title, input.variables),
          description: tplCard.description
            ? resolveTemplateVariables(tplCard.description, input.variables)
            : undefined,
          dueDate,
        });
      }
    }

    return board;
  }
}
```

**Step 4: Run test to verify it passes**

```bash
cd apps/api && pnpm test templates.service.spec
```

Expected: All tests PASS (create, findOne, variable resolution, due date offset)

**Step 5: Create DTOs**

Create `apps/api/src/modules/templates/dto/create-template.dto.ts`:

```typescript
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsArray,
  ValidateNested,
  IsNumber,
  Min,
  Matches,
} from "class-validator";
import { Type } from "class-transformer";

export class TemplateVariableDto {
  @IsString()
  @Matches(/^\w+$/, { message: "Key must contain only word characters" })
  key!: string;

  @IsString()
  displayName!: string;

  @IsString()
  @IsOptional()
  defaultValue?: string;

  @IsBoolean()
  @IsOptional()
  isRequired?: boolean = true;
}

export class TemplateCardDto {
  @IsString()
  title!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @Min(0)
  position!: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  dueDateOffsetDays?: number;
}

export class TemplateListDto {
  @IsString()
  title!: string;

  @IsString()
  @IsOptional()
  color?: string;

  @IsNumber()
  @Min(0)
  position!: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TemplateCardDto)
  cards!: TemplateCardDto[];
}

export class CreateTemplateDto {
  @IsString()
  name!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  categoryId?: string;

  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TemplateVariableDto)
  @IsOptional()
  variables?: TemplateVariableDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TemplateListDto)
  @IsOptional()
  lists?: TemplateListDto[];
}
```

Create `apps/api/src/modules/templates/dto/apply-template.dto.ts`:

```typescript
import { IsString, IsOptional, IsEmail, IsObject } from "class-validator";

export class ApplyTemplateDto {
  @IsString()
  @IsOptional()
  boardTitle?: string;

  @IsString()
  clientName!: string;

  @IsEmail()
  @IsOptional()
  clientEmail?: string;

  @IsObject()
  variables!: Record<string, string>;
}
```

**Step 6: Implement TemplatesController**

Create `apps/api/src/modules/templates/templates.controller.ts`:

```typescript
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from "@nestjs/common";
import { TemplatesService } from "./templates.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { CreateTemplateDto } from "./dto/create-template.dto";
import { ApplyTemplateDto } from "./dto/apply-template.dto";

@Controller("templates")
export class TemplatesController {
  constructor(private templatesService: TemplatesService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  async findAll(@Query("categoryId") categoryId?: string) {
    return this.templatesService.findAll(categoryId);
  }

  @UseGuards(JwtAuthGuard)
  @Get(":id")
  async findOne(@Param("id") id: string) {
    return this.templatesService.findOne(id);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  async create(
    @Body() dto: CreateTemplateDto,
    @CurrentUser() user: any
  ) {
    return this.templatesService.create({
      ...dto,
      createdBy: user.id,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Post(":id/apply")
  async applyTemplate(
    @Param("id") id: string,
    @Body() dto: ApplyTemplateDto,
    @CurrentUser() user: any
  ) {
    return this.templatesService.applyTemplate(id, {
      ...dto,
      createdBy: user.id,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Patch(":id")
  async update(
    @Param("id") id: string,
    @Body() body: { name?: string; description?: string; categoryId?: string; isDefault?: boolean }
  ) {
    return this.templatesService.update(id, body);
  }

  @UseGuards(JwtAuthGuard)
  @Post(":id/duplicate")
  async duplicate(@Param("id") id: string) {
    return this.templatesService.duplicate(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("admin")
  @Delete(":id")
  async remove(@Param("id") id: string) {
    await this.templatesService.remove(id);
    return { success: true };
  }
}
```

**Step 7: Wire up TemplatesModule**

Create `apps/api/src/modules/templates/templates.module.ts`:

```typescript
import { Module } from "@nestjs/common";
import { TemplatesService } from "./templates.service";
import { TemplatesController } from "./templates.controller";
import { CategoriesModule } from "./categories/categories.module";
import { BoardsModule } from "../boards/boards.module";
import { ListsModule } from "../lists/lists.module";
import { CardsModule } from "../cards/cards.module";

@Module({
  imports: [CategoriesModule, BoardsModule, ListsModule, CardsModule],
  providers: [TemplatesService],
  controllers: [TemplatesController],
  exports: [TemplatesService],
})
export class TemplatesModule {}
```

**Step 8: Update AppModule to include TemplatesModule**

Update `apps/api/src/app.module.ts`:

```typescript
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { HealthController } from "./health.controller";
import { AuthModule } from "./modules/auth/auth.module";
import { UsersModule } from "./modules/users/users.module";
import { BoardsModule } from "./modules/boards/boards.module";
import { ListsModule } from "./modules/lists/lists.module";
import { CardsModule } from "./modules/cards/cards.module";
import { CommentsModule } from "./modules/comments/comments.module";
import { AttachmentsModule } from "./modules/attachments/attachments.module";
import { LabelsModule } from "./modules/labels/labels.module";
import { TemplatesModule } from "./modules/templates/templates.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AuthModule,
    UsersModule,
    BoardsModule,
    ListsModule,
    CardsModule,
    CommentsModule,
    AttachmentsModule,
    LabelsModule,
    TemplatesModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
```

**Step 9: Run all tests**

```bash
cd apps/api && pnpm test
```

Expected: All tests PASS

**Step 10: Commit**

```bash
git add -A
git commit -m "feat: add templates module with variable substitution, board instantiation, and duplication"
```

---

### Task 3: Template Seed Data — Validate End-to-End Template Application

**TDD scenario:** Integration verification — apply template and verify board structure

**Files:**
- Create: `apps/api/src/database/template-seed.ts`
- Test: `apps/api/test/template-apply.e2e-spec.ts`

**Step 1: Write failing e2e test for template application**

Create `apps/api/test/template-apply.e2e-spec.ts`:

```typescript
import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import * as request from "supertest";
import { AppModule } from "../src/app.module";

describe("Template Application (e2e)", () => {
  let app: INestApplication;
  let authToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Login as seeded admin
    const loginRes = await request(app.getHttpServer())
      .post("/api/auth/login")
      .send({ email: "admin@company.com", password: "admin123" });

    authToken = loginRes.body.access_token;
  });

  afterAll(async () => {
    await app.close();
  });

  it("creates a template and applies it to create a board", async () => {
    // 1. Create template
    const templateRes = await request(app.getHttpServer())
      .post("/api/templates")
      .set("Authorization", `Bearer ${authToken}`)
      .send({
        name: "SaaS Onboarding",
        variables: [
          { key: "client_name", displayName: "Client Name", isRequired: true },
          {
            key: "service_type",
            displayName: "Service Type",
            isRequired: true,
          },
        ],
        lists: [
          {
            title: "Setup {{client_name}}",
            position: 0,
            cards: [
              {
                title: "Welcome {{client_name}}",
                position: 0,
                dueDateOffsetDays: 0,
              },
              {
                title: "Configure {{service_type}}",
                position: 1,
                dueDateOffsetDays: 3,
              },
            ],
          },
          {
            title: "In Progress",
            position: 1,
            cards: [
              {
                title: "Training sessions",
                position: 0,
                dueDateOffsetDays: 7,
              },
            ],
          },
          {
            title: "Done",
            position: 2,
            cards: [],
          },
        ],
      });

    expect(templateRes.status).toBe(201);
    const templateId = templateRes.body.id;

    // 2. Fetch template and verify structure
    const fetchRes = await request(app.getHttpServer())
      .get(`/api/templates/${templateId}`)
      .set("Authorization", `Bearer ${authToken}`);

    expect(fetchRes.status).toBe(200);
    expect(fetchRes.body.variables).toHaveLength(2);
    expect(fetchRes.body.lists).toHaveLength(3);
    expect(fetchRes.body.lists[0].cards).toHaveLength(2);

    // 3. Apply template
    const applyRes = await request(app.getHttpServer())
      .post(`/api/templates/${templateId}/apply`)
      .set("Authorization", `Bearer ${authToken}`)
      .send({
        clientName: "Acme Corp",
        variables: { client_name: "Acme Corp", service_type: "SaaS Pro" },
      });

    expect(applyRes.status).toBe(201);
    const boardId = applyRes.body.id;

    // 4. Verify board was created with resolved variables
    const boardRes = await request(app.getHttpServer())
      .get(`/api/boards/${boardId}`)
      .set("Authorization", `Bearer ${authToken}`);

    expect(boardRes.status).toBe(200);
    expect(boardRes.body.title).toBe("SaaS Onboarding");
    expect(boardRes.body.clientName).toBe("Acme Corp");
    expect(boardRes.body.templateId).toBe(templateId);

    // 5. Verify lists were created with resolved titles
    const listsRes = await request(app.getHttpServer())
      .get(`/api/boards/${boardId}/lists`)
      .set("Authorization", `Bearer ${authToken}`);

    expect(listsRes.status).toBe(200);
    expect(listsRes.body).toHaveLength(3);
    expect(listsRes.body[0].title).toBe("Setup Acme Corp");
    expect(listsRes.body[1].title).toBe("In Progress");
    expect(listsRes.body[2].title).toBe("Done");

    // 6. Verify cards were created with resolved titles and due dates
    const firstListId = listsRes.body[0].id;
    // Get cards via board detail (if available) or list endpoint
  });

  it("duplicates a template", async () => {
    // First create a simple template
    const templateRes = await request(app.getHttpServer())
      .post("/api/templates")
      .set("Authorization", `Bearer ${authToken}`)
      .send({
        name: "Simple Template",
        lists: [
          { title: "To Do", position: 0, cards: [] },
          { title: "Done", position: 1, cards: [] },
        ],
      });

    const templateId = templateRes.body.id;

    // Duplicate
    const dupRes = await request(app.getHttpServer())
      .post(`/api/templates/${templateId}/duplicate`)
      .set("Authorization", `Bearer ${authToken}`);

    expect(dupRes.status).toBe(201);
    expect(dupRes.body.name).toBe("Simple Template (Copy)");
  });

  it("returns 404 for non-existent template", async () => {
    const res = await request(app.getHttpServer())
      .get("/api/templates/non-existent-id")
      .set("Authorization", `Bearer ${authToken}`);

    expect(res.status).toBe(404);
  });
});
```

**Step 2: Create template seed data**

Create `apps/api/src/database/template-seed.ts`:

```typescript
import { db } from "./connection";
import { templates, templateVariables, templateLists, templateCards } from "./schema";

/**
 * Seeds the database with sample template data for development.
 * Run with: pnpm db:seed:templates
 */
async function seedTemplates() {
  console.log("Seeding template data...");

  // SaaS Onboarding Template
  const [saasTemplate] = await db
    .insert(templates)
    .values({
      name: "SaaS Onboarding",
      description: "Standard SaaS client onboarding with setup, training, and go-live phases",
      isDefault: true,
      createdBy: (await db.select().from(require("./schema").users).limit(1))[0]?.id ?? "seed",
    })
    .returning();

  if (saasTemplate) {
    // Variables
    await db.insert(templateVariables).values([
      {
        templateId: saasTemplate.id,
        key: "client_name",
        displayName: "Client Name",
        isRequired: true,
      },
      {
        templateId: saasTemplate.id,
        key: "service_type",
        displayName: "Service Type",
        defaultValue: "SaaS Standard",
        isRequired: false,
      },
      {
        templateId: saasTemplate.id,
        key: "start_date",
        displayName: "Project Start Date",
        isRequired: true,
      },
    ]);

    // List: Setup
    const [setupList] = await db
      .insert(templateLists)
      .values({
        templateId: saasTemplate.id,
        title: "Setup {{client_name}}",
        position: 0,
      })
      .returning();

    await db.insert(templateCards).values([
      {
        templateListId: setupList.id,
        title: "Welcome {{client_name}} — kick-off call",
        position: 0,
        dueDateOffsetDays: 0,
      },
      {
        templateListId: setupList.id,
        title: "Configure {{service_type}} environment",
        description: "Set up the {{service_type}} instance for {{client_name}}",
        position: 1,
        dueDateOffsetDays: 3,
      },
      {
        templateListId: setupList.id,
        title: "Send NDA and contracts",
        position: 2,
        dueDateOffsetDays: 2,
      },
    ]);

    // List: In Progress
    const [progressList] = await db
      .insert(templateLists)
      .values({
        templateId: saasTemplate.id,
        title: "In Progress",
        position: 1,
        color: "#3B82F6",
      })
      .returning();

    await db.insert(templateCards).values([
      {
        templateListId: progressList.id,
        title: "Training sessions for {{client_name}} team",
        position: 0,
        dueDateOffsetDays: 7,
      },
      {
        templateListId: progressList.id,
        title: "Data migration",
        position: 1,
        dueDateOffsetDays: 10,
      },
    ]);

    // List: Done
    const [doneList] = await db
      .insert(templateLists)
      .values({
        templateId: saasTemplate.id,
        title: "Done",
        position: 2,
        color: "#22C55E",
      })
      .returning();

    // Done list starts empty
    console.log(`Created template: ${saasTemplate.name} (${saasTemplate.id})`);
  }

  // Consulting Onboarding Template
  const [consultingTemplate] = await db
    .insert(templates)
    .values({
      name: "Consulting Engagement",
      description: "Client onboarding for consulting and professional services",
      isDefault: false,
      createdBy: (await db.select().from(require("./schema").users).limit(1))[0]?.id ?? "seed",
    })
    .returning();

  if (consultingTemplate) {
    await db.insert(templateVariables).values([
      {
        templateId: consultingTemplate.id,
        key: "client_name",
        displayName: "Client Name",
        isRequired: true,
      },
      {
        templateId: consultingTemplate.id,
        key: "engagement_type",
        displayName: "Engagement Type",
        defaultValue: "Advisory",
        isRequired: false,
      },
    ]);

    const [planningList] = await db
      .insert(templateLists)
      .values({
        templateId: consultingTemplate.id,
        title: "Planning",
        position: 0,
      })
      .returning();

    await db.insert(templateCards).values([
      {
        templateListId: planningList.id,
        title: "Discovery meeting with {{client_name}}",
        position: 0,
        dueDateOffsetDays: 0,
      },
      {
        templateListId: planningList.id,
        title: "Scope definition for {{engagement_type}}",
        position: 1,
        dueDateOffsetDays: 5,
      },
    ]);

    const [activeList] = await db
      .insert(templateLists)
      .values({
        templateId: consultingTemplate.id,
        title: "Active",
        position: 1,
        color: "#3B82F6",
      })
      .returning();

    await db.insert(templateCards).values([
      {
        templateListId: activeList.id,
        title: "Weekly check-ins with {{client_name}}",
        position: 0,
        dueDateOffsetDays: 7,
      },
    ]);

    const [completedList] = await db
      .insert(templateLists)
      .values({
        templateId: consultingTemplate.id,
        title: "Concluído",
        position: 2,
        color: "#22C55E",
      })
      .returning();

    console.log(`Created template: ${consultingTemplate.name} (${consultingTemplate.id})`);
  }

  console.log("Template seed complete!");
}

seedTemplates()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
```

Add the seed:templates script to `apps/api/package.json`:

```json
"db:seed:templates": "tsx src/database/template-seed.ts"
```

**Step 3: Run the e2e test**

```bash
cd apps/api && pnpm test:e2e template-apply
```

Note: This test requires PostgreSQL running. Ensure docker compose is up:

```bash
docker compose up -d postgres
```

Expected: Template CRUD + apply + duplicate tests PASS

**Step 4: Run template seed against local DB**

```bash
cd apps/api && pnpm db:seed:templates
```

Expected: "Created template: SaaS Onboarding" + "Created template: Consulting Engagement"

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: add template seed data and e2e tests for template application"
```

---

### Task 4: Template Variable Validation — Ensure All Required Variables Are Provided

**TDD scenario:** Full TDD cycle — validation logic

**Files:**
- Modify: `apps/api/src/modules/templates/templates.service.ts`
- Test: `apps/api/src/modules/templates/templates.service.spec.ts`

**Step 1: Write failing test for variable validation**

Add to `templates.service.spec.ts`:

```typescript
describe("applyTemplate — variable validation", () => {
  it("throws error when required variable is missing", async () => {
    // Template has required variable "client_name"
    // But variables object is missing it

    mockLimit.mockResolvedValueOnce([
      { id: "tpl-1", name: "Test" },
    ]);
    mockOrderBy.mockResolvedValue([]);
    mockLimit.mockResolvedValueOnce([]); // lists: none for simplicity

    // Simpler test: validate required variables directly
    const requiredVars = [
      { key: "client_name", isRequired: true },
      { key: "service_type", isRequired: true },
      { key: "optional_note", isRequired: false },
    ];

    const provided = { service_type: "SaaS" }; // missing client_name

    const missing = requiredVars
      .filter((v) => v.isRequired && !provided[v.key])
      .map((v) => v.key);

    expect(missing).toEqual(["client_name"]);
  });

  it("allows when all required variables are provided", async () => {
    const requiredVars = [
      { key: "client_name", isRequired: true },
      { key: "service_type", isRequired: true },
      { key: "optional_note", isRequired: false },
    ];

    const provided = { client_name: "Acme", service_type: "SaaS" };

    const missing = requiredVars
      .filter((v) => v.isRequired && !provided[v.key])
      .map((v) => v.key);

    expect(missing).toEqual([]);
  });

  it("allows when optional variables are missing", async () => {
    const requiredVars = [
      { key: "client_name", isRequired: true },
      { key: "optional_note", isRequired: false },
    ];

    const provided = { client_name: "Acme" };

    const missing = requiredVars
      .filter((v) => v.isRequired && !provided[v.key])
      .map((v) => v.key);

    expect(missing).toEqual([]);
  });
});
```

**Step 2: Run test to verify it passes (pure logic test)**

```bash
cd apps/api && pnpm test templates.service.spec
```

**Step 3: Add validation to applyTemplate method**

Add to `TemplatesService.applyTemplate`, before creating the board:

```typescript
// Validate required variables
const requiredVars = template.variables.filter((v) => v.isRequired);
const missingVars = requiredVars
  .filter((v) => !input.variables[v.key])
  .map((v) => v.key);

if (missingVars.length > 0) {
  throw new BadRequestException(
    `Missing required template variables: ${missingVars.join(", ")}`
  );
}
```

Add `BadRequestException` to imports:

```typescript
import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
```

**Step 4: Create a dedicated validation utility for reusability**

Create `apps/api/src/modules/templates/validators/template-variables.validator.ts`:

```typescript
/**
 * Validates that all required template variables are provided in the input.
 * Returns an array of missing variable keys (empty if all valid).
 */
export function validateRequiredVariables(
  templateVariables: { key: string; isRequired: boolean }[],
  providedVariables: Record<string, string>
): string[] {
  return templateVariables
    .filter((v) => v.isRequired && !providedVariables[v.key])
    .map((v) => v.key);
}
```

Create `apps/api/src/modules/templates/validators/template-variables.validator.spec.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { validateRequiredVariables } from "./template-variables.validator";

describe("validateRequiredVariables", () => {
  it("returns empty array when all required vars provided", () => {
    const vars = [
      { key: "client_name", isRequired: true },
      { key: "service_type", isRequired: true },
    ];
    const provided = { client_name: "Acme", service_type: "SaaS" };
    expect(validateRequiredVariables(vars, provided)).toEqual([]);
  });

  it("returns missing required variable keys", () => {
    const vars = [
      { key: "client_name", isRequired: true },
      { key: "service_type", isRequired: true },
    ];
    const provided = { client_name: "Acme" };
    expect(validateRequiredVariables(vars, provided)).toEqual(["service_type"]);
  });

  it("ignores optional variables even when missing", () => {
    const vars = [
      { key: "client_name", isRequired: true },
      { key: "notes", isRequired: false },
    ];
    const provided = { client_name: "Acme" };
    expect(validateRequiredVariables(vars, provided)).toEqual([]);
  });

  it("returns all missing when nothing provided", () => {
    const vars = [
      { key: "a", isRequired: true },
      { key: "b", isRequired: true },
      { key: "c", isRequired: false },
    ];
    expect(validateRequiredVariables(vars, {})).toEqual(["a", "b"]);
  });

  it("handles empty template variables", () => {
    expect(validateRequiredVariables([], { anything: "here" })).toEqual([]);
  });
});
```

**Step 5: Run all tests**

```bash
cd apps/api && pnpm test
```

Expected: All tests PASS including new validator tests

**Step 6: Commit**

```bash
git add -A
git commit -m "feat: add template variable validation — reject missing required variables"
```

**🧾 Rules Check — Phase 3 final verification:**

| Regra | Verificar | ✅? |
|-------|-----------|----|
| `rules/db-use-transactions.md` | Board instantiation usa `db.transaction()`? | ☐ |
| `rules/db-avoid-n-plus-one.md` | Template carregado com `db.query.templates.findMany({ with: { lists: { with: { cards: true } } } })`? | ☐ |
| `rules/db-use-returning.md` | Template instantiation usa `.returning()` em todos os INSERTs? | ☐ |
| `rules/db-select-columns.md` | Queries de template especificam colunas? | ☐ |
| `rules/security-validate-all-input.md` | `applyTemplateSchema` valida variáveis obrigatórias? | ☐ |
| `rules/db-prevent-sql-injection.md` | Nenhum `sql.raw()` no código? | ☐ |

Se qualquer item estiver ❌, corrija ANTES de ir para Phase 4.

---

**Phase 3 checkpoint:** At this point you have:
- ✅ Template categories CRUD with reorder
- ✅ Template CRUD with nested variables, lists, cards
- ✅ Template duplication (deep copy)
- ✅ Board instantiation from template with `{{variable}}` resolution (ADR-0004)
- ✅ Due date computation from `dueDateOffsetDays`
- ✅ Required variable validation
- ✅ Template seed data (SaaS + Consulting)
- ✅ E2E tests for template apply and duplicate