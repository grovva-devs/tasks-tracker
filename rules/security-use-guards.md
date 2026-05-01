---
title: Use Guards for Authentication and Authorization
impact: HIGH
impactDescription: Enforces access control before handlers execute
tags: security, guards, authentication, authorization
---

## Use Guards for Authentication and Authorization

Use guards instead of manual checks in controllers. Register globally and use decorators for role-based access.

```typescript
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}
  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>('roles', [
      context.getHandler(), context.getClass(),
    ]);
    if (!requiredRoles) return true;
    const { user } = context.switchToHttp().getRequest();
    return requiredRoles.some((role) => user.roles?.includes(role));
  }
}

export const Roles = (...roles: string[]) => SetMetadata('roles', roles);
export const Public = () => SetMetadata('isPublic', true);

// Register globally
@Module({ providers: [
  { provide: APP_GUARD, useClass: JwtAuthGuard },
  { provide: APP_GUARD, useClass: RolesGuard },
] })
export class AppModule {}

// Clean controller
@Controller('admin')
@Roles('admin')
export class AdminController {
  @Public() @Get('health') health() { return { status: 'ok' }; }
  @Get('users') getUsers() { return this.adminService.getUsers(); }
}
```

Reference: [NestJS Guards](https://docs.nestjs.com/guards)
