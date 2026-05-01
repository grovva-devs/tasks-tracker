---
title: Use Interceptors for Cross-Cutting Concerns
impact: MEDIUM-HIGH
impactDescription: Interceptors provide clean separation for cross-cutting logic
tags: api, interceptors, logging, caching
---

## Use Interceptors for Cross-Cutting Concerns

Interceptors can transform responses, add logging, handle caching, and measure performance without polluting your business logic. They wrap the route handler execution, giving you access to both the request and response streams.

**Incorrect (logging and transformation in every method):**

```typescript
@Controller('users')
export class UsersController {
  @Get()
  async findAll(): Promise<User[]> {
    const start = Date.now();
    this.logger.log('findAll called');
    const users = await this.usersService.findAll();
    this.logger.log(`findAll completed in ${Date.now() - start}ms`);
    return users;
  }
}
```

**Correct (use interceptors for cross-cutting concerns):**

```typescript
// Logging interceptor
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url } = request;
    const now = Date.now();

    return next.handle().pipe(
      tap({
        next: () => this.logger.log(`${method} ${url} - ${Date.now() - now}ms`),
        error: (error) => this.logger.error(`${method} ${url} - ${Date.now() - now}ms`, error.stack),
      }),
    );
  }
}

// Register globally
@Module({
  providers: [
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
    { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
  ],
})
export class AppModule {}
```

Reference: [NestJS Interceptors](https://docs.nestjs.com/interceptors)
