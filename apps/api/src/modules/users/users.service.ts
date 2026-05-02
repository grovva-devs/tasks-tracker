import { Injectable } from "@nestjs/common";
import { eq } from "drizzle-orm";
import { db } from "../../database/connection";
import { users } from "../../database/schema";

@Injectable()
export class UsersService {
  async findByEmail(email: string) {
    const result = await db
      .select({
        id: users.id,
        email: users.email,
        passwordHash: users.passwordHash,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
        role: users.role,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    return result[0] ?? null;
  }

  async findById(id: string) {
    const result = await db
      .select({
        id: users.id,
        email: users.email,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
        role: users.role,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    return result[0] ?? null;
  }

  async create(data: {
    email: string;
    passwordHash: string;
    displayName: string;
    role: string;
  }) {
    const [user] = await db.insert(users).values(data).returning({
      id: users.id,
      email: users.email,
      displayName: users.displayName,
      avatarUrl: users.avatarUrl,
      role: users.role,
      createdAt: users.createdAt,
    });
    return user;
  }

  async findAll() {
    return db
      .select({
        id: users.id,
        email: users.email,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
        role: users.role,
        createdAt: users.createdAt,
      })
      .from(users);
  }

  async updateRole(id: string, role: string) {
    const [user] = await db
      .update(users)
      .set({ role, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning({
        id: users.id,
        email: users.email,
        displayName: users.displayName,
        role: users.role,
      });
    return user;
  }

  async remove(id: string) {
    await db.delete(users).where(eq(users.id, id));
  }
}