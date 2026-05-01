---
title: Implement Secure JWT Authentication
impact: CRITICAL
impactDescription: Essential for secure APIs
tags: security, jwt, authentication, tokens
---

## Implement Secure JWT Authentication

Use `@nestjs/jwt` with `@nestjs/passport` for authentication. Store secrets securely, use appropriate token lifetimes, implement refresh tokens, and validate tokens properly. Never expose sensitive data in JWT payloads.

**Key rules:**
- JWT secret from ConfigService, never hardcoded
- Access token: 15 min, Refresh token: 7 days with hash storage
- Minimal payload: `{ sub, email, roles }` — NEVER password
- Validate user still exists and is active in `validate()`
- Check `passwordChangedAt` against token `iat`
- Register JwtAuthGuard globally, use `@Public()` for open routes

```typescript
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService, private usersService: UsersService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: config.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.usersService.findById(payload.sub);
    if (!user || !user.isActive) throw new UnauthorizedException();
    if (user.passwordChangedAt && new Date(payload.iat * 1000) < user.passwordChangedAt)
      throw new UnauthorizedException('Token invalidated by password change');
    return user;
  }
}
```

Reference: [NestJS Authentication](https://docs.nestjs.com/security/authentication)
