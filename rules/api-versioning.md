---
title: Use API Versioning for Breaking Changes
impact: MEDIUM
impactDescription: Versioning allows you to evolve APIs without breaking existing clients
tags: api, versioning, breaking-changes, compatibility
---

## Use API Versioning for Breaking Changes

Use NestJS built-in versioning when making breaking changes to your API. Choose a versioning strategy (URI, header, or media type) and apply it consistently.

**Incorrect (breaking changes without versioning):**

```typescript
@Controller('users')
export class UsersController {
  @Get(':id')
  async findOne(@Param('id') id: string): Promise<User> {
    // Changed response format — old clients break!
    return this.usersService.findOne(id);
  }
}
```

**Correct (use NestJS built-in versioning):**

```typescript
// Enable in main.ts
app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });

// Version-specific controllers
@Controller('users')
@Version('1')
export class UsersV1Controller {
  @Get(':id')
  async findOne(@Param('id') id: string): Promise<UserV1Response> {
    // V1 response format
    return this.usersService.findOne(id);
  }
}

@Controller('users')
@Version('2')
export class UsersV2Controller {
  @Get(':id')
  async findOne(@Param('id') id: string): Promise<UserV2Response> {
    // V2 response format with breaking changes
    return this.usersService.findOne(id);
  }
}

// Mark deprecated versions
@Controller('users')
@Version('1')
@UseInterceptors(DeprecationInterceptor)
export class UsersV1Controller { /* ... */ }
```

Reference: [NestJS Versioning](https://docs.nestjs.com/techniques/versioning)
