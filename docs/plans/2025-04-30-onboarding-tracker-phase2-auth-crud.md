# Phase 2: Auth + Core CRUD — Implementation Plan

> **REQUIRED SUB-SKILL:** Use the executing-plans skill to implement this plan task-by-task.

**Goal:** Implement authentication (JWT + public token), and full CRUD for boards, lists, cards with drag-and-drop, comments, attachments, and labels.

**Architecture:** NestJS modular backend with AuthModule, BoardsModule, ListsModule, CardsModule, CommentsModule, AttachmentsModule, LabelsModule. Each module follows service-controller pattern. Auth uses JWT strategy + public token guard. Cards module includes the critical completion-detection business rule.

**Tech Stack:** NestJS 11, Drizzle ORM, Passport JWT, bcrypt, AWS S3 SDK, @onboarding-tracker/shared

**Depends on:** Phase 1 (Foundation) complete
**Rules Hub:** `docs/plans/IMPLEMENTATION-HUB.md`

---

## 🏛️ CONSTITUIÇÃO DO BANCO DE DADOS — OBRIGATÓRIO NESTA PHASE

> Phase 2 cria TODOS os services que acessam o banco. O agente DEVE seguir estas regras.
> Referência completa: `docs/plans/IMPLEMENTATION-HUB.md` e `rules/`

```
1. NUNCA use sql.raw() com interpolação — use sql`` template tag ou query builder
2. NUNCA faça queries em loop (N+1) — usar db.query com with ou JOINs
3. TODA coluna FK DEVE ter index() explícito no schema
4. Sempre use .returning() em INSERT e UPDATE
5. Especifique colunas no SELECT — nunca select all
6. Valide input com zod ANTES de ir pro banco
7. Use transações para operações multi-step
8. Nunca exponha erros de banco ao client — traduz para HTTP errors
9. Sempre filtre por organizationId do auth context
10. Soft delete: deletedAt em tabelas de usuário, nunca db.delete()
11. TODA operação que altera card/board DEVE criar activity log em `board_activities`
12. Webhook payloads DEVEM incluir `idempotency_key` (UUID) para deduplicação
13. Rotas internas DEVEM usar publicId em vez de UUID (quando publicId existir)
```

**Rules desta phase:**
- `rules/db-prevent-sql-injection.md` → Nunca sql.raw()
- `rules/db-avoid-n-plus-one.md` → db.query com `with`, JOINs, batch
- `rules/db-use-returning.md` → .returning() em INSERT/UPDATE
- `rules/db-select-columns.md` → Nunca SELECT *
- `rules/db-use-transactions.md` → db.transaction() para operações multi-step
- `rules/db-soft-deletes.md` → Soft delete pattern
- `rules/arch-use-repository-pattern.md` → Repository encapsula queries
- `rules/security-validate-all-input.md` → Zod + pipes
- `rules/api-use-dto-serialization.md` → Response DTOs, nunca expor entities
- `rules/security-use-guards.md` → Guards JWT + roles
- `rules/security-auth-jwt.md` → JWT seguro
- `rules/error-throw-http-exceptions.md` → Throw do service, não return error
- `rules/error-use-exception-filters.md` → Exception filters globais

### ⚠️ Anti-padrões que o agente FREQUENTEMENTE gera nesta phase:

```typescript
// ❌ N+1 — O agente vai tentar fazer isso no BoardsService.getStats:
const boards = await db.select().from(boardsTable);
for (const board of boards) {
  board.stats = await this.getStats(board.id); // N+1!
}

// ✅ CORRETO — Uma query com agregação:
const stats = await db.select({
  boardId: boards.id,
  totalCards: sql<number>`count(${cards.id})`,
  completedCards: sql<number>`count(${cards.id}) filter (where ${cards.completedAt} is not null)`,
}).from(boards).leftJoin(lists, eq(boards.id, lists.boardId))
  .leftJoin(cards, eq(lists.id, cards.listId))
  .groupBy(boards.id);
```

```typescript
// ❌ Expor entity do banco — O agente vai tentar retornar user com passwordHash:
return db.select().from(users).where(eq(users.id, id));

// ✅ CORRETO — Response DTO sem campos sensíveis:
return db.select({
  id: users.id, email: users.email, displayName: users.displayName, role: users.role,
}).from(users).where(eq(users.id, id));
```

---

### Task 1: Auth Module — JWT + Public Token Guard

**TDD scenario:** New feature — full TDD cycle

**Files:**
- Create: `apps/api/src/modules/auth/auth.module.ts`
- Create: `apps/api/src/modules/auth/auth.service.ts`
- Create: `apps/api/src/modules/auth/auth.controller.ts`
- Create: `apps/api/src/modules/auth/strategies/jwt.strategy.ts`
- Create: `apps/api/src/modules/auth/guards/jwt-auth.guard.ts`
- Create: `apps/api/src/modules/auth/guards/public-board.guard.ts`
- Create: `apps/api/src/modules/auth/guards/roles.guard.ts`
- Create: `apps/api/src/modules/auth/decorators/current-user.decorator.ts`
- Create: `apps/api/src/modules/auth/decorators/roles.decorator.ts`
- Create: `apps/api/src/modules/auth/decorators/public-path.decorator.ts`
- Create: `apps/api/src/modules/users/users.module.ts`
- Create: `apps/api/src/modules/users/users.service.ts`
- Create: `apps/api/src/modules/users/users.controller.ts`
- Test: `apps/api/src/modules/auth/auth.service.spec.ts`
- Test: `apps/api/src/modules/auth/auth.controller.spec.ts`

**Step 1: Write failing test for AuthService.validateUser**

```typescript
// apps/api/src/modules/auth/auth.service.spec.ts
import { Test, TestingModule } from "@nestjs/testing";
import { AuthService } from "./auth.service";
import { UsersService } from "../users/users.service";
import { JwtService } from "@nestjs/jwt";
import { UnauthorizedException } from "@nestjs/common";
import * as bcrypt from "bcrypt";

describe("AuthService", () => {
  let service: AuthService;
  let usersService: Partial<Record<keyof UsersService, jest.Mock>>;
  let jwtService: Partial<Record<string, jest.Mock>>;

  beforeEach(async () => {
    usersService = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
    };
    jwtService = {
      sign: jest.fn().mockReturnValue("test-jwt-token"),
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

  describe("validateUser", () => {
    it("returns user (without password) when credentials valid", async () => {
      const hash = await bcrypt.hash("password123", 10);
      usersService.findByEmail!.mockResolvedValue({
        id: "1",
        email: "test@test.com",
        passwordHash: hash,
        displayName: "Test",
        role: "admin",
      });

      const result = await service.validateUser("test@test.com", "password123");
      expect(result).toMatchObject({
        id: "1",
        email: "test@test.com",
        displayName: "Test",
        role: "admin",
      });
      expect(result).not.toHaveProperty("passwordHash");
    });

    it("throws Unauthorized when password wrong", async () => {
      const hash = await bcrypt.hash("password123", 10);
      usersService.findByEmail!.mockResolvedValue({
        id: "1",
        email: "test@test.com",
        passwordHash: hash,
        displayName: "Test",
        role: "admin",
      });

      await expect(
        service.validateUser("test@test.com", "wrong")
      ).rejects.toThrow(UnauthorizedException);
    });

    it("throws Unauthorized when user not found", async () => {
      usersService.findByEmail!.mockResolvedValue(null);

      await expect(
        service.validateUser("no@user.com", "pass")
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe("login", () => {
    it("returns access token with user payload", async () => {
      const user = { id: "1", email: "test@test.com", role: "admin" };
      const result = await service.login(user as any);

      expect(result.access_token).toBe("test-jwt-token");
      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: "1",
        email: "test@test.com",
        role: "admin",
      });
    });
  });
});
```

**Step 2: Run test to verify it fails**

```bash
cd apps/api && pnpm test auth.service.spec
```

Expected: FAIL — module not found

**Step 3: Implement UsersService (minimal)**

Create `apps/api/src/modules/users/users.service.ts`:

```typescript
import { Injectable } from "@nestjs/common";
import { eq } from "drizzle-orm";
import { db } from "../../database/connection";
import { users } from "../../database/schema";

@Injectable()
export class UsersService {
  async findByEmail(email: string) {
    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    return user ?? null;
  }

  async findById(id: string) {
    const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return user ?? null;
  }

  async create(data: { email: string; passwordHash: string; displayName: string; role: string }) {
    const [user] = await db.insert(users).values(data).returning();
    return user;
  }

  async findAll() {
    return db.select({
      id: users.id,
      email: users.email,
      displayName: users.displayName,
      avatarUrl: users.avatarUrl,
      role: users.role,
      createdAt: users.createdAt,
    }).from(users);
  }

  async updateRole(id: string, role: string) {
    const [user] = await db.update(users).set({ role }).where(eq(users.id, id)).returning();
    return user;
  }

  async remove(id: string) {
    await db.delete(users).where(eq(users.id, id));
  }
}
```

**Step 4: Implement AuthService**

Create `apps/api/src/modules/auth/auth.service.ts`:

```typescript
import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import { UsersService } from "../users/users.service";

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async validateUser(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException("Invalid credentials");
    }
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException("Invalid credentials");
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, ...result } = user;
    return result;
  }

  async login(user: { id: string; email: string; role: string }) {
    const payload = { sub: user.id, email: user.email, role: user.role };
    return {
      access_token: this.jwtService.sign(payload),
      user,
    };
  }
}
```

**Step 5: Run test to verify it passes**

```bash
cd apps/api && pnpm test auth.service.spec
```

Expected: 4 tests PASS

**Step 6: Implement JWT Strategy**

Create `apps/api/src/modules/auth/strategies/jwt.strategy.ts`:

```typescript
import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET!,
    });
  }

  async validate(payload: { sub: string; email: string; role: string }) {
    return { id: payload.sub, email: payload.email, role: payload.role };
  }
}
```

**Step 7: Implement guards**

Create `apps/api/src/modules/auth/guards/jwt-auth.guard.ts`:

```typescript
import { Injectable } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";

@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {}
```

Create `apps/api/src/modules/auth/guards/public-board.guard.ts`:

```typescript
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Request } from "express";
import { db } from "../../../database/connection";
import { boards } from "../../../database/schema";
import { eq } from "drizzle-orm";

@Injectable()
export class PublicBoardGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = request.params.token;

    if (!token) {
      throw new NotFoundException("Board not found");
    }

    const [board] = await db
      .select()
      .from(boards)
      .where(eq(boards.publicToken, token))
      .limit(1);

    if (!board) {
      throw new NotFoundException("Board not found");
    }

    // Attach board to request for controller to use
    (request as any).publicBoard = board;
    return true;
  }
}
```

Create `apps/api/src/modules/auth/guards/roles.guard.ts`:

```typescript
import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ROLES_KEY } from "../decorators/roles.decorator";

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !requiredRoles.includes(user.role)) {
      throw new ForbiddenException("Insufficient permissions");
    }

    return true;
  }
}
```

**Step 8: Implement decorators**

Create `apps/api/src/modules/auth/decorators/current-user.decorator.ts`:

```typescript
import { createParamDecorator, ExecutionContext } from "@nestjs/common";

export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;
    return data ? user?.[data] : user;
  }
);
```

Create `apps/api/src/modules/auth/decorators/roles.decorator.ts`:

```typescript
import { SetMetadata } from "@nestjs/common";

export const ROLES_KEY = "roles";
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
```

Create `apps/api/src/modules/auth/decorators/public-path.decorator.ts`:

```typescript
import { SetMetadata } from "@nestjs/common";

export const IS_PUBLIC_KEY = "isPublic";
export const PublicPath = () => SetMetadata(IS_PUBLIC_KEY, true);
```

**Step 9: Implement AuthController**

Create `apps/api/src/modules/auth/auth.controller.ts`:

```typescript
import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { CurrentUser } from "./decorators/current-user.decorator";

@Controller("auth")
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post("login")
  async login(
    @Body() body: { email: string; password: string }
  ) {
    const user = await this.authService.validateUser(body.email, body.password);
    return this.authService.login(user);
  }

  @UseGuards(JwtAuthGuard)
  @Get("me")
  async getMe(@CurrentUser() user: any) {
    const { passwordHash, ...result } = user;
    return result;
  }
}
```

**Step 10: Wire up AuthModule + UsersModule**

Create `apps/api/src/modules/users/users.module.ts`:

```typescript
import { Module } from "@nestjs/common";
import { UsersService } from "./users.service";
import { UsersController } from "./users.controller";

@Module({
  providers: [UsersService],
  controllers: [UsersController],
  exports: [UsersService],
})
export class UsersModule {}
```

Create `apps/api/src/modules/users/users.controller.ts`:

```typescript
import { Controller, Get, Post, UseGuards, Body, Param, Delete, Patch } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { UsersService } from "./users.service";
import * as bcrypt from "bcrypt";

@Controller("users")
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  async findAll() {
    return this.usersService.findAll();
  }

  @Post()
  @Roles("admin")
  async create(
    @Body() body: { email: string; displayName: string; role: string; password?: string }
  ) {
    const passwordHash = await bcrypt.hash(body.password ?? "changeme123", 10);
    return this.usersService.create({
      email: body.email,
      passwordHash,
      displayName: body.displayName,
      role: body.role,
    });
  }

  @Patch(":id/role")
  @Roles("admin")
  async updateRole(@Param("id") id: string, @Body() body: { role: string }) {
    return this.usersService.updateRole(id, body.role);
  }

  @Delete(":id")
  @Roles("admin")
  async remove(@Param("id") id: string) {
    await this.usersService.remove(id);
    return { success: true };
  }
}
```

Create `apps/api/src/modules/auth/auth.module.ts`:

```typescript
import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { AuthService } from "./auth.service";
import { AuthController } from "./auth.controller";
import { JwtStrategy } from "./strategies/jwt.strategy";
import { UsersModule } from "../users/users.module";

@Module({
  imports: [
    UsersModule,
    PassportModule.register({ defaultStrategy: "jwt" }),
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: "24h" },
    }),
  ],
  providers: [AuthService, JwtStrategy],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
```

**Step 11: Update AppModule to include new modules**

Update `apps/api/src/app.module.ts`:

```typescript
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { HealthController } from "./health.controller";
import { AuthModule } from "./modules/auth/auth.module";
import { UsersModule } from "./modules/users/users.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AuthModule,
    UsersModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
```

**Step 12: Run all tests**

```bash
cd apps/api && pnpm test
```

Expected: All auth + e2e tests PASS

**Step 13: Commit**

```bash
git add -A
git commit -m "feat: add auth module with JWT, public board guard, roles, and user management"
```

---

### Task 2: Boards Module — CRUD + Public Access + Stats

**TDD scenario:** New feature — full TDD cycle

**Files:**
- Create: `apps/api/src/modules/boards/boards.module.ts`
- Create: `apps/api/src/modules/boards/boards.service.ts`
- Create: `apps/api/src/modules/boards/boards.controller.ts`
- Create: `apps/api/src/modules/boards/dto/create-board.dto.ts`
- Test: `apps/api/src/modules/boards/boards.service.spec.ts`

**Step 1: Write failing test for BoardsService**

```typescript
// apps/api/src/modules/boards/boards.service.spec.ts
import { Test, TestingModule } from "@nestjs/testing";
import { BoardsService } from "./boards.service";
import { db } from "../../database/connection";
import { boards } from "../../database/schema";
import { eq, ilike, or, and, sql } from "drizzle-orm";

// Mock db
jest.mock("../../database/connection", () => ({
  db: {
    select: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    values: jest.fn().mockReturnThis(),
    returning: jest.fn(),
    update: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    delete: jest.fn(),
  },
}));

describe("BoardsService", () => {
  let service: BoardsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BoardsService],
    }).compile();

    service = module.get<BoardsService>(BoardsService);
  });

  describe("create", () => {
    it("creates a board with auto-generated slug and public token", async () => {
      const mockReturning = jest.fn().mockResolvedValue([{
        id: "1",
        title: "Test Board",
        slug: "test-board",
        publicToken: "abc123token",
        clientName: "Acme",
        status: "active",
      }]);

      (db.insert as jest.Mock).mockReturnValue({
        values: jest.fn().mockReturnValue({
          returning: mockReturning,
        }),
      });

      const result = await service.create({
        title: "Test Board",
        clientName: "Acme",
        createdBy: "user-1",
      });

      expect(result.title).toBe("Test Board");
      expect(result.slug).toBeTruthy();
      expect(result.publicToken).toBeTruthy();
    });
  });

  describe("findOne", () => {
    it("returns a board by id", async () => {
      const mockLimit = jest.fn().mockResolvedValue([{ id: "1", title: "Test" }]);
      const mockWhere = jest.fn().mockReturnValue({ limit: mockLimit });
      const mockFrom = jest.fn().mockReturnValue({ where: mockWhere });

      (db.select as jest.Mock).mockReturnValue({ from: mockFrom });

      const result = await service.findOne("1");
      expect(result).toBeDefined();
      expect(result.id).toBe("1");
    });
  });

  describe("findByPublicToken", () => {
    it("returns a board by public token", async () => {
      const mockLimit = jest.fn().mockResolvedValue([{
        id: "1",
        title: "Client Board",
        publicToken: "abc123",
      }]);
      const mockWhere = jest.fn().mockReturnValue({ limit: mockLimit });
      const mockFrom = jest.fn().mockReturnValue({ where: mockWhere });

      (db.select as jest.Mock).mockReturnValue({ from: mockFrom });

      const result = await service.findByPublicToken("abc123");
      expect(result).toBeDefined();
      expect(result.publicToken).toBe("abc123");
    });
  });
});
```

**Step 2: Run test — fails**

```bash
cd apps/api && pnpm test boards.service.spec
```

**Step 3: Implement BoardsService**

Create `apps/api/src/modules/boards/boards.service.ts`:

```typescript
import { Injectable, NotFoundException } from "@nestjs/common";
import { eq, ilike, and, sql } from "drizzle-orm";
import { db } from "../../database/connection";
import { boards, lists, cards } from "../../database/schema";
import { generateSlug } from "@onboarding-tracker/shared";
import * as crypto from "crypto";

@Injectable()
export class BoardsService {
  async create(data: {
    title: string;
    clientName: string;
    clientEmail?: string;
    description?: string;
    createdBy: string;
    templateId?: string;
  }) {
    const slug = generateSlug(data.title) + "-" + crypto.randomBytes(2).toString("hex");
    const publicToken = crypto.randomBytes(24).toString("hex");

    const [board] = await db
      .insert(boards)
      .values({
        title: data.title,
        description: data.description ?? null,
        slug,
        publicToken,
        clientName: data.clientName,
        clientEmail: data.clientEmail ?? null,
        createdBy: data.createdBy,
        templateId: data.templateId ?? null,
      })
      .returning();

    return board;
  }

  async findAll(filters?: { status?: string; search?: string }) {
    let query = db.select().from(boards);

    if (filters?.status) {
      query = query.where(eq(boards.status, filters.status)) as any;
    }

    if (filters?.search) {
      query = query.where(
        ilike(boards.clientName, `%${filters.search}%`)
      ) as any;
    }

    return query.orderBy(boards.createdAt);
  }

  async findOne(id: string) {
    const [board] = await db.select().from(boards).where(eq(boards.id, id)).limit(1);
    if (!board) throw new NotFoundException("Board not found");
    return board;
  }

  async findByPublicToken(token: string) {
    const [board] = await db.select().from(boards).where(eq(boards.publicToken, token)).limit(1);
    if (!board) throw new NotFoundException("Board not found");
    return board;
  }

  async update(id: string, data: Partial<typeof boards.$inferInsert>) {
    const [board] = await db
      .update(boards)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(boards.id, id))
      .returning();
    if (!board) throw new NotFoundException("Board not found");
    return board;
  }

  async regenerateToken(id: string) {
    const newToken = crypto.randomBytes(24).toString("hex");
    return this.update(id, { publicToken: newToken });
  }

  async getStats(id: string) {
    const totalCards = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(cards)
      .innerJoin(lists, eq(cards.listId, lists.id))
      .where(eq(lists.boardId, id));

    const completedCards = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(cards)
      .innerJoin(lists, eq(cards.listId, lists.id))
      .where(
        and(eq(lists.boardId, id), sql`${cards.completedAt} IS NOT NULL`)
      );

    const total = totalCards[0]?.count ?? 0;
    const completed = completedCards[0]?.count ?? 0;

    return {
      totalCards: total,
      completedCards: completed,
      completionPercentage: total === 0 ? 0 : Math.round((completed / total) * 100),
    };
  }
}
```

**Step 4: Run test — passes**

```bash
cd apps/api && pnpm test boards.service.spec
```

**Step 5: Implement BoardsController with all endpoints**

Create `apps/api/src/modules/boards/boards.controller.ts`:

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
import { BoardsService } from "./boards.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { PublicBoardGuard } from "../auth/guards/public-board.guard";

@Controller("boards")
export class BoardsController {
  constructor(private boardsService: BoardsService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  async findAll(@Query() query: { status?: string; search?: string }) {
    return this.boardsService.findAll(query);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  async create(
    @Body() body: { title: string; clientName: string; clientEmail?: string; description?: string },
    @CurrentUser() user: any
  ) {
    return this.boardsService.create({
      ...body,
      createdBy: user.id,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Get("stats")
  async getDashboard() {
    // Dashboard stats are in a separate module, this is per-board stats
    return { message: "Use /dashboard/stats for aggregate metrics" };
  }

  @UseGuards(JwtAuthGuard)
  @Get(":id")
  async findOne(@Param("id") id: string) {
    return this.boardsService.findOne(id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(":id")
  async update(@Param("id") id: string, @Body() body: any) {
    return this.boardsService.update(id, body);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("admin")
  @Delete(":id")
  async remove(@Param("id") id: string) {
    await this.boardsService.update(id, { status: "archived" });
    return { success: true };
  }

  @UseGuards(JwtAuthGuard)
  @Patch(":id/regenerate-token")
  async regenerateToken(@Param("id") id: string) {
    const board = await this.boardsService.regenerateToken(id);
    return { publicToken: board.publicToken };
  }

  @UseGuards(JwtAuthGuard)
  @Get(":id/stats")
  async getStats(@Param("id") id: string) {
    return this.boardsService.getStats(id);
  }

  // PUBLIC ENDPOINT — no JWT required
  @UseGuards(PublicBoardGuard)
  @Get("public/:token")
  async findByPublicToken(@Param("token") token: string) {
    return this.boardsService.findByPublicToken(token);
  }
}
```

**Step 6: Wire up BoardsModule**

Create `apps/api/src/modules/boards/boards.module.ts`:

```typescript
import { Module } from "@nestjs/common";
import { BoardsService } from "./boards.service";
import { BoardsController } from "./boards.controller";

@Module({
  providers: [BoardsService],
  controllers: [BoardsController],
  exports: [BoardsService],
})
export class BoardsModule {}
```

**Step 7: Update AppModule**

**Step 8: Run all tests**

```bash
cd apps/api && pnpm test
```

**Step 9: Commit**

```bash
git add -A
git commit -m "feat: add boards module with CRUD, public access, and stats"
```

---

### Task 3: Lists + Cards Modules (Core CRUD + Completion Detection)

**TDD scenario:** Full TDD cycle — critical business logic

**Files:**
- Create: `apps/api/src/modules/lists/lists.module.ts`, `lists.service.ts`, `lists.controller.ts`
- Create: `apps/api/src/modules/cards/cards.module.ts`, `cards.service.ts`, `cards.controller.ts`
- Test: `apps/api/src/modules/cards/cards.service.spec.ts`

**Step 1: Write failing test for CardsService.moveCard + completion detection**

```typescript
// apps/api/src/modules/cards/cards.service.spec.ts
import { isCompletionList } from "@onboarding-tracker/shared";

describe("Completion Detection Integration", () => {
  it("recognizes 'Done' as a completion list title", () => {
    expect(isCompletionList("Done")).toBe(true);
  });

  it("recognizes 'In Progress' as NOT a completion list", () => {
    expect(isCompletionList("In Progress")).toBe(false);
  });

  it("recognizes 'Finalizado' as a completion list (Portuguese)", () => {
    expect(isCompletionList("Finalizado")).toBe(true);
  });
});

// Additional integration tests for moveCard behavior
// would be in cards.service.spec.ts with proper db mocking
```

**Step 2: Run test — passes (uses shared utility)**

```bash
cd apps/api && pnpm test cards.service.spec
```

Expected: The shared utility tests pass since we already tested `isCompletionList` in Phase 1.

**Step 3: Implement ListsService**

Create `apps/api/src/modules/lists/lists.service.ts`:

```typescript
import { Injectable, NotFoundException } from "@nestjs/common";
import { eq, and } from "drizzle-orm";
import { db } from "../../database/connection";
import { lists } from "../../database/schema";
import { boards } from "../../database/schema";

@Injectable()
export class ListsService {
  async create(boardId: string, data: { title: string; color?: string; position?: number }) {
    const [list] = await db
      .insert(lists)
      .values({
        boardId,
        title: data.title,
        color: data.color ?? null,
        position: data.position ?? 0,
      })
      .returning();
    return list;
  }

  async findByBoard(boardId: string) {
    return db
      .select()
      .from(lists)
      .where(eq(lists.boardId, boardId))
      .orderBy(lists.position);
  }

  async update(id: string, data: { title?: string; color?: string; position?: number }) {
    const [list] = await db
      .update(lists)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(lists.id, id))
      .returning();
    if (!list) throw new NotFoundException("List not found");
    return list;
  }

  async remove(id: string) {
    await db.delete(lists).where(eq(lists.id, id));
  }

  async reorder(boardId: string, items: { id: string; position: number }[]) {
    for (const item of items) {
      await db
        .update(lists)
        .set({ position: item.position })
        .where(and(eq(lists.id, item.id), eq(lists.boardId, boardId)));
    }
  }
}
```

**Step 4: Implement ListsController**

Create `apps/api/src/modules/lists/lists.controller.ts`:

```typescript
import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { ListsService } from "./lists.service";

@UseGuards(JwtAuthGuard)
@Controller("boards/:boardId/lists")
export class ListsController {
  constructor(private listsService: ListsService) {}

  @Post()
  async create(@Param("boardId") boardId: string, @Body() body: any) {
    return this.listsService.create(boardId, body);
  }

  @Get()
  async findAll(@Param("boardId") boardId: string) {
    return this.listsService.findByBoard(boardId);
  }

  @Patch("reorder")
  async reorder(@Param("boardId") boardId: string, @Body() body: { items: { id: string; position: number }[] }) {
    await this.listsService.reorder(boardId, body.items);
    return { success: true };
  }

  @Patch(":id")
  async update(@Param("id") id: string, @Body() body: any) {
    return this.listsService.update(id, body);
  }

  @Delete(":id")
  async remove(@Param("id") id: string) {
    await this.listsService.remove(id);
    return { success: true };
  }
}
```

**Step 5: Implement CardsService with completion detection**

Create `apps/api/src/modules/cards/cards.service.ts`:

```typescript
import { Injectable, NotFoundException } from "@nestjs/common";
import { eq, and } from "drizzle-orm";
import { db } from "../../database/connection";
import { cards, lists } from "../../database/schema";
import { isCompletionList } from "@onboarding-tracker/shared";

@Injectable()
export class CardsService {
  async create(listId: string, data: { title: string; description?: string; dueDate?: string }) {
    const [card] = await db
      .insert(cards)
      .values({
        listId,
        title: data.title,
        description: data.description ?? null,
        dueDate: data.dueDate ?? null,
      })
      .returning();
    return card;
  }

  async findByList(listId: string) {
    return db.select().from(cards).where(eq(cards.listId, listId)).orderBy(cards.position);
  }

  async findOne(id: string) {
    const [card] = await db.select().from(cards).where(eq(cards.id, id)).limit(1);
    if (!card) throw new NotFoundException("Card not found");
    return card;
  }

  async update(id: string, data: { title?: string; description?: string; dueDate?: string | null }) {
    const [card] = await db
      .update(cards)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(cards.id, id))
      .returning();
    if (!card) throw new NotFoundException("Card not found");
    return card;
  }

  async moveCard(id: string, listId: string, position: number) {
    // Get the card and the target list
    const [card] = await db.select().from(cards).where(eq(cards.id, id)).limit(1);
    if (!card) throw new NotFoundException("Card not found");

    const [targetList] = await db.select().from(lists).where(eq(lists.id, listId)).limit(1);
    if (!targetList) throw new NotFoundException("Target list not found");

    // Determine if moving to/from a completion list
    let completedAt: Date | null = card.completedAt;

    if (isCompletionList(targetList.title)) {
      // Moving INTO a completion list → mark as completed
      completedAt = new Date();
    } else if (card.completedAt) {
      // Moving OUT of a completion list → un-complete
      completedAt = null;
    }

    const [updated] = await db
      .update(cards)
      .set({ listId, position, completedAt, updatedAt: new Date() })
      .where(eq(cards.id, id))
      .returning();

    return updated;
  }

  async remove(id: string) {
    await db.delete(cards).where(eq(cards.id, id));
  }

  async reorder(listId: string, items: { id: string; position: number }[]) {
    for (const item of items) {
      await db
        .update(cards)
        .set({ position: item.position })
        .where(and(eq(cards.id, item.id), eq(cards.listId, listId)));
    }
  }
}
```

**Step 6: Implement CardsController**

Create `apps/api/src/modules/cards/cards.controller.ts`:

```typescript
import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CardsService } from "./cards.service";

@UseGuards(JwtAuthGuard)
@Controller()
export class CardsController {
  constructor(private cardsService: CardsService) {}

  @Post("lists/:listId/cards")
  async create(@Param("listId") listId: string, @Body() body: any) {
    return this.cardsService.create(listId, body);
  }

  @Get("cards/:id")
  async findOne(@Param("id") id: string) {
    return this.cardsService.findOne(id);
  }

  @Patch("cards/:id")
  async update(@Param("id") id: string, @Body() body: any) {
    return this.cardsService.update(id, body);
  }

  @Patch("cards/:id/move")
  async move(@Param("id") id: string, @Body() body: { listId: string; position: number }) {
    return this.cardsService.moveCard(id, body.listId, body.position);
  }

  @Delete("cards/:id")
  async remove(@Param("id") id: string) {
    await this.cardsService.remove(id);
    return { success: true };
  }

  @Patch("boards/:boardId/cards/reorder")
  async reorder(@Body() body: { listId: string; items: { id: string; position: number }[] }) {
    await this.cardsService.reorder(body.listId, body.items);
    return { success: true };
  }
}
```

**Step 7: Wire up modules + update AppModule**

Create `apps/api/src/modules/lists/lists.module.ts` and `apps/api/src/modules/cards/cards.module.ts`, then add them to AppModule.

**Step 8: Run all tests**

```bash
cd apps/api && pnpm test
```

**Step 9: Commit**

```bash
git add -A
git commit -m "feat: add lists and cards modules with completion detection on move"
```

---

### Task 4: Comments + Attachments + Labels Modules

**TDD scenario:** New feature — full TDD cycle

**Files:**
- Create: `apps/api/src/modules/comments/comments.module.ts`, `.service.ts`, `.controller.ts`
- Create: `apps/api/src/modules/attachments/attachments.module.ts`, `.service.ts`, `.controller.ts`
- Create: `apps/api/src/modules/labels/labels.module.ts`, `.service.ts`, `.controller.ts`
- Create: `apps/api/src/modules/storage/storage.module.ts`, `.service.ts`
- Test: `apps/api/src/modules/comments/comments.service.spec.ts`

**Step 1: Write failing test for CommentsService**

```typescript
// apps/api/src/modules/comments/comments.service.spec.ts
import { Test, TestingModule } from "@nestjs/testing";
import { CommentsService } from "./comments.service";
import { db } from "../../database/connection";
import { ForbiddenException } from "@nestjs/common";

jest.mock("../../database/connection", () => ({
  db: {
    select: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    values: jest.fn().mockReturnThis(),
    returning: jest.fn(),
    update: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    delete: jest.fn(),
  },
}));

describe("CommentsService", () => {
  let service: CommentsService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [CommentsService],
    }).compile();
    service = module.get<CommentsService>(CommentsService);
  });

  it("creates a comment with default internal visibility", async () => {
    const mockReturning = jest.fn().mockResolvedValue([{
      id: "1",
      cardId: "card-1",
      authorId: "user-1",
      content: "Test comment",
      visibility: "internal",
    }]);
    (db.insert as jest.Mock).mockReturnValue({
      values: jest.fn().mockReturnValue({ returning: mockReturning }),
    });

    const result = await service.create("card-1", "user-1", {
      content: "Test comment",
      visibility: "internal",
    });

    expect(result.visibility).toBe("internal");
  });
});
```

**Step 2-4: Implement CommentsService (red → green)**

Create `apps/api/src/modules/comments/comments.service.ts`:

```typescript
import { Injectable, NotFoundException, ForbiddenException } from "@nestjs/common";
import { eq, and } from "drizzle-orm";
import { db } from "../../database/connection";
import { cardComments } from "../../database/schema";

@Injectable()
export class CommentsService {
  async create(cardId: string, authorId: string, data: { content: string; visibility: string }) {
    const [comment] = await db
      .insert(cardComments)
      .values({
        cardId,
        authorId,
        content: data.content,
        visibility: data.visibility,
      })
      .returning();
    return comment;
  }

  async findByCard(cardId: string, visibility?: string) {
    let query = db.select().from(cardComments).where(eq(cardComments.cardId, cardId));

    if (visibility) {
      query = query.where(
        and(eq(cardComments.cardId, cardId), eq(cardComments.visibility, visibility))
      ) as any;
    }

    return query.orderBy(cardComments.createdAt);
  }

  async update(id: string, authorId: string, content: string) {
    const [comment] = await db
      .select()
      .from(cardComments)
      .where(eq(cardComments.id, id))
      .limit(1);

    if (!comment) throw new NotFoundException("Comment not found");
    if (comment.authorId !== authorId) throw new ForbiddenException("Not the author");

    const [updated] = await db
      .update(cardComments)
      .set({ content, updatedAt: new Date() })
      .where(eq(cardComments.id, id))
      .returning();
    return updated;
  }

  async remove(id: string, userId: string, userRole: string) {
    const [comment] = await db
      .select()
      .from(cardComments)
      .where(eq(cardComments.id, id))
      .limit(1);

    if (!comment) throw new NotFoundException("Comment not found");
    if (comment.authorId !== userId && userRole !== "admin") {
      throw new ForbiddenException("Not authorized");
    }

    await db.delete(cardComments).where(eq(cardComments.id, id));
  }
}
```

**Step 5-7: Implement AttachmentsService with S3 storage**

Create `apps/api/src/modules/storage/storage.service.ts`:

```typescript
import { Injectable } from "@nestjs/common";
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

@Injectable()
export class StorageService {
  private s3: S3Client;

  constructor() {
    this.s3 = new S3Client({
      endpoint: process.env.S3_ENDPOINT,
      region: process.env.S3_REGION ?? "us-east-1",
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID!,
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
      },
      forcePathStyle: true,
    });
  }

  async upload(key: string, body: Buffer, contentType: string) {
    await this.s3.send(
      new PutObjectCommand({
        Bucket: process.env.S3_BUCKET!,
        Key: key,
        Body: body,
        ContentType: contentType,
      })
    );
    return `${process.env.S3_ENDPOINT}/${process.env.S3_BUCKET}/${key}`;
  }

  async delete(key: string) {
    await this.s3.send(
      new DeleteObjectCommand({
        Bucket: process.env.S3_BUCKET!,
        Key: key,
      })
    );
  }

  async getSignedDownloadUrl(key: string) {
    return getSignedUrl(
      this.s3,
      new GetObjectCommand({
        Bucket: process.env.S3_BUCKET!,
        Key: key,
      }),
      { expiresIn: 3600 }
    );
  }
}
```

Create `apps/api/src/modules/attachments/attachments.service.ts`:

```typescript
import { Injectable, NotFoundException } from "@nestjs/common";
import { eq } from "drizzle-orm";
import { db } from "../../database/connection";
import { cardAttachments } from "../../database/schema";
import { StorageService } from "../storage/storage.service";
import * as crypto from "crypto";

@Injectable()
export class AttachmentsService {
  constructor(private storageService: StorageService) {}

  async create(
    cardId: string,
    userId: string,
    file: { name: string; data: Buffer; mimeType: string; size: number },
    visibility: string = "client"
  ) {
    const key = `attachments/${crypto.randomUUID()}/${file.name}`;
    const fileUrl = await this.storageService.upload(key, file.data, file.mimeType);

    const [attachment] = await db
      .insert(cardAttachments)
      .values({
        cardId,
        fileName: file.name,
        fileUrl,
        fileSize: file.size,
        mimeType: file.mimeType,
        visibility,
        uploadedBy: userId,
      })
      .returning();

    return attachment;
  }

  async findByCard(cardId: string, visibility?: string) {
    if (visibility) {
      return db
        .select()
        .from(cardAttachments)
        .where(
          eq(cardAttachments.cardId, cardId) &&
          eq(cardAttachments.visibility, visibility)
        );
    }
    return db.select().from(cardAttachments).where(eq(cardAttachments.cardId, cardId));
  }

  async remove(id: string) {
    const [attachment] = await db
      .select()
      .from(cardAttachments)
      .where(eq(cardAttachments.id, id))
      .limit(1);

    if (!attachment) throw new NotFoundException("Attachment not found");

    // Delete from S3
    const key = attachment.fileUrl.split("/").slice(-2).join("/");
    await this.storageService.delete(key);

    // Delete from DB
    await db.delete(cardAttachments).where(eq(cardAttachments.id, id));
  }
}
```

**Step 8: Implement LabelsService**

Create `apps/api/src/modules/labels/labels.service.ts`:

```typescript
import { Injectable, NotFoundException } from "@nestjs/common";
import { eq, and } from "drizzle-orm";
import { db } from "../../database/connection";
import { labels, cardLabels } from "../../database/schema";

@Injectable()
export class LabelsService {
  async create(boardId: string, data: { name: string; color: string }) {
    const [label] = await db
      .insert(labels)
      .values({ boardId, name: data.name, color: data.color })
      .returning();
    return label;
  }

  async findByBoard(boardId: string) {
    return db.select().from(labels).where(eq(labels.boardId, boardId));
  }

  async update(id: string, data: { name?: string; color?: string }) {
    const [label] = await db
      .update(labels)
      .set(data)
      .where(eq(labels.id, id))
      .returning();
    if (!label) throw new NotFoundException("Label not found");
    return label;
  }

  async remove(id: string) {
    await db.delete(labels).where(eq(labels.id, id));
  }

  async assignToCard(cardId: string, labelId: string) {
    await db.insert(cardLabels).values({ cardId, labelId }).onConflictDoNothing();
  }

  async removeFromCard(cardId: string, labelId: string) {
    await db
      .delete(cardLabels)
      .where(and(eq(cardLabels.cardId, cardId), eq(cardLabels.labelId, labelId)));
  }
}
```

**Step 9: Implement controllers + modules for all three**

**Step 10: Add S3 + AWS SDK dependency**

```bash
cd apps/api && pnpm add @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

**Step 11: Run all tests**

```bash
cd apps/api && pnpm test
```

**Step 12: Commit**

```bash
git add -A
git commit -m "feat: add comments, attachments (S3), and labels modules"
```

**🧾 Rules Check — Phase 2 final verification:**

| Regra | Verificar | ✅? |
|-------|-----------|----|
| `rules/security-auth-jwt.md` | JWT secret do ConfigService, refresh tokens, payload mínimo? | ☐ |
| `rules/security-use-guards.md` | JwtAuthGuard + RolesGuard registrados como APP_GUARD? | ☐ |
| `rules/security-validate-all-input.md` | Todos os endpoints validam input com zod/pipe? | ☐ |
| `rules/security-sanitize-output.md` | passwordHash nunca retornado (response DTOs)? | ☐ |
| `rules/db-avoid-n-plus-one.md` | BoardsService.getStats usa agregação (não N+1)? | ☐ |
| `rules/db-use-returning.md` | Todos os INSERT/UPDATE usam `.returning()`? | ☐ |
| `rules/db-select-columns.md` | Nenhum `SELECT *` nas queries de listagem? | ☐ |
| `rules/db-use-transactions.md` | CardsService.moveCard precisa de transação? | ☐ |
| `rules/db-soft-deletes.md` | UsersService.remove() faz soft delete ou hard delete? | ☐ |
| `rules/error-throw-http-exceptions.md` | Services throw NotFoundException/ConflictException em vez de null? | ☐ |
| `rules/error-handle-async-errors.md` | S3 upload tem `.catch()` para erros? | ☐ |
| `rules/arch-use-repository-pattern.md` | Queries complexas encapsuladas em repositories? | ☐ |

Se qualquer item estiver ❌, corrija ANTES de ir para Phase 3.

---

**Phase 2 checkpoint:** At this point you have:
- ✅ Auth with JWT + public board guard + role-based access
- ✅ Full CRUD for boards, lists, cards
- ✅ Completion detection when cards move to "Done" lists
- ✅ Comments with internal/client visibility
- ✅ File attachments with S3 + visibility
- ✅ Labels with card assignment
- ✅ Seed admin user works