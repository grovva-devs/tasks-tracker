import { Injectable } from "@nestjs/common";
import { eq } from "drizzle-orm";
import { db } from "../../database/connection";
import { settings } from "../../database/schema";

@Injectable()
export class SettingsService {
  private async getOrCreate() {
    const [existing] = await db
      .select({
        id: settings.id,
        companyName: settings.companyName,
        logoUrl: settings.logoUrl,
        primaryColor: settings.primaryColor,
        emailFrom: settings.emailFrom,
        createdAt: settings.createdAt,
        updatedAt: settings.updatedAt,
      })
      .from(settings)
      .limit(1);

    if (existing) return existing;

    const [created] = await db.insert(settings).values({}).returning();
    return created;
  }

  async getPublic() {
    const s = await this.getOrCreate();
    return { companyName: s.companyName, logoUrl: s.logoUrl, primaryColor: s.primaryColor };
  }

  async getFull() {
    return this.getOrCreate();
  }

  async update(data: Partial<typeof settings.$inferInsert>) {
    const s = await this.getOrCreate();
    const [updated] = await db
      .update(settings)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(settings.id, s.id))
      .returning();
    return updated;
  }
}