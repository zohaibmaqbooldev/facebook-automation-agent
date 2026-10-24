"use client";
import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function Login(){
  const [email,setEmail]=useState("");
  const [password,setPassword]=useState("");
  const [error,setError]=useState("");
  useEffect(()=>{
    if(new URLSearchParams(window.location.search).get("error")==="admin"){
      setError("Admin access was not confirmed. Sign in with the user in this Supabase project whose email matches ADMIN_EMAIL. If you just changed .env.local, restart the dev server.");
    }
  },[]);
  async function submit(e:React.FormEvent){
    e.preventDefault();
    setError("");
    const {error}=await createSupabaseBrowserClient().auth.signInWithPassword({email,password});
    if(error)setError(error.message);
    else window.location.assign("/dashboard");
  }
  return <main className="grid min-h-screen place-items-center p-5"><form onSubmit={submit} className="w-full max-w-md rounded-3xl bg-white p-8 shadow-sm"><h1 className="text-2xl font-bold">Admin sign in</h1><p className="mb-6 mt-2 text-sm text-slate-500">Use the administrator account created in Supabase Auth.</p><label className="mb-4 block text-sm font-medium">Email<input required type="email" autoComplete="username" value={email} onChange={e=>setEmail(e.target.value)} className="mt-1 w-full rounded-xl border p-3"/></label><label className="block text-sm font-medium">Password<input required type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} className="mt-1 w-full rounded-xl border p-3"/></label>{error&&<p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}<button className="mt-6 w-full rounded-xl bg-blue-600 p-3 font-semibold text-white">Sign in</button></form></main>
}
