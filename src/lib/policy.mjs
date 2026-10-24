export function canAutoReply(input) {
  return input.enabled && !input.paused && input.permission && input.category !== "complaint" && input.category !== "sensitive" && input.dailyCount < input.dailyLimit && !input.duplicate;
}
export function normalizedMessage(value) {
  return value.toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}
