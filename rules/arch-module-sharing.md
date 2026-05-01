---
title: Use Proper Module Sharing Patterns
impact: CRITICAL
impactDescription: Prevents duplicate instances, memory leaks, and state inconsistency
tags: architecture, modules, sharing, exports
---

## Use Proper Module Sharing Patterns

NestJS modules are singletons by default. When a service is properly exported from a module and that module is imported elsewhere, the same instance is shared. However, providing a service in multiple modules creates separate instances, leading to memory waste, state inconsistency, and confusing behavior. Always encapsulate services in dedicated modules, export them explicitly, and import the module where needed.

**Incorrect (service provided in multiple modules):**

```typescript
// StorageService provided directly in multiple modules - WRONG
@Injectable()
export class StorageService {
  private cache = new Map(); // Each instance has separate state!
}

@Module({ providers: [StorageService], ... }) // Instance #1
export class AppModule {}

@Module({ providers: [StorageService], ... }) // Instance #2 - different!
export class VideosModule {}
```

**Correct (dedicated module with exports):**

```typescript
@Module({
  providers: [StorageService],
  exports: [StorageService],
})
export class StorageModule {}

@Module({ imports: [StorageModule], ... }) // Same instance shared
export class VideosModule {}

@Module({ imports: [StorageModule], ... }) // Same instance shared
export class ChannelsModule {}

// WARNING: Don't make everything @Global()!
// - Hides dependencies
// - Makes testing harder
// - Reserve for: config, logging, database connections only
```

Reference: [NestJS Modules](https://docs.nestjs.com/modules#shared-modules)
