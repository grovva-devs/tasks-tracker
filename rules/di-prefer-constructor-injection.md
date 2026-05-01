---
title: Prefer Constructor Injection
impact: CRITICAL
impactDescription: Required for proper DI and testing
tags: dependency-injection, constructor, testing
---

## Prefer Constructor Injection

Always use constructor injection over property injection. Constructor injection makes dependencies explicit, enables TypeScript type checking, ensures dependencies are available when the class is instantiated, and improves testability.

**Incorrect (property injection with hidden dependencies):**

```typescript
@Injectable()
export class UsersService {
  @Inject() private userRepo: UserRepository; // Hidden dependency
  @Inject('CONFIG') private config: ConfigType; // Also hidden
}
```

**Correct (constructor injection with explicit dependencies):**

```typescript
@Injectable()
export class UsersService {
  constructor(
    private readonly userRepo: UserRepository,
    @Inject('CONFIG') private readonly config: ConfigType,
  ) {}

  // Easy to test:
  // new UsersService(mockRepo, mockConfig)
}
```

Only use `@Optional()` property injection for truly optional dependencies.

Reference: [NestJS Providers](https://docs.nestjs.com/providers)
