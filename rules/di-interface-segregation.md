---
title: Apply Interface Segregation Principle
impact: HIGH
impactDescription: Reduces coupling and improves testability by 30-50%
tags: dependency-injection, interfaces, solid, isp
---

## Apply Interface Segregation Principle

Clients should not be forced to depend on interfaces they don't use. Keep interfaces small and focused on specific capabilities rather than creating "fat" interfaces.

**Incorrect (fat interface):**

```typescript
interface NotificationService {
  sendEmail(to, subject, body): Promise<void>;
  sendSms(phone, message): Promise<void>;
  sendPush(userId, notification): Promise<void>;
  sendSlack(channel, message): Promise<void>;
  // 8 methods when only 1 is needed
}
```

**Correct (segregated interfaces):**

```typescript
interface EmailSender { sendEmail(to, subject, body): Promise<void>; }
interface SmsSender { sendSms(phone, message): Promise<void>; }
interface PushSender { sendPush(userId, notification): Promise<void>; }

// Implementation can implement multiple
@Injectable()
export class NotificationService implements EmailSender, SmsSender, PushSender {
  async sendEmail(...) { /* ... */ }
  async sendSms(...) { /* ... */ }
  async sendPush(...) { /* ... */ }
}

// Consumer depends only on what it needs
export const EMAIL_SENDER = Symbol('EMAIL_SENDER');
@Injectable()
export class OrdersService {
  constructor(@Inject(EMAIL_SENDER) private emailSender: EmailSender) {}
  // Minimal dependency — easy to mock
}
```

Reference: [Interface Segregation Principle](https://en.wikipedia.org/wiki/Interface_segregation_principle)
