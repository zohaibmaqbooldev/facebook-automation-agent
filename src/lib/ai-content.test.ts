import { describe, expect, it } from "vitest";
import { parsePostIdeas } from "./ai-content.mjs";
import { AIConfigurationError, generateDailyIdeas } from "./ai";

const ideas = Array.from({ length: 3 }, (_, index) => ({ caption: `Helpful software draft ${index + 1}`, topic: "software", imageBrief: "A simple software dashboard illustration", hashtags: ["software", "AI"] }));

describe("Gemini draft validation", () => {
  it("accepts three well-formed drafts and normalizes hashtag markers", () => {
    const parsed = parsePostIdeas(JSON.stringify(ideas));
    expect(parsed).toHaveLength(3);
    expect(parsed[0].hashtags).toEqual(["#software", "#AI"]);
  });
  it("rejects malformed or incomplete output rather than saving false drafts", () => {
    expect(() => parsePostIdeas("not json")).toThrow();
    expect(() => parsePostIdeas("[]")).toThrow();
    expect(() => parsePostIdeas(JSON.stringify([{ ...ideas[0], imageBrief: "" }, ...ideas.slice(1)]))).toThrow();
  });
  it("returns an actionable configuration error when the server key is absent", async () => {
    const previousKey = process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_API_KEY;
    try {
      await expect(generateDailyIdeas("software development")).rejects.toBeInstanceOf(AIConfigurationError);
    } finally {
      if (previousKey === undefined) delete process.env.GEMINI_API_KEY;
      else process.env.GEMINI_API_KEY = previousKey;
    }
  });
});
