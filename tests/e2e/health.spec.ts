import { test, expect } from "@playwright/test";

test.describe("health check", () => {
  test("reports ok and a reachable database", async ({ request }) => {
    const response = await request.get("/api/health");
    expect(response.ok()).toBe(true);

    const body = await response.json();
    expect(body).toMatchObject({ status: "ok", database: "reachable" });
  });
});
