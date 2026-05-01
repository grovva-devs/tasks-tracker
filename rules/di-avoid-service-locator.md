---
title: Avoid Service Locator Anti-Pattern
impact: HIGH
impactDescription: Hides dependencies and breaks testability
tags: dependency-injection, anti-patterns, testing
---

## Avoid Service Locator Anti-Pattern

Avoid using `ModuleRef.get()` or global containers to resolve dependencies at runtime. This hides dependencies, makes code harder to test, and breaks the benefits of dependency injection. Use constructor injection instead.

**Incorrect:**

```typescript
@Injectable()
export class OrdersService {
  constructor(private moduleRef: ModuleRef) {}
  async createOrder(dto) {
    const usersService = this.moduleRef.get(UsersService); // Hidden!
    const inventoryService = this.moduleRef.get(InventoryService); // Hidden!
  }
}
```

**Correct:**

```typescript
@Injectable()
export class OrdersService {
  constructor(
    private usersService: UsersService,
    private inventoryService: InventoryService,
    private paymentService: PaymentService,
  ) {}
  // Dependencies are clear and testable
}
```

Reference: [NestJS Module Reference](https://docs.nestjs.com/fundamentals/module-ref)
