# Facebook Automation Agent

Secure, single-admin social publishing workspace. Live publishing requires working Supabase configuration and Meta app review/permissions. AI generated posts remain drafts until you publish or schedule them.

## Quick start
1. Install Node.js 20+ and npm.
2. Run `npm install`.
3. Copy `.env.example` to `.env.local` and fill Supabase, Gemini and security variables.
4. Run the SQL migration in Supabase SQL Editor.
5. Create an administrator user from Supabase Authentication > Users (disable public sign-up).
6. Run `npm run dev`; open http://localhost:3000.

See [SETUP-ROMAN-URDU.md](./SETUP-ROMAN-URDU.md) for beginner setup and deployment.

## Safety behavior
- No personal profile publishing API is called. Personal profile drafts are for manual publishing.
- Reactions intentionally return “Not supported by current Meta API permissions”.
- Replies require user approval and Page moderation permission. AI comment suggestions flag sensitive issues for human review.
- Scheduler uses a Vercel cron endpoint, service role key only on the server, idempotent job claims, and rechecks emergency stop and publishing permissions.
- The app does not fake connected accounts, insights, or published results.

## Commands
`npm run dev`, `npm run typecheck`, `npm test`, `npm run build`.

## Limits
Image upload to private Supabase storage is implemented. Image generation expects a configured provider endpoint and is not enabled until that adapter is configured. Meta permissions and eligibility vary by app review, Page role, Graph API version and region. Verify supported scopes in Meta docs and App Review before production use. Reach/engagement insights are not fabricated.
