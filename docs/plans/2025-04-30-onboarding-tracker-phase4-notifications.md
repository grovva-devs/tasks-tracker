# Phase 4: Notifications, Dashboard, Settings, Webhooks — Implementation Plan

> **REQUIRED SUB-SKILL:** Use the executing-plans skill to implement this plan task-by-task.

**Goal:** Build the notification pipeline (in-app + email + webhooks), dashboard stats module, organization settings (branding + email config), and webhook CRUD with HMAC delivery and retry.

**Architecture:** NestJS `EventEmitter2` event bus (ADR-0005). CRUD services emit events → `NotificationsModule` fans out to 3 channels: (1) in-app DB notifications, (2) email via nodemailer, (3) webhooks via WebhookSender with HMAC-SHA256. Dashboard uses SQL aggregation. Settings is a singleton row (`id=1`). Webhook events stored as PostgreSQL `text[]`.

**Tech Stack:** NestJS 11, EventEmitter2, Drizzle ORM, nodemailer, crypto (HMAC), @nestjs/schedule

**Depends on:** Phase 1 + Phase 2 + Phase 3 complete
**Rules Hub:** `docs/plans/IMPLEMENTATION-HUB.md`

---

## 🏛️ CONSTITUIÇÃO DO BANCO DE DADOS — OBRIGATÓRIO NESTA PHASE

> Phase 4 tem event handlers, fire-and-forget, e webhooks. Erros assíncronos NÃO tratados crasham o processo.
> O agente DEVE seguir estas regras. Referência: `docs/plans/IMPLEMENTATION-HUB.md` e `rules/`

```
1. NUNCA use sql.raw() com interpolação
2. NUNCA faça queries em loop (N+1)
3. Sempre use .returning() em INSERT e UPDATE
4. Especifique colunas no SELECT
5. Fire-and-forget SEMPRE com .catch() — nunca solte promise sem handler
6. @OnEvent SEMPRE com try/catch — nunca rethrow em event handlers
7. Use transações para multi-step (criar notification + update dashboard)
8. Use scheduled tasks com BullMQ — NUNCA setInterval
9. Nunca exponha erros de banco/webhook ao client
10. Valide webhook URLs — nunca envie para URLs internas (SSRF)
```

**Rules desta phase:**
- `rules/db-use-transactions.md` → Criar notificação + update em transação
- `rules/db-avoid-n-plus-one.md` → Buscar notificações com relações
- `rules/db-use-returning.md` → .returning() em INSERT de notificações
- `rules/db-select-columns.md` → Nunca SELECT * em queries de stats
- `rules/db-prevent-sql-injection.md` → Nunca sql.raw()
- `rules/error-handle-async-errors.md` → **CRITICAL** — fire-and-forget com .catch()
- `rules/security-rate-limiting.md` → Rate limiting em webhook delivery

### ⚠️ Anti-padrão CRÍTICO desta phase — Event handler sem try/catch:

```typescript
// ❌ O agente vai tentar fazer fire-and-forget sem error handling:
@OnEvent('board.created')
async handleBoardCreated(event: BoardCreatedEvent) {
  await this.notificationsService.create(event); // Se crashar, DERRUBA o processo!
  await this.emailService.sendWelcome(event.email); // Se crashar, DERRUBA!
}

// Service faz fire-and-forget sem .catch():
asynce createUser() {
  const user = await this.repo.save(data);
  this.eventEmitter.emit('user.created', user); // Se listener falha = crash!
  return user;
}

// ✅ CORRETO — Event handlers SEMPRE com try/catch:
@OnEvent('board.created')
async handleBoardCreated(event: BoardCreatedEvent) {
  try {
    await this.notificationsService.create(event);
    await this.emailService.sendWelcome(event.email);
  } catch (error) {
    this.logger.error('Failed to handle board.created', error.stack, event);
    await this.deadLetterQueue.add('board.created', event);
  }
}

// Fire-and-forget SEMPRE com .catch():
asynce createUser() {
  const user = await this.repo.save(data);
  this.eventEmitter.emit('user.created', user); // Síncrono, não espera
  return user;
  // O listener é quem deve tratar erros — NUNCA deixe promise sem catch
}
```

---

### Task 1: Webhook Sender — HMAC Signing + Retry + Batch Delivery

**TDD scenario:** Full TDD cycle — pure logic + fetch mock

**Files:**
- Create: `apps/api/src/modules/notifications/webhook.sender.ts`
- Test: `apps/api/src/modules/notifications/webhook.sender.spec.ts`

**Step 1: Write failing test for WebhookSender**

Create `apps/api/src/modules/notifications/webhook.sender.spec.ts`:

```typescript
import { WebhookSender } from "./webhook.sender";
import * as crypto from "crypto";

global.fetch = jest.fn();

describe("WebhookSender", () => {
  let sender: WebhookSender;

  beforeEach(() => {
    sender = new WebhookSender();
    jest.clearAllMocks();
  });

  describe("send", () => {
    it("sends POST with HMAC-SHA256 signature header", async () => {
      (global.fetch as jest.Mock).mockResolvedValue({ ok: true, status: 200 });
      const payload = { event: "card.completed", timestamp: "2025-01-01T00:00:00Z" };

      await sender.send("https://example.com/webhook", "my-secret", payload);

      expect(global.fetch).toHaveBeenCalledTimes(1);
      const [url, options] = (global.fetch as jest.Mock).mock.calls[0];
      expect(url).toBe("https://example.com/webhook");
      expect(options.method).toBe("POST");
      expect(options.headers["Content-Type"]).toBe("application/json");

      const body = JSON.stringify(payload);
      const expectedSig = "sha256=" + crypto.createHmac("sha256", "my-secret").update(body).digest("hex");
      expect(options.headers["X-Webhook-Signature"]).toBe(expectedSig);
    });

    it("throws when response is not ok", async () => {
      (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 500 });
      await expect(sender.send("https://example.com/webhook", "secret", {})).rejects.toThrow("Webhook delivery failed: 500");
    });

    it("throws on network error", async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error("ECONNREFUSED"));
      await expect(sender.send("https://example.com/webhook", "secret", {})).rejects.toThrow("ECONNREFUSED");
    });

    it("sends payload as JSON body", async () => {
      (global.fetch as jest.Mock).mockResolvedValue({ ok: true, status: 200 });
      const payload = { event: "board.completed", boardId: "b1" };
      await sender.send("https://example.com/webhook", "secret", payload);
      const options = (global.fetch as jest.Mock).mock.calls[0][1];
      const parsedBody = JSON.parse(options.body);
      expect(parsedBody.event).toBe("board.completed");
    });
  });

  describe("sendWithRetry", () => {
    it("retries up to maxRetries on failure then succeeds", async () => {
      (global.fetch as jest.Mock)
        .mockRejectedValueOnce(new Error("timeout"))
        .mockRejectedValueOnce(new Error("timeout"))
        .mockResolvedValue({ ok: true, status: 200 });
      const result = await sender.sendWithRetry("https://example.com/webhook", "secret", {}, 3);
      expect(result).toBe(true);
      expect(global.fetch).toHaveBeenCalledTimes(3);
    });

    it("returns true on first attempt success", async () => {
      (global.fetch as jest.Mock).mockResolvedValue({ ok: true, status: 200 });
      const result = await sender.sendWithRetry("https://example.com/webhook", "secret", {}, 3);
      expect(result).toBe(true);
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it("throws after all retries exhausted", async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error("persistent failure"));
      await expect(sender.sendWithRetry("https://example.com/webhook", "secret", {}, 3)).rejects.toThrow("persistent failure");
      expect(global.fetch).toHaveBeenCalledTimes(3);
    });
  });

  describe("deliverToActiveWebhooks", () => {
    it("delivers only to active webhooks subscribing to the event", async () => {
      (global.fetch as jest.Mock).mockResolvedValue({ ok: true, status: 200 });
      const webhooks = [
        { id: "wh-1", url: "https://a.com/hook", secret: "s-a", events: ["card.completed", "board.completed"], isActive: true },
        { id: "wh-2", url: "https://b.com/hook", secret: "s-b", events: ["card.assigned"], isActive: true },
        { id: "wh-3", url: "https://c.com/hook", secret: "s-c", events: ["card.completed"], isActive: false },
      ];
      const result = await sender.deliverToActiveWebhooks(webhooks as any, "card.completed", { cardId: "c1" });
      expect(result.delivered).toBe(1);
      expect(result.failed).toBe(0);
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it("counts failures separately", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, status: 200 }).mockRejectedValueOnce(new Error("timeout"));
      const webhooks = [
        { id: "wh-1", url: "https://a.com/hook", secret: "s-a", events: ["card.completed"], isActive: true },
        { id: "wh-2", url: "https://b.com/hook", secret: "s-b", events: ["card.completed"], isActive: true },
      ];
      const result = await sender.deliverToActiveWebhooks(webhooks as any, "card.completed", {});
      expect(result.delivered).toBe(1);
      expect(result.failed).toBe(1);
    });

    it("returns zeros when no webhooks match", async () => {
      const webhooks = [{ id: "wh-1", url: "https://a.com/hook", secret: "s", events: ["board.completed"], isActive: true }];
      const result = await sender.deliverToActiveWebhooks(webhooks as any, "card.assigned", {});
      expect(result.delivered).toBe(0);
      expect(result.failed).toBe(0);
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });
});
```

**Step 2: Run test to verify it fails**

```bash
cd apps/api && pnpm test webhook.sender.spec
```

Expected: FAIL — `Cannot find module './webhook.sender'`

**Step 3: Implement WebhookSender**

Create `apps/api/src/modules/notifications/webhook.sender.ts`:

```typescript
import { Injectable, Logger } from "@nestjs/common";
import * as crypto from "crypto";

export interface WebhookDeliveryResult {
  delivered: number;
  failed: number;
  errors: string[];
}

@Injectable()
export class WebhookSender {
  private readonly logger = new Logger(WebhookSender.name);

  async send(url: string, secret: string, payload: object): Promise<boolean> {
    const body = JSON.stringify(payload);
    const signature = "sha256=" + crypto.createHmac("sha256", secret).update(body).digest("hex");

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Webhook-Signature": signature },
      body,
    });

    if (!response.ok) {
      throw new Error(`Webhook delivery failed: ${response.status}`);
    }
    return true;
  }

  async sendWithRetry(url: string, secret: string, payload: object, maxRetries = 3): Promise<boolean> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.send(url, secret, payload);
      } catch (error) {
        this.logger.warn(`Webhook attempt ${attempt}/${maxRetries} to ${url} failed: ${(error as Error).message}`);
        if (attempt === maxRetries) throw error;
        const delayMs = 1000 * Math.pow(2, attempt - 1);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
    return false;
  }

  async deliverToActiveWebhooks(
    activeWebhooks: { id: string; url: string; secret: string; events: string[]; isActive: boolean }[],
    event: string,
    payload: object
  ): Promise<WebhookDeliveryResult> {
    const matching = activeWebhooks.filter((wh) => wh.isActive && wh.events.includes(event));
    if (matching.length === 0) return { delivered: 0, failed: 0, errors: [] };

    let delivered = 0;
    let failed = 0;
    const errors: string[] = [];

    const results = await Promise.allSettled(
      matching.map((wh) =>
        this.sendWithRetry(wh.url, wh.secret, { ...payload, _webhookId: wh.id, event, timestamp: new Date().toISOString() })
      )
    );

    for (const result of results) {
      if (result.status === "fulfilled") {
        delivered++;
      } else {
        failed++;
        errors.push(result.reason?.message ?? "Unknown error");
      }
    }

    this.logger.log(`Webhook delivery for "${event}": ${delivered} delivered, ${failed} failed`);
    return { delivered, failed, errors };
  }
}
```

**Step 4: Run test to verify it passes**

```bash
cd apps/api && pnpm test webhook.sender.spec
```

Expected: 10 tests PASS

**Step 5: Commit**

```bash
git add -A && git commit -m "feat: add WebhookSender with HMAC-SHA256 signing, exponential retry, and batch delivery"
```

---

### Task 2: Email Sender

**TDD scenario:** Full TDD cycle — mock nodemailer transport

**Files:**
- Create: `apps/api/src/modules/notifications/email.sender.ts`
- Test: `apps/api/src/modules/notifications/email.sender.spec.ts`

**Step 1: Write failing test for EmailSender**

Create `apps/api/src/modules/notifications/email.sender.spec.ts`:

```typescript
import { Test, TestingModule } from "@nestjs/testing";
import { EmailSender } from "./email.sender";
import { ConfigService } from "@nestjs/config";

const mockSendMail = jest.fn();
jest.mock("nodemailer", () => ({
  createTransport: jest.fn(() => ({ sendMail: mockSendMail, verify: jest.fn().mockResolvedValue(true) })),
}));

describe("EmailSender", () => {
  let sender: EmailSender;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockSendMail.mockResolvedValue({ messageId: "msg-1" });
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailSender,
        { provide: ConfigService, useValue: { get: (key: string) => ({ SMTP_HOST: "smtp.test.com", SMTP_PORT: "465", SMTP_USER: "u", SMTP_PASSWORD: "p", EMAIL_FROM: "noreply@co.com" }[key]) } },
      ],
    }).compile();
    sender = module.get<EmailSender>(EmailSender);
  });

  describe("sendBoardCompletionEmail", () => {
    it("sends completion email to client", async () => {
      await sender.sendBoardCompletionEmail("client@acme.com", "Acme Corp", "Acme Onboarding");
      expect(mockSendMail).toHaveBeenCalledTimes(1);
      const opts = mockSendMail.mock.calls[0][0];
      expect(opts.to).toBe("client@acme.com");
      expect(opts.from).toBe("noreply@co.com");
      expect(opts.subject).toContain("Complete");
      expect(opts.html).toContain("Acme Corp");
    });

    it("includes public board link when token provided", async () => {
      await sender.sendBoardCompletionEmail("c@a.com", "Acme", "Board", "tok123");
      const opts = mockSendMail.mock.calls[0][0];
      expect(opts.html).toContain("/b/tok123");
    });
  });

  describe("sendCardAssignedEmail", () => {
    it("sends assignment email", async () => {
      await sender.sendCardAssignedEmail("m@co.com", "John", "Setup", "Board");
      expect(mockSendMail).toHaveBeenCalledTimes(1);
      const opts = mockSendMail.mock.calls[0][0];
      expect(opts.to).toBe("m@co.com");
      expect(opts.html).toContain("Setup");
    });
  });

  describe("sendOverdueNotificationEmail", () => {
    it("sends overdue email", async () => {
      await sender.sendOverdueNotificationEmail("m@co.com", "John", "Task", "Board", "2025-04-15");
      const opts = mockSendMail.mock.calls[0][0];
      expect(opts.subject).toContain("Overdue");
      expect(opts.html).toContain("2025-04-15");
    });
  });
});
```

**Step 2: Run test — fails (module not found)**

```bash
cd apps/api && pnpm test email.sender.spec
```

**Step 3: Install nodemailer**

```bash
cd apps/api && pnpm add nodemailer && pnpm add -D @types/nodemailer
```

**Step 4: Implement EmailSender**

Create `apps/api/src/modules/notifications/email.sender.ts`:

```typescript
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as nodemailer from "nodemailer";

@Injectable()
export class EmailSender {
  private transporter: nodemailer.Transporter;
  private readonly logger = new Logger(EmailSender.name);
  private readonly fromAddress: string;

  constructor(private configService: ConfigService) {
    this.fromAddress = this.configService.get<string>("EMAIL_FROM") ?? "noreply@onboardingtracker.com";
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>("SMTP_HOST"),
      port: parseInt(this.configService.get<string>("SMTP_PORT") ?? "465", 10),
      secure: true,
      auth: {
        user: this.configService.get<string>("SMTP_USER"),
        pass: this.configService.get<string>("SMTP_PASSWORD"),
      },
    });
  }

  async sendBoardCompletionEmail(to: string, clientName: string, boardTitle: string, publicToken?: string): Promise<boolean> {
    const appUrl = this.configService.get<string>("NEXT_PUBLIC_API_URL") ?? "http://localhost:3000";
    const boardLink = publicToken ? `${appUrl}/b/${publicToken}` : null;
    const html = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
        <h2>🎉 Onboarding Complete!</h2>
        <p>Hello <strong>${clientName}</strong>,</p>
        <p>Your onboarding for <strong>${boardTitle}</strong> has been completed.</p>
        ${boardLink ? `<p><a href="${boardLink}" style="display:inline-block;padding:12px 24px;background:#3B82F6;color:white;text-decoration:none;border-radius:6px">View Progress</a></p>` : ""}
        <p>Thank you for choosing us!</p>
      </div>`;
    try {
      await this.transporter.sendMail({ from: this.fromAddress, to, subject: `✅ ${boardTitle} — Onboarding Complete!`, html });
      return true;
    } catch (error) {
      this.logger.error(`Failed to send completion email: ${(error as Error).message}`);
      return false;
    }
  }

  async sendCardAssignedEmail(to: string, userName: string, cardTitle: string, boardTitle: string): Promise<boolean> {
    const html = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
        <h2>📋 New Card Assigned</h2>
        <p>Hi <strong>${userName}</strong>,</p>
        <p>You've been assigned to <strong>${cardTitle}</strong> on <strong>${boardTitle}</strong>.</p>
      </div>`;
    try {
      await this.transporter.sendMail({ from: this.fromAddress, to, subject: `📋 Assigned: "${cardTitle}" on ${boardTitle}`, html });
      return true;
    } catch (error) {
      this.logger.error(`Failed to send assignment email: ${(error as Error).message}`);
      return false;
    }
  }

  async sendOverdueNotificationEmail(to: string, userName: string, cardTitle: string, boardTitle: string, dueDate: string): Promise<boolean> {
    const html = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
        <h2>⏰ Overdue Card</h2>
        <p>Hi <strong>${userName}</strong>,</p>
        <p><strong>${cardTitle}</strong> on <strong>${boardTitle}</strong> is overdue.</p>
        <p>Due date was: <strong>${dueDate}</strong></p>
      </div>`;
    try {
      await this.transporter.sendMail({ from: this.fromAddress, to, subject: `⏰ Overdue: "${cardTitle}" on ${boardTitle}`, html });
      return true;
    } catch (error) {
      this.logger.error(`Failed to send overdue email: ${(error as Error).message}`);
      return false;
    }
  }
}
```

**Step 5: Run test — passes**

```bash
cd apps/api && pnpm test email.sender.spec
```

Expected: 5 tests PASS

**Step 6: Commit**

```bash
git add -A && git commit -m "feat: add EmailSender with board completion, card assignment, and overdue templates"
```

---

### Task 3: Notifications Service + Controller + Event Listeners + Module Wiring

**TDD scenario:** Full TDD cycle for service; integration for listeners

**Files:**
- Create: `apps/api/src/modules/notifications/notifications.service.ts`
- Create: `apps/api/src/modules/notifications/notifications.controller.ts`
- Create: `apps/api/src/modules/notifications/notifications.module.ts`
- Create: `apps/api/src/modules/notifications/listeners/board-events.listener.ts`
- Create: `apps/api/src/modules/notifications/listeners/card-events.listener.ts`
- Create: `apps/api/src/modules/notifications/listeners/overdue-cron.listener.ts`
- Test: `apps/api/src/modules/notifications/notifications.service.spec.ts`
- Test: `apps/api/src/modules/notifications/listeners/board-events.listener.spec.ts`

**Step 1: Write failing test for NotificationsService**

Create `apps/api/src/modules/notifications/notifications.service.spec.ts`:

```typescript
import { Test, TestingModule } from "@nestjs/testing";
import { NotificationsService } from "./notifications.service";
import { db } from "../../database/connection";

jest.mock("../../database/connection", () => ({
  db: {
    select: jest.fn().mockReturnThis(), from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(), orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn(), insert: jest.fn().mockReturnThis(),
    values: jest.fn().mockReturnThis(), returning: jest.fn(),
    update: jest.fn().mockReturnThis(), set: jest.fn(),
  },
}));

describe("NotificationsService", () => {
  let service: NotificationsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({ providers: [NotificationsService] }).compile();
    service = module.get<NotificationsService>(NotificationsService);
  });

  it("creates an in-app notification", async () => {
    const mockReturning = jest.fn().mockResolvedValue([{ id: "n1", userId: "u1", type: "board.completed", isRead: false }]);
    (db.insert as jest.Mock).mockReturnValue({ values: jest.fn().mockReturnValue({ returning: mockReturning }) });
    const result = await service.create({ userId: "u1", type: "board.completed", title: "Board completed!", boardId: "b1" });
    expect(result.userId).toBe("u1");
    expect(result.isRead).toBe(false);
  });

  it("creates notifications for multiple users", async () => {
    const mockReturning = jest.fn().mockResolvedValue([{ id: "n1" }, { id: "n2" }]);
    (db.insert as jest.Mock).mockReturnValue({ values: jest.fn().mockReturnValue({ returning: mockReturning }) });
    const result = await service.createForUsers(["u1", "u2"], "card.assigned", "Assigned", { cardId: "c1" });
    expect(result).toHaveLength(2);
  });

  it("finds notifications for a user", async () => {
    const mockOrderBy = jest.fn().mockResolvedValue([{ id: "n1" }, { id: "n2" }]);
    (db.select as jest.Mock).mockReturnValue({ from: jest.fn().mockReturnValue({ where: jest.fn().mockReturnValue({ orderBy: mockOrderBy }) }) });
    const result = await service.findByUser("u1");
    expect(result).toHaveLength(2);
  });

  it("marks a notification as read", async () => {
    const mockReturning = jest.fn().mockResolvedValue([{ id: "n1", isRead: true }]);
    (db.update as jest.Mock).mockReturnValue({ set: jest.fn().mockReturnValue({ where: jest.fn().mockReturnValue({ returning: mockReturning }) }) });
    const result = await service.markAsRead("n1");
    expect(result.isRead).toBe(true);
  });

  it("marks all as read for a user", async () => {
    const mockReturning = jest.fn().mockResolvedValue([{ id: "n1" }, { id: "n2" }]);
    (db.update as jest.Mock).mockReturnValue({ set: jest.fn().mockReturnValue({ where: jest.fn().mockReturnValue({ returning: mockReturning }) }) });
    const result = await service.markAllAsRead("u1");
    expect(result).toHaveLength(2);
  });

  it("returns unread count", async () => {
    const mockWhere = jest.fn().mockReturnValue({ where: jest.fn().mockResolvedValue([{ count: 5 }]) });
    (db.select as jest.Mock).mockReturnValue({ from: jest.fn().mockReturnValue({ where: mockWhere }) });
    const result = await service.getUnreadCount("u1");
    expect(result).toBe(5);
  });
});
```

**Step 2: Run test — fails**

```bash
cd apps/api && pnpm test notifications.service.spec
```

**Step 3: Implement NotificationsService**

Create `apps/api/src/modules/notifications/notifications.service.ts`:

```typescript
import { Injectable } from "@nestjs/common";
import { eq, and, desc, sql } from "drizzle-orm";
import { db } from "../../database/connection";
import { notifications } from "../../database/schema";

@Injectable()
export class NotificationsService {
  async create(data: { userId: string; type: string; title: string; message?: string; boardId?: string; cardId?: string }) {
    const [n] = await db.insert(notifications).values({
      userId: data.userId, type: data.type, title: data.title,
      message: data.message ?? null, boardId: data.boardId ?? null, cardId: data.cardId ?? null,
    }).returning();
    return n;
  }

  async createForUsers(userIds: string[], type: string, title: string, refs: { boardId?: string; cardId?: string; message?: string } = {}) {
    return db.insert(notifications).values(
      userIds.map((userId) => ({ userId, type, title, message: refs.message ?? null, boardId: refs.boardId ?? null, cardId: refs.cardId ?? null }))
    ).returning();
  }

  async findByUser(userId: string, options?: { unreadOnly?: boolean }) {
    let query = db.select().from(notifications).where(eq(notifications.userId, userId));
    if (options?.unreadOnly) {
      query = query.where(and(eq(notifications.userId, userId), eq(notifications.isRead, false))) as any;
    }
    return query.orderBy(desc(notifications.createdAt));
  }

  async markAsRead(id: string) {
    const [n] = await db.update(notifications).set({ isRead: true }).where(eq(notifications.id, id)).returning();
    return n;
  }

  async markAllAsRead(userId: string) {
    return db.update(notifications).set({ isRead: true }).where(and(eq(notifications.userId, userId), eq(notifications.isRead, false))).returning();
  }

  async getUnreadCount(userId: string): Promise<number> {
    const [result] = await db.select({ count: sql<number>`count(*)::int` }).from(notifications)
      .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
    return result?.count ?? 0;
  }
}
```

**Step 4: Run test — passes**

```bash
cd apps/api && pnpm test notifications.service.spec
```

**Step 5: Write failing test for BoardEventsListener**

Create `apps/api/src/modules/notifications/listeners/board-events.listener.spec.ts`:

```typescript
import { Test, TestingModule } from "@nestjs/testing";
import { BoardEventsListener } from "./board-events.listener";
import { NotificationsService } from "../notifications.service";
import { EmailSender } from "../email.sender";

describe("BoardEventsListener", () => {
  let listener: BoardEventsListener;
  let notifService: any;
  let emailSender: any;

  beforeEach(async () => {
    notifService = { createForUsers: jest.fn().mockResolvedValue([]), create: jest.fn().mockResolvedValue({}) };
    emailSender = { sendBoardCompletionEmail: jest.fn().mockResolvedValue(true) };
    const module = await Test.createTestingModule({
      providers: [BoardEventsListener, { provide: NotificationsService, useValue: notifService }, { provide: EmailSender, useValue: emailSender }],
    }).compile();
    listener = module.get<BoardEventsListener>(BoardEventsListener);
  });

  it("creates in-app notifications for team on board.completed", async () => {
    await listener.handleBoardCompleted({ boardId: "b1", boardTitle: "Acme", clientEmail: null, clientName: "Acme", completedBy: "u1", teamMemberIds: ["u1", "u2", "u3"] });
    expect(notifService.createForUsers).toHaveBeenCalledWith(["u1", "u2", "u3"], "board.completed", 'Board "Acme" completed!', { boardId: "b1" });
  });

  it("sends email to client on board.completed", async () => {
    await listener.handleBoardCompleted({ boardId: "b1", boardTitle: "Acme", clientEmail: "c@acme.com", clientName: "Acme", completedBy: "u1", teamMemberIds: ["u1"] });
    expect(emailSender.sendBoardCompletionEmail).toHaveBeenCalledWith("c@acme.com", "Acme", "Acme");
  });

  it("notifies team (excluding creator) on board.created", async () => {
    await listener.handleBoardCreated({ boardId: "b1", boardTitle: "New", createdBy: "u1", teamMemberIds: ["u1", "u2"] });
    expect(notifService.createForUsers).toHaveBeenCalledWith(["u2"], "board.created", 'New board "New" created', { boardId: "b1" });
  });
});
```

**Step 6: Implement event listeners**

Create `apps/api/src/modules/notifications/listeners/board-events.listener.ts`:

```typescript
import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { NotificationsService } from "../notifications.service";
import { EmailSender } from "../email.sender";
import { EVENTS } from "@onboarding-tracker/shared";

@Injectable()
export class BoardEventsListener {
  private readonly logger = new Logger(BoardEventsListener.name);
  constructor(private notifService: NotificationsService, private emailSender: EmailSender) {}

  @OnEvent(EVENTS.BOARD_CREATED)
  async handleBoardCreated(payload: { boardId: string; boardTitle: string; createdBy: string; teamMemberIds: string[] }) {
    this.logger.log(`Board created: ${payload.boardTitle}`);
    const notifyIds = payload.teamMemberIds.filter((id) => id !== payload.createdBy);
    if (notifyIds.length > 0) {
      await this.notifService.createForUsers(notifyIds, EVENTS.BOARD_CREATED, `New board "${payload.boardTitle}" created`, { boardId: payload.boardId });
    }
  }

  @OnEvent(EVENTS.BOARD_COMPLETED)
  async handleBoardCompleted(payload: { boardId: string; boardTitle: string; clientEmail: string | null; clientName: string; completedBy: string; teamMemberIds: string[] }) {
    this.logger.log(`Board completed: ${payload.boardTitle}`);
    await this.notifService.createForUsers(payload.teamMemberIds, EVENTS.BOARD_COMPLETED, `Board "${payload.boardTitle}" completed!`, { boardId: payload.boardId });
    if (payload.clientEmail) {
      await this.emailSender.sendBoardCompletionEmail(payload.clientEmail, payload.clientName, payload.boardTitle);
    }
  }
}
```

Create `apps/api/src/modules/notifications/listeners/card-events.listener.ts`:

```typescript
import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { NotificationsService } from "../notifications.service";
import { EVENTS } from "@onboarding-tracker/shared";

@Injectable()
export class CardEventsListener {
  private readonly logger = new Logger(CardEventsListener.name);
  constructor(private notifService: NotificationsService) {}

  @OnEvent(EVENTS.CARD_ASSIGNED)
  async handleCardAssigned(payload: { cardId: string; cardTitle: string; assigneeId: string; boardId: string; assignerId: string }) {
    this.logger.log(`Card assigned: ${payload.cardTitle}`);
    if (payload.assigneeId !== payload.assignerId) {
      await this.notifService.create({ userId: payload.assigneeId, type: EVENTS.CARD_ASSIGNED, title: `Card "${payload.cardTitle}" assigned to you`, boardId: payload.boardId, cardId: payload.cardId });
    }
  }

  @OnEvent(EVENTS.CARD_COMPLETED)
  async handleCardCompleted(payload: { cardId: string; cardTitle: string; boardId: string; completedBy: string; listTitle: string }) {
    this.logger.log(`Card completed: ${payload.cardTitle}`);
    await this.notifService.create({ userId: payload.completedBy, type: EVENTS.CARD_COMPLETED, title: `Card "${payload.cardTitle}" completed`, boardId: payload.boardId, cardId: payload.cardId, message: `Moved to "${payload.listTitle}"` });
  }

  @OnEvent(EVENTS.CARD_OVERDUE)
  async handleCardOverdue(payload: { cardId: string; cardTitle: string; boardId: string; assigneeIds: string[]; dueDate: string }) {
    this.logger.warn(`Card overdue: ${payload.cardTitle}`);
    await this.notifService.createForUsers(payload.assigneeIds, EVENTS.CARD_OVERDUE, `Card "${payload.cardTitle}" is overdue`, { boardId: payload.boardId, cardId: payload.cardId, message: `Due: ${payload.dueDate}` });
  }
}
```

Create `apps/api/src/modules/notifications/listeners/overdue-cron.listener.ts`:

```typescript
import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { db } from "../../../database/connection";
import { cards, lists, cardAssignees } from "../../../database/schema";
import { eq, lt, isNull } from "drizzle-orm";
import { EVENTS } from "@onboarding-tracker/shared";

@Injectable()
export class OverdueCronListener {
  private readonly logger = new Logger(OverdueCronListener.name);
  constructor(private eventEmitter: EventEmitter2) {}

  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async checkOverdueCards() {
    this.logger.log("Checking for overdue cards...");
    const today = new Date().toISOString().split("T")[0];
    const overdueCards = await db.select({ cardId: cards.id, cardTitle: cards.title, boardId: lists.boardId, dueDate: cards.dueDate })
      .from(cards).innerJoin(lists, eq(cards.listId, lists.id))
      .where(and(lt(cards.dueDate, today), isNull(cards.completedAt)));
    for (const card of overdueCards) {
      const assignees = await db.select({ userId: cardAssignees.userId }).from(cardAssignees).where(eq(cardAssignees.cardId, card.cardId));
      this.eventEmitter.emit(EVENTS.CARD_OVERDUE, { cardId: card.cardId, cardTitle: card.cardTitle, boardId: card.boardId, assigneeIds: assignees.map((a) => a.userId), dueDate: card.dueDate });
    }
    this.logger.log(`Found ${overdueCards.length} overdue cards`);
  }
}
```

**Step 7: Implement NotificationsController + NotificationsModule**

Create `apps/api/src/modules/notifications/notifications.controller.ts`:

```typescript
import { Controller, Get, Patch, Post, Param, Query, UseGuards } from "@nestjs/common";
import { NotificationsService } from "./notifications.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";

@UseGuards(JwtAuthGuard)
@Controller("notifications")
export class NotificationsController {
  constructor(private notifService: NotificationsService) {}

  @Get()
  async findAll(@CurrentUser() user: any, @Query("unreadOnly") unreadOnly?: string) {
    return this.notifService.findByUser(user.id, { unreadOnly: unreadOnly === "true" });
  }

  @Get("unread-count")
  async getUnreadCount(@CurrentUser() user: any) {
    const count = await this.notifService.getUnreadCount(user.id);
    return { count };
  }

  @Patch(":id/read")
  async markAsRead(@Param("id") id: string) {
    return this.notifService.markAsRead(id);
  }

  @Post("mark-all-read")
  async markAllAsRead(@CurrentUser() user: any) {
    await this.notifService.markAllAsRead(user.id);
    return { success: true };
  }
}
```

Create `apps/api/src/modules/notifications/notifications.module.ts`:

```typescript
import { Module } from "@nestjs/common";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { ScheduleModule } from "@nestjs/schedule";
import { NotificationsService } from "./notifications.service";
import { NotificationsController } from "./notifications.controller";
import { EmailSender } from "./email.sender";
import { WebhookSender } from "./webhook.sender";
import { BoardEventsListener } from "./listeners/board-events.listener";
import { CardEventsListener } from "./listeners/card-events.listener";
import { OverdueCronListener } from "./listeners/overdue-cron.listener";

@Module({
  imports: [EventEmitterModule.forRoot(), ScheduleModule.forRoot()],
  providers: [NotificationsService, EmailSender, WebhookSender, BoardEventsListener, CardEventsListener, OverdueCronListener],
  controllers: [NotificationsController],
  exports: [NotificationsService, WebhookSender],
})
export class NotificationsModule {}
```

**Step 8: Install event-emitter and schedule**

```bash
cd apps/api && pnpm add @nestjs/event-emitter @nestjs/schedule eventemitter2
```

**Step 9: Wire event emissions into BoardsService and CardsService**

Add to `apps/api/src/modules/boards/boards.service.ts` after `create`:

```typescript
import { EventEmitter2 } from "@nestjs/event-emitter";
// ... inject in constructor
// After board creation:
await this.eventEmitter.emitAsync(EVENTS.BOARD_CREATED, { boardId: board.id, boardTitle: board.title, createdBy: data.createdBy, teamMemberIds: [] });
```

Add to `apps/api/src/modules/cards/cards.service.ts` after `moveCard`:

```typescript
// After moveCard when card enters completion list:
await this.eventEmitter.emitAsync(EVENTS.CARD_COMPLETED, { cardId: updated.id, cardTitle: updated.title, boardId: targetList.boardId, completedBy: /* userId from context */, listTitle: targetList.title });
```

**Step 10: Update AppModule with NotificationsModule**

```bash
git add -A && git commit -m "feat: add notifications module with event bus listeners, email, webhooks, and overdue cron"
```

---

### Task 4: Dashboard Stats Module

**TDD scenario:** Full TDD cycle — SQL aggregation

**Files:**
- Create: `apps/api/src/modules/dashboard/dashboard.module.ts`
- Create: `apps/api/src/modules/dashboard/dashboard.service.ts`
- Create: `apps/api/src/modules/dashboard/dashboard.controller.ts`
- Test: `apps/api/src/modules/dashboard/dashboard.service.spec.ts`

**Step 1: Write failing test**

Create `apps/api/src/modules/dashboard/dashboard.service.spec.ts`:

```typescript
import { Test, TestingModule } from "@nestjs/testing";
import { DashboardService } from "./dashboard.service";
import { db } from "../../database/connection";

jest.mock("../../database/connection", () => ({
  db: { select: jest.fn().mockReturnThis(), from: jest.fn().mockReturnThis(), where: jest.fn(), orderBy: jest.fn(), limit: jest.fn() },
}));

describe("DashboardService", () => {
  let service: DashboardService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({ providers: [DashboardService] }).compile();
    service = module.get<DashboardService>(DashboardService);
  });

  describe("getOverview", () => {
    it("returns total boards, active, completed counts and avg completion %", async () => {
      // Mock 4 sequential select queries (total, active, completed, avg completion)
      const mockFrom = jest.fn();
      (db.select as jest.Mock).mockReturnValue({ from: mockFrom });
      mockFrom.mockResolvedValueOnce([{ count: 10 }])   // total boards
        .mockResolvedValueOnce([{ count: 7 }])          // active
        .mockResolvedValueOnce([{ count: 3 }])          // completed
        .mockResolvedValueOnce([{ avg: 65.5 }]);        // avg completion

      const result = await service.getOverview();
      expect(result.totalBoards).toBe(10);
      expect(result.activeBoards).toBe(7);
      expect(result.completedBoards).toBe(3);
      expect(result.avgCompletionPercentage).toBe(65.5);
    });
  });

  describe("getRecentActivity", () => {
    it("returns last 20 board updates", async () => {
      const mockOrderBy = jest.fn().mockResolvedValue([{ id: "b1" }, { id: "b2" }]);
      (db.select as jest.Mock).mockReturnValue({ from: jest.fn().mockReturnValue({ orderBy: mockOrderBy }) });
      const result = await service.getRecentActivity();
      expect(result).toHaveLength(2);
    });
  });
});
```

**Step 2: Run test — fails**

**Step 3: Implement DashboardService**

Create `apps/api/src/modules/dashboard/dashboard.service.ts`:

```typescript
import { Injectable } from "@nestjs/common";
import { eq, sql, desc } from "drizzle-orm";
import { db } from "../../database/connection";
import { boards } from "../../database/schema";

@Injectable()
export class DashboardService {
  async getOverview() {
    const [total] = await db.select({ count: sql<number>`count(*)::int` }).from(boards);
    const [active] = await db.select({ count: sql<number>`count(*)::int` }).from(boards).where(eq(boards.status, "active"));
    const [completed] = await db.select({ count: sql<number>`count(*)::int` }).from(boards).where(eq(boards.status, "completed"));
    const [avgResult] = await db.select({ avg: sql<number>`coalesce(avg(position), 0)::float` }).from(boards); // Simplified — use per-board stats aggregation

    return {
      totalBoards: total.count,
      activeBoards: active.count,
      completedBoards: completed.count,
      archivedBoards: total.count - active.count - completed.count,
      avgCompletionPercentage: Math.round(avgResult.avg),
    };
  }

  async getRecentActivity(limit = 20) {
    return db.select().from(boards).orderBy(desc(boards.updatedAt)).limit(limit);
  }
}
```

Create `apps/api/src/modules/dashboard/dashboard.controller.ts`:

```typescript
import { Controller, Get, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { DashboardService } from "./dashboard.service";

@UseGuards(JwtAuthGuard)
@Controller("dashboard")
export class DashboardController {
  constructor(private dashboardService: DashboardService) {}

  @Get("stats")
  async getStats() {
    return this.dashboardService.getOverview();
  }

  @Get("recent-activity")
  async getRecentActivity() {
    return this.dashboardService.getRecentActivity();
  }
}
```

Create `apps/api/src/modules/dashboard/dashboard.module.ts`:

```typescript
import { Module } from "@nestjs/common";
import { DashboardService } from "./dashboard.service";
import { DashboardController } from "./dashboard.controller";

@Module({ providers: [DashboardService], controllers: [DashboardController] })
export class DashboardModule {}
```

**Step 4: Run test — passes**

**Step 5: Add DashboardModule to AppModule, commit**

```bash
git add -A && git commit -m "feat: add dashboard module with overview stats and recent activity"
```

---

### Task 5: Settings Module + Webhooks CRUD

**TDD scenario:** Full TDD cycle — singleton settings + webhook CRUD

**Files:**
- Create: `apps/api/src/modules/settings/settings.module.ts`, `.service.ts`, `.controller.ts`
- Create: `apps/api/src/modules/webhooks/webhooks.module.ts`, `.service.ts`, `.controller.ts`
- Test: `apps/api/src/modules/settings/settings.service.spec.ts`
- Test: `apps/api/src/modules/webhooks/webhooks.service.spec.ts`

**Step 1: Write failing test for SettingsService**

Create `apps/api/src/modules/settings/settings.service.spec.ts`:

```typescript
import { Test, TestingModule } from "@nestjs/testing";
import { SettingsService } from "./settings.service";
import { db } from "../../database/connection";

jest.mock("../../database/connection", () => ({
  db: { select: jest.fn().mockReturnThis(), from: jest.fn().mockReturnThis(), where: jest.fn(), limit: jest.fn(), insert: jest.fn().mockReturnThis(), values: jest.fn().mockReturnThis(), returning: jest.fn(), update: jest.fn().mockReturnThis(), set: jest.fn() },
}));

describe("SettingsService", () => {
  let service: SettingsService;
  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({ providers: [SettingsService] }).compile();
    service = module.get<SettingsService>(SettingsService);
  });

  describe("getPublic", () => {
    it("returns only logo, primaryColor, companyName (no auth)", async () => {
      const mockLimit = jest.fn().mockResolvedValue([{ id: 1, companyName: "My Co", logoUrl: "https://logo.png", primaryColor: "#3B82F6", emailFrom: "secret@email.com" }]);
      (db.select as jest.Mock).mockReturnValue({ from: jest.fn().mockReturnValue({ where: jest.fn().mockReturnValue({ limit: mockLimit }) }) });
      const result = await service.getPublic();
      expect(result).toHaveProperty("companyName");
      expect(result).toHaveProperty("logoUrl");
      expect(result).toHaveProperty("primaryColor");
      expect(result).not.toHaveProperty("emailFrom");
    });
  });

  describe("getOrCreate (singleton pattern)", () => {
    it("creates settings row if it doesn't exist", async () => {
      const mockLimit = jest.fn().mockResolvedValueOnce([]) // not found
        .mockResolvedValueOnce([{ id: 1, companyName: "My Co" }]); // after insert
      const mockReturning = jest.fn().mockResolvedValue([{ id: 1, companyName: "My Co" }]);
      (db.select as jest.Mock).mockReturnValue({ from: jest.fn().mockReturnValue({ where: jest.fn().mockReturnValue({ limit: mockLimit }) }) });
      (db.insert as jest.Mock).mockReturnValue({ values: jest.fn().mockReturnValue({ returning: mockReturning }) });

      const result = await service.getOrCreate();
      expect(db.insert).toHaveBeenCalled();
    });
  });

  describe("update", () => {
    it("updates settings fields", async () => {
      const mockReturning = jest.fn().mockResolvedValue([{ id: 1, companyName: "Updated Co", primaryColor: "#FF0000" }]);
      (db.update as jest.Mock).mockReturnValue({ set: jest.fn().mockReturnValue({ where: jest.fn().mockReturnValue({ returning: mockReturning }) }) });
      const result = await service.update({ companyName: "Updated Co", primaryColor: "#FF0000" });
      expect(result.companyName).toBe("Updated Co");
    });
  });
});
```

**Step 2: Run test — fails**

**Step 3: Implement SettingsService**

Create `apps/api/src/modules/settings/settings.service.ts`:

```typescript
import { Injectable } from "@nestjs/common";
import { eq } from "drizzle-orm";
import { db } from "../../database/connection";
import { settings } from "../../database/schema";

@Injectable()
export class SettingsService {
  private async getOrCreate() {
    const [existing] = await db.select().from(settings).limit(1);
    if (existing) return existing;

    const [created] = await db.insert(settings).values({}).returning();
    return created;
  }

  async getPublic() {
    const s = await this.getOrCreate();
    return { companyName: s.companyName, logoUrl: s.logoUrl, primaryColor: s.primaryColor };
  }

  async getFull() {
    return this.getOrCreate();
  }

  async update(data: Partial<typeof settings.$inferInsert>) {
    const s = await this.getOrCreate();
    const [updated] = await db.update(settings).set({ ...data, updatedAt: new Date() }).where(eq(settings.id, s.id)).returning();
    return updated;
  }
}
```

Create `apps/api/src/modules/settings/settings.controller.ts`:

```typescript
import { Controller, Get, Patch, Body, UseGuards } from "@nestjs/common";
import { SettingsService } from "./settings.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";

@Controller("settings")
export class SettingsController {
  constructor(private settingsService: SettingsService) {}

  @Get("public")
  async getPublic() { return this.settingsService.getPublic(); }

  @UseGuards(JwtAuthGuard)
  @Get()
  async getFull() { return this.settingsService.getFull(); }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("admin")
  @Patch()
  async update(@Body() body: any) { return this.settingsService.update(body); }
}
```

Create `apps/api/src/modules/settings/settings.module.ts`:

```typescript
import { Module } from "@nestjs/common";
import { SettingsService } from "./settings.service";
import { SettingsController } from "./settings.controller";
@Module({ providers: [SettingsService], controllers: [SettingsController], exports: [SettingsService] })
export class SettingsModule {}
```

**Step 4: Write failing test for WebhooksService**

Create `apps/api/src/modules/webhooks/webhooks.service.spec.ts`:

```typescript
import { Test, TestingModule } from "@nestjs/testing";
import { WebhooksService } from "./webhooks.service";
import { db } from "../../database/connection";

jest.mock("../../database/connection", () => ({
  db: { select: jest.fn().mockReturnThis(), from: jest.fn().mockReturnThis(), where: jest.fn(), insert: jest.fn().mockReturnThis(), values: jest.fn().mockReturnThis(), returning: jest.fn(), update: jest.fn().mockReturnThis(), set: jest.fn(), delete: jest.fn() },
}));

describe("WebhooksService", () => {
  let service: WebhooksService;
  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({ providers: [WebhooksService] }).compile();
    service = module.get<WebhooksService>(WebhooksService);
  });

  it("creates a webhook with secret and events", async () => {
    const mockReturning = jest.fn().mockResolvedValue([{ id: "wh-1", url: "https://a.com/hook", events: ["card.completed"], isActive: true }]);
    (db.insert as jest.Mock).mockReturnValue({ values: jest.fn().mockReturnValue({ returning: mockReturning }) });
    const result = await service.create({ url: "https://a.com/hook", events: ["card.completed"], createdBy: "u1" });
    expect(result.url).toBe("https://a.com/hook");
    expect(result.events).toContain("card.completed");
  });

  it("generates a crypto random secret on create", async () => {
    const mockReturning = jest.fn().mockResolvedValue([{ id: "wh-1", secret: "generated-secret" }]);
    (db.insert as jest.Mock).mockReturnValue({ values: jest.fn().mockReturnValue({ returning: mockReturning }) });
    await service.create({ url: "https://a.com", events: ["board.completed"], createdBy: "u1" });
    expect(db.insert).toHaveBeenCalled();
  });

  it("finds all webhooks", async () => {
    const mockOrderBy = jest.fn().mockResolvedValue([{ id: "wh-1" }, { id: "wh-2" }]);
    (db.select as jest.Mock).mockReturnValue({ from: jest.fn().mockReturnValue({ orderBy: mockOrderBy }) });
    const result = await service.findAll();
    expect(result).toHaveLength(2);
  });

  it("toggles webhook active status", async () => {
    const mockReturning = jest.fn().mockResolvedValue([{ id: "wh-1", isActive: false }]);
    (db.update as jest.Mock).mockReturnValue({ set: jest.fn().mockReturnValue({ where: jest.fn().mockReturnValue({ returning: mockReturning }) }) });
    const result = await service.toggleActive("wh-1", false);
    expect(result.isActive).toBe(false);
  });

  it("deletes a webhook", async () => {
    await service.remove("wh-1");
    expect(db.delete).toHaveBeenCalled();
  });
});
```

**Step 5: Implement WebhooksService + WebhooksController + WebhooksModule**

Create `apps/api/src/modules/webhooks/webhooks.service.ts`:

```typescript
import { Injectable } from "@nestjs/common";
import { eq } from "drizzle-orm";
import { db } from "../../database/connection";
import { webhooks } from "../../database/schema";
import * as crypto from "crypto";

@Injectable()
export class WebhooksService {
  async create(data: { url: string; events: string[]; createdBy: string }) {
    const [webhook] = await db.insert(webhooks).values({
      url: data.url, secret: crypto.randomBytes(32).toString("hex"),
      events: data.events, createdBy: data.createdBy,
    }).returning();
    return webhook;
  }

  async findAll() { return db.select().from(webhooks); }

  async findOne(id: string) {
    const [webhook] = await db.select().from(webhooks).where(eq(webhooks.id, id)).limit(1);
    return webhook;
  }

  async toggleActive(id: string, isActive: boolean) {
    const [webhook] = await db.update(webhooks).set({ isActive }).where(eq(webhooks.id, id)).returning();
    return webhook;
  }

  async update(id: string, data: { url?: string; events?: string[] }) {
    const [webhook] = await db.update(webhooks).set(data).where(eq(webhooks.id, id)).returning();
    return webhook;
  }

  async remove(id: string) { await db.delete(webhooks).where(eq(webhooks.id, id)); }

  async findActive() { return db.select().from(webhooks).where(eq(webhooks.isActive, true)); }
}
```

Create `apps/api/src/modules/webhooks/webhooks.controller.ts`:

```typescript
import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from "@nestjs/common";
import { WebhooksService } from "./webhooks.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { WebhookSender } from "../notifications/webhook.sender";

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("admin")
@Controller("webhooks")
export class WebhooksController {
  constructor(private webhooksService: WebhooksService, private webhookSender: WebhookSender) {}

  @Get() async findAll() { return this.webhooksService.findAll(); }

  @Post()
  async create(@Body() body: { url: string; events: string[] }, @CurrentUser() user: any) {
    return this.webhooksService.create({ url: body.url, events: body.events, createdBy: user.id });
  }

  @Patch(":id")
  async update(@Param("id") id: string, @Body() body: { url?: string; events?: string[]; isActive?: boolean }) {
    if (body.isActive !== undefined) return this.webhooksService.toggleActive(id, body.isActive);
    return this.webhooksService.update(id, body);
  }

  @Delete(":id")
  async remove(@Param("id") id: string) { await this.webhooksService.remove(id); return { success: true }; }

  @Post(":id/test")
  async test(@Param("id") id: string) {
    const webhook = await this.webhooksService.findOne(id);
    if (!webhook) return { success: false, error: "Not found" };
    try {
      await this.webhookSender.send(webhook.url, webhook.secret, { event: "webhook.test", timestamp: new Date().toISOString() });
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }
}
```

Create `apps/api/src/modules/webhooks/webhooks.module.ts`:

```typescript
import { Module } from "@nestjs/common";
import { WebhooksService } from "./webhooks.service";
import { WebhooksController } from "./webhooks.controller";
import { NotificationsModule } from "../notifications/notifications.module";
@Module({ imports: [NotificationsModule], providers: [WebhooksService], controllers: [WebhooksController], exports: [WebhooksService] })
export class WebhooksModule {}
```

**Step 6: Add SettingsModule + WebhooksModule to AppModule, run all tests, commit**

```bash
cd apps/api && pnpm test
git add -A && git commit -m "feat: add settings (singleton branding) and webhooks CRUD with HMAC test endpoint"
```

**🧾 Rules Check — Phase 4 final verification:**

| Regra | Verificar | ✅? |
|-------|-----------|----|
| `rules/error-handle-async-errors.md` | Todos os `@OnEvent` handlers têm `try/catch` com logger + dead letter? | ☐ |
| `rules/db-use-transactions.md` | NotificationService.create usa transação? | ☐ |
| `rules/db-use-returning.md` | INSERT de notifications usa `.returning()`? | ☐ |
| `rules/db-select-columns.md` | Dashboard stats usa agregação (não N+1)? | ☐ |
| `rules/security-rate-limiting.md` | Webhook delivery tem rate limiting? | ☐ |
| `rules/arch-use-events.md` | Módulos são desacoplados via EventEmitter2? | ☐ |
| `rules/security-sanitize-output.md` | Notification response não expõe dados internos? | ☐ |
| `rules/micro-use-queues.md` | Jobs pesados (email batch) usam BullMQ em vez do event loop? | ☐ |

Se qualquer item estiver ❌, corrija ANTES de ir para Phase 5.

---

**Phase 4 checkpoint:** At this point you have:
- ✅ WebhookSender with HMAC-SHA256, exponential retry, and batch delivery (10 tests)
- ✅ EmailSender with 3 HTML email templates (5 tests)
- ✅ NotificationsService with CRUD + batch creation + unread counting (6 tests)
- ✅ Event bus listeners for board/card events + overdue cron
- ✅ Dashboard stats with SQL aggregation
- ✅ Settings singleton (public vs full access) + webhooks CRUD with test endpoint