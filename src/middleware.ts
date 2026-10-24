import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: { getAll: () => request.cookies.getAll(), setAll: (cs) => { cs.forEach(({ name, value }) => request.cookies.set(name, value)); response = NextResponse.next({ request }); cs.forEach(({ name, value, options }) => response.cookies.set(name, value, options)); } },
  });
  const { data: { user } } = await supabase.auth.getUser();
  const path=request.nextUrl.pathname;
  const protectedPath=path.startsWith("/dashboard")||(path.startsWith("/api/")&&!path.startsWith("/api/scheduler/run"));
  if(protectedPath&&(!user||!process.env.ADMIN_EMAIL||user.email?.toLowerCase()!==process.env.ADMIN_EMAIL.toLowerCase())){
    if(path.startsWith("/api/"))return NextResponse.json({error:"Admin authentication required."},{status:401});
    const url=request.nextUrl.clone();url.pathname="/login";url.searchParams.set("error","admin");return NextResponse.redirect(url);
  }
  return response;
}
export const config = { matcher: ["/dashboard/:path*","/api/:path*"] };
