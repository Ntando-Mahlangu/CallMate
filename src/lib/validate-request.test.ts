import { describe, it, expect } from "vitest";
import { z } from "zod";
import { parseJsonBody } from "./validate-request";

const schema = z.object({
  title: z.string().min(1, "Give the task a title."),
  impact: z.enum(["Low", "Medium", "High"], { message: "Choose a valid impact level." }),
});

function jsonRequest(body: unknown) {
  return new Request("http://localhost/test", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

describe("parseJsonBody", () => {
  it("returns parsed data for a valid body", async () => {
    const result = await parseJsonBody(jsonRequest({ title: "Ship it", impact: "High" }), schema);
    expect(result.error).toBeUndefined();
    expect(result.data).toEqual({ title: "Ship it", impact: "High" });
  });

  it("returns the schema's custom message on the first failing field", async () => {
    const result = await parseJsonBody(jsonRequest({ title: "", impact: "High" }), schema);
    expect(result.data).toBeUndefined();
    const body = await result.error!.json();
    expect(body.error).toBe("Give the task a title.");
    expect(result.error!.status).toBe(400);
  });

  it("returns a friendly message for malformed JSON", async () => {
    const request = new Request("http://localhost/test", { method: "POST", body: "not json" });
    const result = await parseJsonBody(request, schema);
    expect(result.data).toBeUndefined();
    const body = await result.error!.json();
    expect(body.error).toBe("Malformed request body.");
    expect(result.error!.status).toBe(400);
  });
});
