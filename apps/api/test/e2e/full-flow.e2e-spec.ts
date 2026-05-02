import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { AppModule } from "../../src/app.module";

/**
 * Full user flow e2e test:
 * 1. Login as admin
 * 2. Create a template with variables
 * 3. Apply template to create a board
 * 4. Verify board structure + resolved variables
 * 5. Add a list and a card
 * 6. Add a comment (internal + client)
 * 7. Move card to "Done" list → verify completion detection
 * 8. Access public board view
 * 9. Verify client can only see client-visible content
 */
describe("Full User Flow (e2e)", () => {
  let app: INestApplication;
  let authToken: string;
  let templateId: string;
  let boardId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix("api");
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  const authHeader = () => ({ Authorization: `Bearer ${authToken}` });

  // Step 1: Login
  it("logs in as admin", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/auth/login")
      .send({ email: "admin@company.com", password: "admin123" });

    expect(res.status).toBe(201);
    authToken = res.body.access_token;
    expect(authToken).toBeDefined();
  });

  // Step 2: Create template with variables and lists
  it("creates a template with variables and lists", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/templates")
      .set(authHeader())
      .send({
        name: "E2E Template",
        description: "Test template",
        variables: [
          { key: "client_name", displayName: "Client Name", isRequired: true },
          { key: "pkg", displayName: "Package", defaultValue: "Standard", isRequired: false },
        ],
        lists: [
          {
            title: "Setup {{client_name}}",
            position: 0,
            cards: [
              { title: "Welcome {{client_name}}", position: 0, dueDateOffsetDays: 0 },
              { title: "Configure {{pkg}} package", position: 1, dueDateOffsetDays: 3 },
            ],
          },
          { title: "In Progress", position: 1, cards: [{ title: "Training", position: 0, dueDateOffsetDays: 7 }] },
          { title: "Done", position: 2, cards: [] },
        ],
      });

    expect(res.status).toBe(201);
    templateId = res.body.id;
    expect(templateId).toBeDefined();
  });

  // Step 3: Apply template
  it("applies template to create a board with resolved variables", async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/templates/${templateId}/apply`)
      .set(authHeader())
      .send({
        clientName: "E2E Client",
        clientEmail: "e2e@client.com",
        variables: { client_name: "E2E Client", pkg: "Premium" },
      });

    expect(res.status).toBe(201);
    boardId = res.body.id;
    expect(res.body.clientName).toBe("E2E Client");
    expect(res.body.templateId).toBe(templateId);
  });

  // Step 4: Verify board structure
  it("verifies board lists have resolved variable titles", async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/boards/${boardId}/lists`)
      .set(authHeader());

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(3);
    expect(res.body[0].title).toBe("Setup E2E Client");
    expect(res.body[1].title).toBe("In Progress");
    expect(res.body[2].title).toBe("Done");
  });

  // Step 5: Add a list and a card
  it("adds a new list and card to the board", async () => {
    const listRes = await request(app.getHttpServer())
      .post(`/api/boards/${boardId}/lists`)
      .set(authHeader())
      .send({ title: "Review", position: 3 });

    expect(listRes.status).toBe(201);
    const listId = listRes.body.id;

    const cardRes = await request(app.getHttpServer())
      .post(`/api/lists/${listId}/cards`)
      .set(authHeader())
      .send({ title: "Review checklist", description: "Go through the checklist" });

    expect(cardRes.status).toBe(201);
    expect(cardRes.body.title).toBe("Review checklist");
  });

  // Step 6: Add comments
  it("adds internal and client-visible comments", async () => {
    const listsRes = await request(app.getHttpServer())
      .get(`/api/boards/${boardId}/lists`)
      .set(authHeader());

    const firstCardId = listsRes.body[0].cards[0].id;

    const internalRes = await request(app.getHttpServer())
      .post(`/api/cards/${firstCardId}/comments`)
      .set(authHeader())
      .send({ content: "Internal team note", visibility: "internal" });
    expect(internalRes.status).toBe(201);

    const clientRes = await request(app.getHttpServer())
      .post(`/api/cards/${firstCardId}/comments`)
      .set(authHeader())
      .send({ content: "Hi client!", visibility: "client" });
    expect(clientRes.status).toBe(201);
  });

  // Step 7: Move card to Done list → completion detection
  it("completes a card when moved to the Done list", async () => {
    const listsRes = await request(app.getHttpServer())
      .get(`/api/boards/${boardId}/lists`)
      .set(authHeader());

    const firstCardId = listsRes.body[0].cards[0].id;
    const doneListId = listsRes.body[2].id;

    const moveRes = await request(app.getHttpServer())
      .patch(`/api/cards/${firstCardId}/move`)
      .set(authHeader())
      .send({ listId: doneListId, position: 0 });

    expect(moveRes.status).toBe(200);
    expect(moveRes.body.completedAt).not.toBeNull();
  });

  // Step 8: Access public board
  it("accesses board via public token", async () => {
    const boardRes = await request(app.getHttpServer())
      .get(`/api/boards/${boardId}`)
      .set(authHeader());

    const publicToken = boardRes.body.publicToken;

    const publicRes = await request(app.getHttpServer())
      .get(`/api/boards/public/${publicToken}`);

    expect(publicRes.status).toBe(200);
    expect(publicRes.body.title).toBeDefined();
    expect(publicRes.body.clientName).toBe("E2E Client");
  });

  // Step 9: Verify client content filtering
  it("public settings return only public fields", async () => {
    const settingsRes = await request(app.getHttpServer())
      .get("/api/settings/public");

    expect(settingsRes.status).toBe(200);
    expect(settingsRes.body).toHaveProperty("companyName");
    expect(settingsRes.body).toHaveProperty("primaryColor");
    expect(settingsRes.body).not.toHaveProperty("emailFrom");
  });

  // Step 10: Board stats showing completion
  it("gets board stats showing completion", async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/boards/${boardId}/stats`)
      .set(authHeader());

    expect(res.status).toBe(200);
    expect(res.body.completedCards).toBeGreaterThan(0);
  });
});