import { Injectable, NotFoundException } from "@nestjs/common";
import { eq } from "drizzle-orm";
import { db } from "../../../database/connection";
import { templateCategories } from "../../../database/schema";

@Injectable()
export class CategoriesService {
  async create(data: { name: string; description?: string; position?: number }) {
    const [category] = await db
      .insert(templateCategories)
      .values({
        name: data.name,
        description: data.description ?? null,
        position: data.position ?? 0,
      })
      .returning();
    return category;
  }

  async findAll() {
    return db
      .select({
        id: templateCategories.id,
        name: templateCategories.name,
        description: templateCategories.description,
        position: templateCategories.position,
        createdAt: templateCategories.createdAt,
      })
      .from(templateCategories)
      .orderBy(templateCategories.position);
  }

  async findOne(id: string) {
    const [category] = await db
      .select({
        id: templateCategories.id,
        name: templateCategories.name,
        description: templateCategories.description,
        position: templateCategories.position,
        createdAt: templateCategories.createdAt,
      })
      .from(templateCategories)
      .where(eq(templateCategories.id, id))
      .limit(1);

    if (!category) throw new NotFoundException("Category not found");
    return category;
  }

  async update(id: string, data: { name?: string; description?: string; position?: number }) {
    const [category] = await db
      .update(templateCategories)
      .set(data)
      .where(eq(templateCategories.id, id))
      .returning();

    if (!category) throw new NotFoundException("Category not found");
    return category;
  }

  async reorder(items: { id: string; position: number }[]) {
    for (const item of items) {
      await db
        .update(templateCategories)
        .set({ position: item.position })
        .where(eq(templateCategories.id, item.id));
    }
  }

  async remove(id: string) {
    await db.delete(templateCategories).where(eq(templateCategories.id, id));
  }
}