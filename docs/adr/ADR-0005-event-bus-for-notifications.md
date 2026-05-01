---
title: "Internal event bus over direct service calls for notification pipeline"
date: 2025-04-30
status: Proposed
---

# ADR-0005: Internal Event Bus for Notification Pipeline

## Context

When key actions happen in Onboarding Tracker (card moved, card completed, board completed, card assigned), the system must trigger side effects:

- Create in-app notifications for team members
- Send email to clients
- Fire webhooks to external systems

There are two approaches to connecting these side effects to the core CRUD operations:

1. **Direct service calls** — the CardsService directly calls NotificationsService, EmailSender, and WebhookSender after performing the CRUD operation.
2. **Internal event bus** — the CardsService emits an event after the operation. The NotificationsModule subscribes to those events and handles all side effects independently.

## Decision

We will use an **internal event bus** (EventEmitter2) to decouple core CRUD operations from the notification pipeline.

## Alternatives Considered

### A: Direct service calls

```typescript
// Inside CardsService.moveCard()
await this.notificationsService.notifyCardCompleted(card);
await this.emailSender.sendClientEmail(card);
await this.webhookSender.fire('card.completed', payload);
```

- **Pros**: Simple to trace, synchronous (easier debugging), obvious call flow
- **Cons**: CardsService now depends on NotificationsService, EmailSender, WebhookSender — tight coupling. Adding a new notification type means modifying CardsService. Failed webhook/email could block the card move response. Circular dependency risk between modules.

### B: Internal event bus (chosen)

```typescript
// Inside CardsService.moveCard()
await this.eventBus.emit('card.completed', { card, board });

// Inside NotificationsModule (separate, subscribed)
@OnEvent('card.completed')
async handleCardCompleted(payload) {
  await this.createInAppNotification(payload);
  await this.sendClientEmail(payload);
  await this.fireWebhooks(payload);
}
```

- **Pros**: CardsService stays focused on CRUD. Notification logic is isolated. Adding new event consumers requires zero changes to core modules. Failed notifications don't block card operations.
- **Cons**: Implicit flow — harder to trace all side effects by reading CardsService alone. Event names must be documented. Async by default — operations that need immediate feedback (e.g., "notification created" count) require extra handling.

### C: Message queue (Redis / RabbitMQ)

- **Rejected**: Massively over-engineered for a single-org system with ~10 concurrent users. Adds operational complexity (Redis/RabbitMQ dependency, message durability concerns).

## Consequences

**Positive:**
- Core CRUD modules (Cards, Boards) stay thin and focused
- Notification/webhook logic can evolve independently
- Failed notifications don't impact user-facing CRUD operations
- Easy to add new event consumers (e.g., audit log in V2) without touching core modules
- Testable — can emit events in isolation and verify subscribers react correctly

**Negative:**
- Implicit flow — reading CardsService alone doesn't reveal all side effects
- Event names are a contract that must be documented and versioned carefully
- No built-in delivery guarantee — if the process crashes after emit but before handler completes, the event is lost
- Async handlers can fail silently if not properly error-logged

**Mitigations:**
- Define all event names and payloads in `packages/shared/src/constants/events.ts` as a canonical contract
- Every handler must wrap its logic in try/catch with structured logging
- Consider V2 event persistence (store "pending notifications" in DB before emiting) if delivery guarantees become critical
- Document the event flow in the architecture README