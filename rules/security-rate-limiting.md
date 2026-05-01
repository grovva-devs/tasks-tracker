---
title: Implement Rate Limiting
impact: HIGH
impactDescription: Protects against abuse and ensures fair resource usage
tags: security, rate-limiting, throttler, protection
---

## Implement Rate Limiting

Use `@nestjs/throttler` to limit request rates per client. Apply different limits for different endpoints — stricter for auth, more relaxed for reads.

```typescript
ThrottlerModule.forRoot([
  { name: 'short', ttl: 1000, limit: 3 },
  { name: 'medium', ttl: 10000, limit: 20 },
  { name: 'long', ttl: 60000, limit: 100 },
]),

@Controller('auth')
export class AuthController {
  @Post('login')
  @Throttle({ short: { limit: 5, ttl: 60000 } }) // 5 per minute
  async login(@Body() dto: LoginDto) { /* ... */ }

  @Post('forgot-password')
  @Throttle({ short: { limit: 3, ttl: 3600000 } }) // 3 per hour
  async forgotPassword(@Body() dto: ForgotPasswordDto) { /* ... */ }
}
```

Reference: [NestJS Throttler](https://docs.nestjs.com/security/rate-limiting)
