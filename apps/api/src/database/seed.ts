import * as bcrypt from "bcrypt";
import { db } from "./connection";
import { users } from "./schema";

async function seed() {
  console.log("Seeding database...");

  const passwordHash = await bcrypt.hash("admin123", 10);

  await db
    .insert(users)
    .values({
      email: "admin@company.com",
      passwordHash,
      displayName: "Admin",
      role: "admin",
    })
    .onConflictDoNothing()
    .returning();

  console.log("Seed complete! Admin user: admin@company.com / admin123");
}

seed()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });