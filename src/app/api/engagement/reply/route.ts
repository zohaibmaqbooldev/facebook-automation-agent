import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { decryptSecret } from "@/lib/security";
import { handleTokenExpiry, isMetaTokenExpiry, replyToComment, TOKEN_EXPIRED_MESSAGE } from "@/lib/meta";
import { NextResponse } from "next/server";

const schema=z.object({pageId:z.string(),commentId:z.string(),message:z.string().trim().min(1).max(2000),approved:z.literal(true)});
export async function POST(req:Request){
 const s=await createSupabaseServerClient();const {data:{user}}=await s.auth.getUser();if(!user)return NextResponse.json({error:"Sign in required."},{status:401});
 const input=schema.safeParse(await req.json());if(!input.success)return NextResponse.json({error:"Explicit approval and a valid reply are required."},{status:400});const {pageId,commentId,message}=input.data;
 const {data:settings}=await s.from("user_settings").select("engagement_paused,daily_activity_limit,min_action_interval_seconds").eq("user_id",user.id).maybeSingle();
 const {data:page}=await s.from("connected_facebook_pages").select("encrypted_access_token,granted_tasks,connection_status").eq("user_id",user.id).eq("page_id",pageId).maybeSingle();
 if(!page||!page.granted_tasks?.includes("MODERATE"))return NextResponse.json({error:"Not supported by current Meta API permissions"},{status:403});if(page.connection_status!=="connected")return NextResponse.json({error:TOKEN_EXPIRED_MESSAGE},{status:409});if(settings?.engagement_paused)return NextResponse.json({error:"Engagement is paused."},{status:423});
 const {data:duplicate}=await s.from("engagement_events").select("id").eq("user_id",user.id).eq("external_comment_id",commentId).eq("action","reply").in("status",["success","pending"]).maybeSingle();if(duplicate)return NextResponse.json({error:"A reply was already attempted for this comment."},{status:409});
 const {count}=await s.from("engagement_events").select("id",{count:"exact",head:true}).eq("user_id",user.id).gte("created_at",new Date(new Date().setHours(0,0,0,0)).toISOString());if((count||0)>=(settings?.daily_activity_limit??10))return NextResponse.json({error:"Daily activity limit reached."},{status:429});
 const {data:last}=await s.from("engagement_events").select("created_at").eq("user_id",user.id).order("created_at",{ascending:false}).limit(1).maybeSingle();if(last&&Date.now()-new Date(last.created_at).getTime()<(settings?.min_action_interval_seconds??300)*1000)return NextResponse.json({error:"Minimum action interval has not elapsed."},{status:429});
 const {data:event,error:eventError}=await s.from("engagement_events").insert({user_id:user.id,external_comment_id:commentId,action:"reply",status:"pending",details:{manualApproval:true}}).select("id").single();if(eventError||!event)return NextResponse.json({error:eventError?.message||"Could not create audit event."},{status:500});
 try{const result=await replyToComment(commentId,decryptSecret(page.encrypted_access_token),message);await s.from("engagement_events").update({status:"success",external_result_id:result.id}).eq("id",event.id);return NextResponse.json({replied:true,id:result.id});}
 catch(e){const expired=isMetaTokenExpiry(e);if(expired)await handleTokenExpiry(s,user.id,pageId);const error=expired?TOKEN_EXPIRED_MESSAGE:(e instanceof Error?e.message:"Meta API error");await s.from("engagement_events").update({status:"failed",error_message:error}).eq("id",event.id);return NextResponse.json({error},{status:expired?401:502});}
}
