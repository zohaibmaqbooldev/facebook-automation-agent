import { NextResponse } from "next/server";
export async function POST(){return NextResponse.json({error:"Not supported by current Meta API permissions",manualAction:"Open Facebook and react manually."},{status:501});}
