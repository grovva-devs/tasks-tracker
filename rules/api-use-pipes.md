---
title: Use Pipes for Input Transformation
impact: MEDIUM
impactDescription: Pipes ensure clean, validated data reaches your handlers
tags: api, pipes, validation, transformation
---

## Use Pipes for Input Transformation

Use built-in pipes like `ParseIntPipe`, `ParseUUIDPipe`, and `DefaultValuePipe` for common transformations. Create custom pipes for business-specific transformations. Pipes separate validation/transformation logic from controllers.

**Incorrect (manual type parsing in handlers):**

```typescript
@Controller('users')
export class UsersController {
  @Get(':id')
  async findOne(@Param('id') id: string): Promise<User> {
    const uuid = id.trim();
    if (!isUUID(uuid)) throw new BadRequestException('Invalid UUID');
    return this.usersService.findOne(uuid);
  }
}
```

**Correct (use built-in and custom pipes):**

```typescript
@Controller('users')
export class UsersController {
  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<User> {
    return this.usersService.findOne(id);
  }

  @Get()
  async findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ): Promise<User[]> {
    return this.usersService.findAll(page, limit);
  }
}

// Global validation pipe
app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: { enableImplicitConversion: true },
  }),
);
```

Reference: [NestJS Pipes](https://docs.nestjs.com/pipes)
