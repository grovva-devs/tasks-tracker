import { db } from "./connection";
import { users, templates, templateVariables, templateLists, templateCards } from "./schema";

/**
 * Seeds the database with sample template data for development.
 * Run with: pnpm db:seed:templates
 */
async function seedTemplates() {
  console.log("Seeding template data...");

  // Get first user for createdBy
  const [firstUser] = await db.select({ id: users.id }).from(users).limit(1);
  const createdBy = firstUser?.id ?? "00000000-0000-0000-0000-000000000000";

  // SaaS Onboarding Template
  const [saasTemplate] = await db
    .insert(templates)
    .values({
      name: "SaaS Onboarding",
      description: "Standard SaaS client onboarding with setup, training, and go-live phases",
      isDefault: true,
      createdBy,
    })
    .returning();

  if (saasTemplate) {
    await db.insert(templateVariables).values([
      { templateId: saasTemplate.id, key: "client_name", displayName: "Client Name", isRequired: true },
      { templateId: saasTemplate.id, key: "service_type", displayName: "Service Type", defaultValue: "SaaS Standard", isRequired: false },
      { templateId: saasTemplate.id, key: "start_date", displayName: "Project Start Date", isRequired: true },
    ]);

    // List: Setup
    const [setupList] = await db
      .insert(templateLists)
      .values({ templateId: saasTemplate.id, title: "Setup {{client_name}}", position: 0 })
      .returning();

    await db.insert(templateCards).values([
      { templateListId: setupList.id, title: "Welcome {{client_name}} — kick-off call", position: 0, dueDateOffsetDays: 0 },
      { templateListId: setupList.id, title: "Configure {{service_type}} environment", description: "Set up the {{service_type}} instance for {{client_name}}", position: 1, dueDateOffsetDays: 3 },
      { templateListId: setupList.id, title: "Send NDA and contracts", position: 2, dueDateOffsetDays: 2 },
    ]);

    // List: In Progress
    const [progressList] = await db
      .insert(templateLists)
      .values({ templateId: saasTemplate.id, title: "In Progress", position: 1, color: "#3B82F6" })
      .returning();

    await db.insert(templateCards).values([
      { templateListId: progressList.id, title: "Training sessions for {{client_name}} team", position: 0, dueDateOffsetDays: 7 },
      { templateListId: progressList.id, title: "Data migration", position: 1, dueDateOffsetDays: 10 },
    ]);

    // List: Done
    await db
      .insert(templateLists)
      .values({ templateId: saasTemplate.id, title: "Done", position: 2, color: "#22C55E" })
      .returning();

    console.log(`Created template: ${saasTemplate.name} (${saasTemplate.id})`);
  }

  // Consulting Onboarding Template
  const [consultingTemplate] = await db
    .insert(templates)
    .values({
      name: "Consulting Engagement",
      description: "Client onboarding for consulting and professional services",
      isDefault: false,
      createdBy,
    })
    .returning();

  if (consultingTemplate) {
    await db.insert(templateVariables).values([
      { templateId: consultingTemplate.id, key: "client_name", displayName: "Client Name", isRequired: true },
      { templateId: consultingTemplate.id, key: "engagement_type", displayName: "Engagement Type", defaultValue: "Advisory", isRequired: false },
    ]);

    const [planningList] = await db
      .insert(templateLists)
      .values({ templateId: consultingTemplate.id, title: "Planning", position: 0 })
      .returning();

    await db.insert(templateCards).values([
      { templateListId: planningList.id, title: "Discovery meeting with {{client_name}}", position: 0, dueDateOffsetDays: 0 },
      { templateListId: planningList.id, title: "Scope definition for {{engagement_type}}", position: 1, dueDateOffsetDays: 5 },
    ]);

    const [activeList] = await db
      .insert(templateLists)
      .values({ templateId: consultingTemplate.id, title: "Active", position: 1, color: "#3B82F6" })
      .returning();

    await db.insert(templateCards).values([
      { templateListId: activeList.id, title: "Weekly check-ins with {{client_name}}", position: 0, dueDateOffsetDays: 7 },
    ]);

    await db
      .insert(templateLists)
      .values({ templateId: consultingTemplate.id, title: "Concluído", position: 2, color: "#22C55E" })
      .returning();

    console.log(`Created template: ${consultingTemplate.name} (${consultingTemplate.id})`);
  }

  console.log("Template seed complete!");
}

seedTemplates()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });