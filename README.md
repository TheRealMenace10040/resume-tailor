# Resume Tailor

Paste a job posting, get a resume tailored to it, and download a matching PDF to submit yourself. This app does **not** auto-apply to jobs — it only prepares a resume for you to submit manually.

## Features

- Paste a job posting URL (Greenhouse/Lever-style ATS pages) and the app scrapes the title, company, and description via `fetch` + Cheerio.
- If scraping fails or the site isn't supported, paste the job description manually instead.
- Gemini (via Firebase AI Logic) compares your resume to the job and returns a match score, a tailored summary, highlighted skills, recommended bullet rewrites, and missing keywords.
- Download a tailored resume as a PDF.
- History of past tailoring runs, stored in Supabase.

This is a single-user app with no login — anyone with the URL and no Supabase RLS can read/write the `resume_history` table, so keep the deployed URL private.

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy the env example and fill in your Firebase AI Logic config:

   ```bash
   cp .env.local.example .env.local
   ```

   The `NEXT_PUBLIC_FIREBASE_*` values are your Firebase **web app config** — not a secret key. Get them from the [Firebase console](https://console.firebase.google.com/project/resume-tailor-2026/settings/general) under Project settings → Your apps → (the `resume-tailor-web` app) → SDK setup and configuration.

   You also need to enable Gemini for this project once: Firebase console → Build → **AI Logic** → Get started (choose the "Gemini Developer API" option). This is a one-time setup click, no separate API key or account needed since it's billed through the existing Firebase project.

   The Supabase values are already filled in for this project.

   Without the Firebase AI Logic config (or if Gemini isn't enabled yet), everything else (scraping, manual entry, PDF download, history) still works — "Tailor my resume" will show a clear setup error instead of crashing.

3. Run the dev server:

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

## Editing your base resume

Your resume content lives in [`lib/resume-data.ts`](lib/resume-data.ts) as the `defaultBaseResume` object. Edit it directly with your real name, contact info, skills, experience, and education.

## Deployment (Vercel)

This app is deployed on **Vercel's free Hobby tier**. Vercel auto-detects Next.js, and the app's only server-side dependency (Firebase AI Logic's `firebase/ai` package, used in [`app/api/tailor-resume/route.ts`](app/api/tailor-resume/route.ts)) runs fine in a standard Node.js serverless function — no Blaze plan or App Hosting needed. (Firebase AI Logic's "Gemini Developer API" backend, which this app uses, is free on Firebase's Spark plan; only Firebase *App Hosting* required Blaze.)

1. Sign up at [vercel.com](https://vercel.com) (GitHub login works).
2. **Add New Project** → import the `TheRealMenace10040/resume-tailor` GitHub repo. Vercel detects the Next.js framework automatically — no `vercel.json` needed.
3. Before the first deploy (or right after, then redeploy), add these environment variables in the Vercel project's **Settings → Environment Variables**:

   | Variable | Value |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | `https://rqqvlqbnhrxfeaaaxvhg.supabase.co` |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `sb_publishable_z7-MvSvPnSIcE89YSQ9x_A_t3zqvU6Z` |
   | `NEXT_PUBLIC_FIREBASE_API_KEY` | `AIzaSyDkuiU-c5kEA30pbqBLEjK0o5Aj4Si4NwM` |
   | `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | `resume-tailor-2026.firebaseapp.com` |
   | `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | `resume-tailor-2026` |
   | `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | `resume-tailor-2026.firebasestorage.app` |
   | `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | `169070549106` |
   | `NEXT_PUBLIC_FIREBASE_APP_ID` | `1:169070549106:web:4d0a3ec671ef3d3f558aeb` |

   None of these are secret credentials — the Supabase table has no RLS/auth (see warning above) and the Firebase values are public web app config, not API keys — but they still need to be set in Vercel since `.env.local` isn't committed.
4. Deploy. Every push to the connected branch redeploys automatically.

`apphosting.yaml` and `.firebaserc` are left in the repo from the earlier Firebase App Hosting setup; Vercel ignores them and they can stay or go.

## Tech stack

- Next.js 14 (App Router)
- Tailwind CSS
- Supabase (`resume_history` table, no auth/RLS)
- Gemini via Firebase AI Logic (`firebase/ai`) for resume tailoring
- Cheerio for job posting scraping
- `@react-pdf/renderer` for PDF generation
