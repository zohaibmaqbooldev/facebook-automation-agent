# Asaan Setup Guide (Roman Urdu)

## 1) Zaroori cheezen

- Node.js 20 ya us se naya version install karein.
- Supabase account/project banayein.
- Google AI Studio se Gemini API key hasil karein.
- Facebook Page aur Meta Developer App sirf us waqt chahiye jab live Facebook connection karna ho.

## 2) App apne computer par chalana

1. Terminal/PowerShell mein project folder kholein: `Facebook Automation Agent`.
2. `npm install` chalayein. Is se project ke packages download honge. Windows par project ka path lamba ho aur `spawn EPERM` aaye to neeche “Windows build fix” dekhein. `npm run build` ab Windows mein khud temporary short drive path use karta hai.
3. `.env.example` ki copy bana kar us ka naam `.env.local` rakhein.
4. Supabase URL aur anon/publishable key `.env.local` mein likhein. `ADMIN_EMAIL` mein wahi admin email dein jo aap Supabase Auth mein banayenge. Service role key server ke liye hai; ise kisi ko share na karein.
5. `APP_ENCRYPTION_KEY` ke liye 32-byte hex secret banayein, misal ke taur par `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`. Is key ko safe jagah rakhein. Badalne par purane encrypted Facebook tokens decrypt nahin honge.
6. Supabase ke SQL Editor mein pehle `supabase/migrations/0001_initial.sql` aur phir `supabase/migrations/0002_client_leads.sql` ka poora SQL chala dein. Pehli migration Facebook/content tables banati hai; doosri Client & Job Finder ke saved leads banati hai.
7. Supabase Authentication mein email/password admin user khud banayein. Public sign-up band rakhein.
8. `GEMINI_API_KEY` set kar ke `npm run dev` chalayein. Browser mein `http://localhost:3000` kholein aur admin se sign in karein.

## 3) Gemini aur tasveerain

Gemini key sirf `.env.local` mein rakhein, `NEXT_PUBLIC_` naam se nahin. Dashboard post ke ideas banata hai aur private storage mein PNG/JPEG/WebP (10 MB tak) image upload ho sakti hai. Server file ke naam/MIME ke saath asal file signature (magic bytes) bhi validate karta hai, is liye ghalat format reject hota hai. Image generation ke liye apne provider ka endpoint `IMAGE_PROVIDER_URL` aur key `IMAGE_PROVIDER_API_KEY` mein set karein. Provider adapter abhi live generation request nahin bhejta; upload fallback istemal karein jab tak adapter aap ke provider ke response format ke mutabiq configure na ho.

## 4) Meta/Facebook connect

1. Meta Developers par app banayein, Facebook Login configure karein aur local callback URL `http://localhost:3000/api/meta/callback` add karein.
2. `META_APP_ID`, `META_APP_SECRET`, `META_GRAPH_API_VERSION`, aur `META_REDIRECT_URI` set karein.
3. App ke review/Advanced Access mein zaroori Page permissions (`pages_show_list`, `pages_read_engagement`, `pages_read_user_content`, `pages_manage_posts`, `pages_manage_engagement`) maangein. App user ko Page manage karne ki ijazat bhi honi chahiye.
4. Dashboard mein “Connect Facebook Page” dabayein aur Meta consent mukammal karein.
5. Page publish/reply tabhi chalega jab Meta ne permission di ho. Agar Graph API token expiry/revocation error code 190 ya 102 de, app Page ko disconnected mark karta, us Page ke pending/processing scheduled jobs cancel karta, aur “Page disconnected, please reconnect” dikhata hai. Dobara OAuth connect karein. Personal profile publishing supported nahin hai. Reactions ke liye app unsupported status dikhata hai.

## 5) Scheduler aur Vercel deploy

- Supabase project ko deploy se pehle migration dein.
- Vercel mein project import karein; root directory `Facebook Automation Agent` set karein.
- `.env.local` ki values Vercel Environment Variables mein manually add karein. Koi secret Git mein commit na karein.
- `CRON_SECRET` ek lamba random secret rakhein. Vercel cron har 5 minute `/api/scheduler/run` ko GET request karta hai; endpoint `Authorization: Bearer <CRON_SECRET>` check karta hai. Local manual check ke liye POST bhi supported hai. Cron publishing ko tabhi karega jab job due ho, Page connected ho, permission milay, aur emergency stop off ho.
- Deploy ke baad Meta app ka redirect URI aap ke HTTPS domain par update karein.
- Vercel cron schedule plan limits ke mutabiq ho sakta hai; logs mein job failures dekhein. Database mein schedule job persistent hoti hai.

## 6) Windows build fix

Agar project ka lamba folder path build mein `spawn EPERM` de, project root ko temporary drive letter ke zariye chhote path par chalayein. Admin rights ya Windows security setting badalne ki zaroorat nahin:

```powershell
$project = (Get-Location).Path
subst X: $project
Set-Location X:\
npm install
npm run build
Set-Location $project
subst X: /D
```

`X:` pehle se use ho to doosra free drive letter (misal `Y:`) chunein. Agar is short path par bhi `spawn EPERM` aaye, error ka source Windows process policy ya doosri environment restriction ho sakti hai; security controls disable na karein.

## 7) Checks

`npm test`, `npm run typecheck`, `npm run lint`, `npm run build` chalayein. Meta test mode mein pehle test user/Page use karein. Bina credentials ke live publish ya comment reply test nahin hoga; app success ka jhoota dawa nahin karta.

## 8) Client & Job Finder

- Dashboard mein `Client & Job Finder` kholein. `Search live remote jobs` Remotive ki public API par manual search karta hai; data live source se aata hai magar listing purani/closed ho sakti hai. Har job ke liye original Remotive link khol kar eligibility check karein aur source attribution dekhein. Remotive ke public API ki salah ke mutabiq search din mein 4 se zyada baar nahin chal sakta; app har search ke darmiyan 6 ghante ka database-enforced waqfa rakhta hai.
- Remotive listings source attribution/link ke saath dikhaye jate hain. App login-protected job sites scrape nahin karta aur Fiverr, Upwork, LinkedIn ya Facebook accounts se connect nahin hota.
- `Save lead` se apni Supabase table mein lead save hoti hai. Client/freelance opportunity ke liye manual form use karein. Status aur next action track karein.
- `Draft proposal` ke liye `GEMINI_API_KEY` darkaar hai. Draft sirf dashboard mein save hota hai; app kisi ko message/email nahin bhejta. Bhejne se pehle khud review karein. Migration 0002 pehle apply na ho to lead module database error dikhayega.

## Apni taraf se darkaar permissions/keys

- `.env.example` sirf placeholders rakhta hai. Is ki copy `.env.local` banayein. Supabase URL, anon/publishable key; server-only service role key.
- Gemini API key.
- 32-byte `APP_ENCRYPTION_KEY` aur `CRON_SECRET`.
- Live Meta ke liye App ID/Secret, OAuth redirect URI aur Meta ki taraf se approved Page scopes. Access token manually chat mein kabhi na bhejein.
