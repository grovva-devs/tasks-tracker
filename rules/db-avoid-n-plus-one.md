---
title: Avoid N+1 Query Problems
impact: HIGH
impactDescription: N+1 queries are one of the most common performance killers
tags: database, n-plus-one, queries, performance, drizzle
---

## Avoid N+1 Query Problems

N+1 queries occur when you fetch a list of entities, then make an additional query for each entity to load related data. Use Drizzle's relational query builder (`db.query` with `with`), explicit JOINs, or batch loading with `.inArray()` to avoid this pattern.

**Incorrect (lazy loading in loops causes N+1):**

```typescript
@Injectable()
export class OrdersService {
  constructor(private db: DrizzleDb) {}

  async getOrdersWithItems(userId: string): Promise<Order[]> {
    const orders = await this.db.select().from(ordersTable)
      .where(eq(ordersTable.userId, userId));
    // 1 query for orders

    for (const order of orders) {
      // N additional queries - one per order!
      order.items = await this.db.select().from(orderItems)
        .where(eq(orderItems.orderId, order.id));
    }

    return orders;
  }
}
```

**Correct (use Drizzle relational queries or explicit JOINs):**

```typescript
// Option 1: Use db.query with `with` for nested data
@Injectable()
export class OrdersService {
  constructor(private db: DrizzleDb) {}

  async getOrdersWithItems(userId: string): Promise<Order[]> {
    return this.db.query.orders.findMany({
      where: eq(ordersTable.userId, userId),
      with: { items: true },
    });
  }
}

// Option 2: Explicit JOINs for flat data
async getUsersWithPostCounts(): Promise<UserWithPostCount[]> {
  return this.db.select({
    userId: users.id,
    userName: users.name,
    postCount: sql<number>`count(${posts.id})`,
  })
  .from(users)
  .leftJoin(posts, eq(users.id, posts.ownerId))
  .groupBy(users.id);
}

// Option 3: Batch with .inArray()
async getOrdersWithItems(userId: string) {
  const orders = await this.db.select().from(ordersTable)
    .where(eq(ordersTable.userId, userId));

  const orderIds = orders.map(o => o.id);
  const allItems = await this.db.select().from(orderItems)
    .where(inArray(orderItems.orderId, orderIds));

  // Map items to orders in-memory
  return orders.map(order => ({
    ...order,
    items: allItems.filter(item => item.orderId === order.id),
  }));
}

// ⚠️ RQB Warning: Multiple `many` relations in `with` can generate slow LATERAL JOINs.
// If performance degrades, split into parallel queries with Promise.all().
```

Reference: [Drizzle ORM Relations](https://orm.drizzle.team/docs/rqb)