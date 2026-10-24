export function canAutoReply(input: { enabled: boolean; paused: boolean; permission: boolean; category: string; dailyCount: number; dailyLimit: number; duplicate: boolean }) {
  return input.enabled && !input.paused && input.permission && input.category !== "complaint" && input.category !== "sensitive" && input.dailyCount < input.dailyLimit && !input.duplicate;
}
export function normalizedMessage(value: string) { return value.toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim(); }
