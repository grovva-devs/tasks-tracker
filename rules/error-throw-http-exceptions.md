---
title: Throw HTTP Exceptions from Services
impact: HIGH
impactDescription: Keeps controllers thin and simplifies error handling
tags: error-handling, exceptions, services
---

## Throw HTTP Exceptions from Services

It's acceptable (and often preferable) to throw `HttpException` subclasses from services in HTTP applications. This keeps controllers thin and allows services to communicate appropriate error states.

**Incorrect (return error objects instead of throwing):**

```typescript
@Injectable()
export class UsersService {
  async findById(id: string): Promise<{ user?: User; error?: string }> {
    const user = await this.repo.findOne({ where: { id } });
    if (!user) return { error: 'User not found' };
    return { user };
  }
}
```

**Correct (throw exceptions directly from service):**

```typescript
@Injectable()
export class UsersService {
  async findById(id: string): Promise<User> {
    const user = await this.repo.findOne({ where: { id } });
    if (!user) throw new NotFoundException(`User #${id} not found`);
    return user;
  }

  async create(dto: CreateUserDto): Promise<User> {
    const existing = await this.repo.findOne({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email already registered');
    return this.repo.save(dto);
  }
}

// Controller stays thin
@Controller('users')
export class UsersController {
  @Get(':id')
  findOne(@Param('id') id: string): Promise<User> {
    return this.usersService.findById(id);
  }
}
```

Reference: [NestJS Exception Filters](https://docs.nestjs.com/exception-filters)
