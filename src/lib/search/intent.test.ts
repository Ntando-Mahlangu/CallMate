import { describe, it, expect } from "vitest";
import { classifySearchIntent } from "./intent";

describe("classifySearchIntent", () => {
  it("classifies plain record names as lookups", () => {
    expect(classifySearchIntent("Acme Plumbing")).toEqual({ kind: "lookup", query: "Acme Plumbing" });
  });

  it("classifies questions as ask, by leading question word", () => {
    expect(classifySearchIntent("Why did replies drop")).toEqual({
      kind: "ask",
      question: "Why did replies drop",
    });
  });

  it("classifies questions as ask, by trailing question mark", () => {
    expect(classifySearchIntent("Are my campaigns working?")).toEqual({
      kind: "ask",
      question: "Are my campaigns working?",
    });
  });

  it("classifies action-verb commands as ask", () => {
    expect(classifySearchIntent("Generate emails")).toEqual({ kind: "ask", question: "Generate emails" });
    expect(classifySearchIntent("Analyse my website")).toEqual({
      kind: "ask",
      question: "Analyse my website",
    });
  });

  it("classifies 'best campaign' as a dedicated ranking intent", () => {
    expect(classifySearchIntent("Show my best campaign")).toEqual({ kind: "best-campaign" });
    expect(classifySearchIntent("top campaign")).toEqual({ kind: "best-campaign" });
  });

  it("does not misclassify a campaign named literally 'Best' as a lookup", () => {
    expect(classifySearchIntent("Best")).toEqual({ kind: "lookup", query: "Best" });
  });
});
