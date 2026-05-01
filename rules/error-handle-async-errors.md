---
title: Handle Async Errors Properly
impact: HIGH
impactDescription: Prevents process crashes from unhandled rejections
tags: error-handling, async, promises
---

## Handle Async Errors Properly

NestJS automatically catches errors from async route handlers, but errors from background tasks, event handlers, and manually created promises can crash your application. Always handle async errors explicitly and use global handlers as a safety net.

**Incorrect (fire-and-forget without error handling):**

```typescript
@Injectable()
export class UsersService {
  async createUser(dto: CreateUserDto): Promise<User> {
    const user = await this.repo.save(dto);
    this.emailService.sendWelcome(user.email); // Unhandled promise!
    return user;
  }
}
```

**Correct (explicit async error handling):**

```typescript
@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  async createUser(dto: CreateUserDto): Promise<User> {
    const user = await this.repo.save(dto);
    this.emailService.sendWelcome(user.email).catch((error) => {
      this.logger.error('Failed to send welcome email', error.stack);
    });
    return user;
  }
}

// Event handlers with try/catch
@Injectable()
export class OrdersService {
  @OnEvent('order.created')
  async handleOrderCreated(event: OrderCreatedEvent): Promise<void> {
    try {
      await this.processOrder(event);
    } catch (error) {
      this.logger.error('Failed to process order', { event, error });
      await this.deadLetterQueue.add('order.created', event);
    }
  }
}
```

Reference: [Node.js Unhandled Rejections](https://nodejs.org/api/process.html#event-unhandledrejection)
