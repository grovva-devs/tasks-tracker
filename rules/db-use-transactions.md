---
title: Use Transactions for Multi-Step Operations
impact: HIGH
impactDescription: Ensures data consistency in multi-step operations
tags: database, transactions, drizzle, consistency
---

## Use Transactions for Multi-Step Operations

When multiple database operations must succeed or fail together, wrap them in a Drizzle transaction. This prevents partial updates that leave your data in an inconsistent state. Use `db.transaction()` for automatic rollback on errors.

**Incorrect (multiple operations without transaction):**

```typescript
@Injectable()
export class OrdersService {
  constructor(private db: DrizzleDb) {}

  async createOrder(userId: string, items: OrderItem[]): Promise<Order> {
    // If any step fails, data is inconsistent
    const [order] = await this.db.insert(ordersTable).values({
      userId, status: 'pending',
    }).returning();

    await this.db.insert(orderItemsTable).values(
      items.map(item => ({ ...item, orderId: order.id }))
    );

    // If payment fails, order and inventory already modified!
    await this.paymentService.charge(order.id);
    return order;
  }
}
```

**Correct (use db.transaction for automatic rollback):**

```typescript
@Injectable()
export class OrdersService {
  constructor(private db: DrizzleDb) {}

  async createOrder(userId: string, items: OrderItemDto[]): Promise<Order> {
    return this.db.transaction(async (tx) => {
      const [order] = await tx.insert(ordersTable).values({
        userId, status: 'pending',
      }).returning();

      await tx.insert(orderItemsTable).values(
        items.map(item => ({ orderId: order.id, ...item }))
      ).returning();

      // Verify stock within the same transaction
      for (const item of items) {
        const [updated] = await tx.update(inventoryTable)
          .set({ stock: sql`${inventoryTable.stock} - ${item.quantity}` })
          .where(eq(inventoryTable.productId, item.productId))
          .returning();

        if (updated.stock < 0) {
          throw new ConflictException('Insufficient stock');
          // Transaction automatically rolls back all changes!
        }
      }

      return order;
    });
  }
}

// Manual transaction control with savepoints
@Injectable()
export class ImportService {
  constructor(private db: DrizzleDb) {}

  async importRecords(records: ImportRecord[]): Promise<ImportResult> {
    const successIds: string[] = [];
    const failures: Failure[] = [];

    for (const record of records) {
      try {
        await this.db.transaction(async (tx) => {
          await tx.insert(productsTable).values(record).onConflictDoNothing();
        });
        successIds.push(record.id);
      } catch (error) {
        failures.push({ id: record.id, reason: error.message });
      }
    }

    return { successIds, failures };
  }
}
```

Reference: [Drizzle Transactions](https://orm.drizzle.team/docs/transactions)