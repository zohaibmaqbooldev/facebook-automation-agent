import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const sdk = vi.hoisted(() => {
  const generateContent = vi.fn();
  const getGenerativeModel = vi.fn(() => ({ generateContent }));
  const GoogleGenerativeAI = vi.fn(() => ({ getGenerativeModel }));
  return { GoogleGenerativeAI, getGenerativeModel, generateContent };
});

vi.mock("@google/generative-ai", () => ({ GoogleGenerativeAI: sdk.GoogleGenerativeAI }));

const drafts = [
  { caption: "Draft one", hashtags: ["#one"], imageBrief: "A clean graphic", topic: "software" },
  { caption: "Draft two", hashtags: ["#two"], imageBrief: "A simple illustration", topic: "software" },
  { caption: "Draft three", hashtags: ["#three"], imageBrief: "A bright workspace", topic: "software" },
];

const previousApiKey = process.env.GEMINI_API_KEY;
const previousModel = process.env.GEMINI_MODEL;

async function loadAi() {
  vi.resetModules();
  return import("./ai");
}

describe("Gemini model configuration and draft generation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.GEMINI_API_KEY = "test-api-key";
    delete process.env.GEMINI_MODEL;
    sdk.generateContent.mockResolvedValue({ response: { text: () => JSON.stringify(drafts) } });
  });

  afterEach(() => {
    if (previousApiKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = previousApiKey;
    if (previousModel === undefined) delete process.env.GEMINI_MODEL;
    else process.env.GEMINI_MODEL = previousModel;
  });

  it("uses gemini-3.8-flash by default and parses the successful draft response", async () => {
    const { generateDailyIdeas } = await loadAi();

    await expect(generateDailyIdeas("software")).resolves.toEqual(drafts);
    expect(sdk.getGenerativeModel).toHaveBeenCalledWith({ model: "gemini-3.8-flash" });
  });

  it("honors the server-side GEMINI_MODEL override", async () => {
    process.env.GEMINI_MODEL = "configured-model-override";
    const { generateDailyIdeas } = await loadAi();

    await generateDailyIdeas("software");
    expect(sdk.getGenerativeModel).toHaveBeenCalledWith({ model: "configured-model-override" });
  });

  it("returns a clear safe error when GEMINI_API_KEY is missing", async () => {
    delete process.env.GEMINI_API_KEY;
    const { AIConfigurationError, generateDailyIdeas } = await loadAi();

    await expect(generateDailyIdeas("software")).rejects.toBeInstanceOf(AIConfigurationError);
    await expect(generateDailyIdeas("software")).rejects.toThrow("GEMINI_API_KEY");
    expect(sdk.GoogleGenerativeAI).not.toHaveBeenCalled();
  });

  it("handles unsupported-model provider errors without returning provider details", async () => {
    sdk.generateContent.mockRejectedValue(new Error("404 model unavailable; sensitive provider detail"));
    const { AIProviderError, generateDailyIdeas } = await loadAi();

    const result = generateDailyIdeas("software");
    await expect(result).rejects.toBeInstanceOf(AIProviderError);
    await expect(result).rejects.not.toThrow("sensitive provider detail");
  });

  it("handles malformed or empty model output safely", async () => {
    sdk.generateContent.mockResolvedValue({ response: { text: () => "" } });
    const { AIProviderError, generateDailyIdeas } = await loadAi();

    await expect(generateDailyIdeas("software")).rejects.toBeInstanceOf(AIProviderError);
  });
});
