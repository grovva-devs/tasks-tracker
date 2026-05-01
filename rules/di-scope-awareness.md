---
title: Understand Provider Scopes
impact: CRITICAL
impactDescription: Prevents data leaks and performance issues
tags: dependency-injection, scopes, request-context
---

## Understand Provider Scopes

NestJS has three provider scopes: DEFAULT (singleton), REQUEST (per-request instance), and TRANSIENT (new instance for each injection). Most providers should be singletons. Request-scoped providers have performance implications as they bubble up through the dependency tree.

**Incorrect:**

```typescript
// Request-scoped when not needed
@Injectable({ scope: Scope.REQUEST })
export class UsersService { /* Creates new instance for EVERY request! */ }

// Singleton with mutable request state
@Injectable() // Default: singleton
export class RequestContextService {
  private userId: string; // DANGER: Shared across all requests!
}
```

**Correct:**

```typescript
// Singleton for stateless services (default, most common)
@Injectable()
export class UsersService { /* ... */ }

// Better: Use ClsModule for request context (no scope bubble-up)
import { ClsService } from 'nestjs-cls';

@Injectable() // Stays singleton!
export class AuditService {
  constructor(private cls: ClsService) {}
  log(action: string) {
    const userId = this.cls.get('userId');
    console.log(`User ${userId} performed ${action}`);
  }
}
```

Reference: [NestJS Injection Scopes](https://docs.nestjs.com/fundamentals/injection-scopes)
