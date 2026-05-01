---
title: Use DTOs and Serialization for API Responses
impact: MEDIUM
impactDescription: Response DTOs prevent accidental data exposure and ensure consistency
tags: api, dto, serialization, class-transformer
---

## Use DTOs and Serialization for API Responses

Never return entity objects directly from controllers. Use response DTOs with `@Exclude()` and `@Expose()` decorators to control exactly what data is sent to clients. This prevents accidental exposure of sensitive fields and provides a stable API contract.

**Incorrect (returning entities directly):**

```typescript
@Controller('users')
export class UsersController {
  @Get(':id')
  async findOne(@Param('id') id: string): Promise<User> {
    return this.usersService.findById(id);
    // Returns: { id, email, passwordHash, ssn, internalNotes, ... }
  }
}
```

**Correct (use class-transformer with response DTOs):**

```typescript
// Enable globally
app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

// Entity with serialization control
@Entity()
export class User {
  @Column() @Exclude() passwordHash: string;
  @Column() @Exclude() ssn: string;
  @Column() @Exclude({ toPlainOnly: true }) isAdmin: boolean;
}

// Now returning entity is safe
@Controller('users')
export class UsersController {
  @Get(':id')
  async findOne(@Param('id') id: string): Promise<User> {
    return this.usersService.findById(id);
    // Returns: { id, email, name, createdAt } — sensitive fields excluded
  }
}

// For different response shapes, use explicit DTOs
export class UserResponseDto {
  @Expose() id: string;
  @Expose() email: string;
  @Expose() name: string;
  @Expose() @Transform(({ obj }) => obj.posts?.length || 0) postCount: number;

  constructor(partial: Partial<User>) { Object.assign(this, partial); }
}
```

Reference: [NestJS Serialization](https://docs.nestjs.com/techniques/serialization)
