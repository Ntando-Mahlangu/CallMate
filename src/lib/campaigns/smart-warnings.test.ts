import { describe, it, expect } from "vitest";
import { getAudienceWarnings, getContentWarnings } from "./smart-warnings";

describe("getAudienceWarnings", () => {
  it("flags an audience that is too small", () => {
    const warnings = getAudienceWarnings({ companyCount: 2, averageFitScore: 80, confidence: "High" });
    expect(warnings.map((w) => w.id)).toContain("audience-too-small");
  });

  it("flags an audience that is too broad", () => {
    const warnings = getAudienceWarnings({ companyCount: 200, averageFitScore: 80, confidence: "High" });
    expect(warnings.map((w) => w.id)).toContain("audience-too-broad");
  });

  it("flags low average fit", () => {
    const warnings = getAudienceWarnings({ companyCount: 20, averageFitScore: 30, confidence: "High" });
    expect(warnings.map((w) => w.id)).toContain("low-average-fit");
  });

  it("flags low strategy confidence", () => {
    const warnings = getAudienceWarnings({ companyCount: 20, averageFitScore: 80, confidence: "Low" });
    expect(warnings.map((w) => w.id)).toContain("low-confidence");
  });

  it("returns no warnings for a healthy audience", () => {
    const warnings = getAudienceWarnings({ companyCount: 20, averageFitScore: 85, confidence: "High" });
    expect(warnings).toEqual([]);
  });
});

describe("getContentWarnings", () => {
  it("returns no warnings for an empty message list", () => {
    expect(getContentWarnings([])).toEqual([]);
  });

  it("flags a message that runs long", () => {
    const longBody = Array.from({ length: 250 }, () => "word").join(" ") + " reply to this?";
    const warnings = getContentWarnings([{ id: "1", subject: "Hi", body: longBody }]);
    expect(warnings.map((w) => w.id)).toContain("message-too-long");
  });

  it("flags a weak CTA when there is no clear ask", () => {
    const warnings = getContentWarnings([
      { id: "1", subject: "Hi", body: "Just wanted to share some thoughts about your business." },
    ]);
    expect(warnings.map((w) => w.id)).toContain("weak-cta");
  });

  it("does not flag a message with a clear CTA", () => {
    const warnings = getContentWarnings([
      { id: "1", subject: "Hi", body: "Worth a quick call this week to discuss?" },
    ]);
    expect(warnings.map((w) => w.id)).not.toContain("weak-cta");
  });

  it("flags spam-trigger wording", () => {
    const warnings = getContentWarnings([
      { id: "1", subject: "Act now", body: "This is a guaranteed, risk-free opportunity. Reply now?" },
    ]);
    expect(warnings.map((w) => w.id)).toContain("spam-risk");
  });

  it("flags repeated opening wording across messages", () => {
    const warnings = getContentWarnings([
      { id: "1", subject: "Hi", body: "I noticed your team has been growing fast this year. Reply?" },
      { id: "2", subject: "Hi", body: "I noticed your team has been growing fast lately. Reply?" },
    ]);
    expect(warnings.map((w) => w.id)).toContain("repeated-wording");
  });

  it("does not flag distinct openings", () => {
    const warnings = getContentWarnings([
      { id: "1", subject: "Hi", body: "Quick question about your growth strategy this quarter. Reply?" },
      { id: "2", subject: "Hi", body: "Saw your recent expansion and had an idea to share. Reply?" },
    ]);
    expect(warnings.map((w) => w.id)).not.toContain("repeated-wording");
  });
});
