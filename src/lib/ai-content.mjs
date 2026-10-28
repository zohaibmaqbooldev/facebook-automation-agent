export function parsePostIdeas(text) {
  const raw = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  let parsed;
  try { parsed = JSON.parse(raw); } catch { throw new Error("Invalid generated JSON"); }
  if (!Array.isArray(parsed) || parsed.length !== 3) throw new Error("Expected exactly three drafts");
  return parsed.map((idea) => {
    if (!idea || typeof idea !== "object" || typeof idea.caption !== "string" || idea.caption.trim().length < 2 || idea.caption.length > 5000 || typeof idea.topic !== "string" || idea.topic.length > 120 || typeof idea.imageBrief !== "string" || idea.imageBrief.trim().length < 2 || idea.imageBrief.length > 1000 || !Array.isArray(idea.hashtags) || idea.hashtags.length > 15 || idea.hashtags.some((tag) => typeof tag !== "string" || tag.length > 50)) {
      throw new Error("Generated draft fields are invalid");
    }
    return { caption: idea.caption.trim(), topic: idea.topic.trim(), imageBrief: idea.imageBrief.trim(), hashtags: idea.hashtags.map((tag) => tag.trim().replace(/^#*/, "#")).filter((tag) => tag.length > 1) };
  });
}
