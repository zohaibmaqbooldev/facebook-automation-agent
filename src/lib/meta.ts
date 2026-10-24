import type { SupabaseClient } from "@supabase/supabase-js";
import { isMetaTokenExpiry } from "./meta-errors.mjs";

export class MetaApiError extends Error { constructor(message: string, readonly status: number, readonly code?: number) { super(message); } }
const graphBase = () => `https://graph.facebook.com/${process.env.META_GRAPH_API_VERSION || "v26.0"}`;
export async function metaRequest<T>(path: string, token: string, init: RequestInit = {}): Promise<T> {
  const url = path.startsWith("http") ? new URL(path) : new URL(`${graphBase()}/${path.replace(/^\//, "")}`);
  if (init.method === "GET" || !init.method) url.searchParams.set("access_token", token);
  else { const body = new URLSearchParams(typeof init.body === "string" ? init.body : ""); body.set("access_token", token); init = { ...init, body }; }
  const response = await fetch(url, { ...init, cache: "no-store" }); const data = await response.json();
  if (!response.ok || data.error) throw new MetaApiError(data.error?.message || "Meta Graph API request failed", response.status, data.error?.code);
  return data as T;
}
export async function listManagedPages(userToken: string) { return metaRequest<{data:{id:string;name:string;access_token:string;tasks?:string[]}[] }>("me/accounts?fields=id,name,access_token,tasks", userToken); }
export async function readPagePosts(pageId: string, token: string) { return metaRequest<{data:{id:string;message?:string;created_time:string;permalink_url?:string}[]}>(`${pageId}/posts?fields=id,message,created_time,permalink_url&limit=25`, token); }
export async function readPostComments(postId: string, token: string) { return metaRequest<{data:{id:string;message:string;from?:{name:string};created_time:string}[]}>(`${postId}/comments?fields=id,message,from,created_time&limit=50`, token); }
export async function replyToComment(commentId: string, token: string, message: string) { return metaRequest<{id:string}>(`${commentId}/comments`, token, { method: "POST", body: new URLSearchParams({ message }) }); }
export async function publishPagePost(pageId: string, token: string, message: string) { return metaRequest<{id:string}>(`${pageId}/feed`, token, { method: "POST", body: new URLSearchParams({ message }) }); }
export { isMetaTokenExpiry };
export async function handleTokenExpiry(client: SupabaseClient, userId: string, pageId: string): Promise<boolean> {
  const { error: pageError } = await client.from("connected_facebook_pages").update({ connection_status: "disconnected", disconnected_at: new Date().toISOString() }).eq("user_id", userId).eq("page_id", pageId);
  if (pageError) throw new Error("Could not mark the expired Page connection as disconnected.");
  const { error: jobsError } = await client.from("scheduled_jobs").update({ status: "cancelled", error_message: "Page disconnected, please reconnect" }).eq("user_id", userId).eq("page_id", pageId).in("status", ["pending", "processing"]);
  if (jobsError) throw new Error("Page disconnected, but pending scheduled jobs could not be cancelled.");
  return true;
}
export const TOKEN_EXPIRED_MESSAGE = "Page disconnected, please reconnect";
// A Page comment reaction endpoint is not assumed. Verify availability with current Meta docs and app permissions before enabling any reaction.
export const reactionCapability = { supported: false as const, reason: "Not supported by current Meta API permissions" };
