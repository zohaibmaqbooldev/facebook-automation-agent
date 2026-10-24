import { createClient } from "@supabase/supabase-js";
import { decryptSecret } from "@/lib/security";
import { handleTokenExpiry, isMetaTokenExpiry, publishPagePost, TOKEN_EXPIRED_MESSAGE } from "@/lib/meta";
import { NextResponse } from "next/server";

async function runScheduler(req:Request){
 if(!process.env.CRON_SECRET||req.headers.get("authorization")!==`Bearer ${process.env.CRON_SECRET}`)return NextResponse.json({error:"Unauthorized"},{status:401});
 const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.SUPABASE_SERVICE_ROLE_KEY!,{auth:{persistSession:false}});
 const {data:jobs,error}=await db.from("scheduled_jobs").select("id,user_id,post_id,page_id,run_at,status").eq("status","pending").lte("run_at",new Date().toISOString()).limit(20);if(error)return NextResponse.json({error:error.message},{status:500});
 const results:{jobId:string;status:string;error?:string}[]=[];
 for(const job of jobs||[]){
  const {data:claimed}=await db.from("scheduled_jobs").update({status:"processing"}).eq("id",job.id).eq("status","pending").select("id").maybeSingle();if(!claimed)continue;
  try{
   const [{data:post},{data:page},{data:settings}]=await Promise.all([db.from("generated_posts").select("caption").eq("id",job.post_id).eq("user_id",job.user_id).single(),db.from("connected_facebook_pages").select("encrypted_access_token,granted_tasks,connection_status").eq("page_id",job.page_id).eq("user_id",job.user_id).single(),db.from("user_settings").select("publishing_paused").eq("user_id",job.user_id).maybeSingle()]);
   if(!post||!page)throw new Error("Scheduled post or Page connection is missing.");if(page.connection_status!=="connected")throw new Error(TOKEN_EXPIRED_MESSAGE);if(settings?.publishing_paused)throw new Error("Emergency stop is active.");if(!page.granted_tasks?.includes("CREATE_CONTENT")&&!page.granted_tasks?.includes("MANAGE"))throw new Error("Meta publishing permission missing.");
   const published=await publishPagePost(job.page_id,decryptSecret(page.encrypted_access_token),post.caption);await db.from("scheduled_jobs").update({status:"published",external_id:published.id}).eq("id",job.id);await db.from("generated_posts").update({status:"published"}).eq("id",job.post_id);await db.from("publishing_logs").insert({user_id:job.user_id,page_id:job.page_id,action:"scheduled_publish",status:"success",external_id:published.id});results.push({jobId:job.id,status:"published"});
  }catch(e){
   const expired=isMetaTokenExpiry(e);let message=expired?TOKEN_EXPIRED_MESSAGE:(e instanceof Error?e.message:"API error");
   if(expired){try{await handleTokenExpiry(db,job.user_id,job.page_id);}catch{message="Page token expired; reconnect required. Pending jobs could not all be cancelled.";await db.from("scheduled_jobs").update({status:"failed",error_message:message}).eq("id",job.id);}}
   else await db.from("scheduled_jobs").update({status:"failed",error_message:message}).eq("id",job.id);
   await db.from("publishing_logs").insert({user_id:job.user_id,page_id:job.page_id,action:"scheduled_publish",status:"failed",error_message:message});results.push({jobId:job.id,status:expired?"cancelled":"failed",error:message});
  }
 }
 return NextResponse.json({processed:results.length,results});
}
// Vercel Cron invokes scheduled routes with GET; POST remains available for other schedulers.
export const GET = runScheduler;
export const POST = runScheduler;
