---
title: Use Repository Pattern for Data Access
impact: HIGH
impactDescription: Decouples business logic from database
tags: architecture, repository, data-access
---

## Use Repository Pattern for Data Access

Create custom repositories to encapsulate complex queries and database logic. This keeps services focused on business logic, makes testing easier with mock repositories, and allows changing database implementations without affecting business code.

**Incorrect (complex queries in services):**

```typescript
@Injectable()
export class UsersService {
  constructor(private db: DrizzleDb) {}

  async findActiveWithMinOrders(minOrders: number): Promise<User[]> {
    // Complex query logic mixed with business logic
    return this.db.select({...})
      .from(users)
      .leftJoin(orders, eq(users.id, orders.userId))
      .where(and(eq(users.isActive, true), isNull(users.deletedAt)))
      .groupBy(users.id)
      .having(sql`count(${orders.id}) >= ${minOrders}`);
  }
}
```

**Correct (custom repository with encapsulated queries):**

```typescript
@Injectable()
export class UsersRepository {
  constructor(private db: DrizzleDb) {}

  async findById(id: string): Promise<User | null> {
    const [user] = await this.db.select().from(users)
      .where(and(eq(users.id, id), isNull(users.deletedAt)))
      .limit(1);
    return user ?? null;
  }

  async findActiveWithMinOrders(minOrders: number): Promise<User[]> {
    return this.db.select({...})
      .from(users)
      .leftJoin(orders, eq(users.id, orders.userId))
      .where(and(eq(users.isActive, true), isNull(users.deletedAt)))
      .groupBy(users.id)
      .having(sql`count(${orders.id}) >= ${minOrders}`);
  }

  async save(data: typeof users.$inferInsert): Promise<User> {
    const [created] = await this.db.insert(users).values(data).returning();
    return created;
  }
}

// Clean service with business logic only
@Injectable()
export class UsersService {
  constructor(private usersRepo: UsersRepository) {}

  async create(dto: CreateUserDto): Promise<User> {
    const existing = await this.usersRepo.findByEmail(dto.email);
    if (existing) throw new ConflictException('Email already registered');
    return this.usersRepo.save(dto);
  }
}
```

Reference: [Repository Pattern](https://martinfowler.com/eaaCatalog/repository.html)
