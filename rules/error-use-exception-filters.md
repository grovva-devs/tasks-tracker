---
title: Use Exception Filters for Error Handling
impact: HIGH
impactDescription: Consistent, centralized error handling
tags: error-handling, exception-filters, consistency
---

## Use Exception Filters for Error Handling

Never catch exceptions and manually format error responses in controllers. Use NestJS exception filters to handle errors consistently across your application. Create custom exception filters for specific error types and a global filter for unhandled exceptions.

**Correct (exception filters with consistent handling):**

```typescript
// Global exception filter
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly logger: Logger) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception instanceof HttpException ? exception.getStatus() : 500;

    this.logger.error(`${request.method} ${request.url}`, exception instanceof Error ? exception.stack : exception);

    response.status(status).json({
      statusCode: status,
      message: exception instanceof HttpException ? exception.message : 'Internal server error',
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}

// Register globally
app.useGlobalFilters(new AllExceptionsFilter(app.get(Logger)));
```

Reference: [NestJS Exception Filters](https://docs.nestjs.com/exception-filters)
