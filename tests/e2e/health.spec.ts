import { test, expect } from "@playwright/test";

test.describe("health check", () => {
  test("reports ok and a reachable database", async ({ request }) => {
    const response = await request.get("/api/health");
    expect(response.ok()).toBe(true);

    const body = await response.json();
    expect(body).toMatchObject({ status: "ok", database: "reachable", apiVersion: "v1" });
  });
});

// docs/outrun/11 "API DESIGN — Clear versioning." Stamped by src/proxy.ts
// on every /api/* response, not just this one — this is the cheapest place
// to catch a regression in that proxy matcher.
test.describe("api versioning", () => {
  test("every /api/* response carries an X-API-Version header", async ({ request }) => {
    const response = await request.get("/api/health");
    expect(response.headers()["x-api-version"]).toBe("v1");
  });
});
