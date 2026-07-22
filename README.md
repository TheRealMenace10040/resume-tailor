# Resume Tailor

Paste a job posting, get a resume tailored to it, and download a matching PDF to submit yourself. This app does **not** auto-apply to jobs — it only prepares a resume for you to submit manually.

## Features

- Paste a job posting URL (Greenhouse/Lever-style ATS pages) and the app scrapes the title, company, and description via `fetch` + Cheerio.
- If scraping fails or the site isn't supported, paste the job description manually instead.
- Gemini (via the Google AI Studio / Gemini Developer API) compares your resume to the job and returns a match score, a tailored summary, highlighted skills, recommended bullet rewrites, and missing keywords.
- Download a tailored resume as a PDF.
- History of past tailoring runs, stored in Supabase.

This is a single-user app with no login — anyone with the URL and no Supabase RLS can read/write the `resume_history` table, so keep the deployed URL private.

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy the env example and fill in your Gemini API key:

   ```bash
   cp .env.local.example .env.local
   ```

   Get a free `GEMINI_API_KEY` at [Google AI Studio](https://aistudio.google.com/apikey) and paste it in. This is a plain server-side API key used directly by the `@google/generative-ai` SDK — no Firebase project or App Check involved.

   The Supabase values are already filled in for this project.

   Without `GEMINI_API_KEY`, everything else (scraping, manual entry, PDF download, history) still works — "Tailor my resume" will show a clear setup error instead of crashing.

3. Run the dev server:

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

## Editing your base resume

Your resume content lives in [`lib/resume-data.ts`](lib/resume-data.ts) as the `defaultBaseResume` object. Edit it directly with your real name, contact info, skills, experience, and education.

## Deployment (Vercel)

This app is deployed on **Vercel's free Hobby tier**. Vercel auto-detects Next.js, and the app's only server-side AI dependency (`@google/generative-ai`, used in [`app/api/tailor-resume/route.ts`](app/api/tailor-resume/route.ts)) runs fine in a standard Node.js serverless function.

1. Sign up at [vercel.com](https://vercel.com) (GitHub login works).
2. **Add New Project** → import the `TheRealMenace10040/resume-tailor` GitHub repo. Vercel detects the Next.js framework automatically — no `vercel.json` needed.
3. Before the first deploy (or right after, then redeploy), add these environment variables in the Vercel project's **Settings → Environment Variables**:

   | Variable | Value |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | `https://rqqvlqbnhrxfeaaaxvhg.supabase.co` |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `sb_publishable_z7-MvSvPnSIcE89YSQ9x_A_t3zqvU6Z` |
   | `GEMINI_API_KEY` | *(your key from [aistudio.google.com/apikey](https://aistudio.google.com/apikey) — this one IS a secret, keep it out of git)* |

   The Supabase values aren't secret (the table has no RLS/auth, see warning above) but still need to be set in Vercel since `.env.local` isn't committed. `GEMINI_API_KEY` is a real secret — only ever set it as an environment variable, never commit it.
4. Deploy. Every push to the connected branch redeploys automatically.

`apphosting.yaml` and `.firebaserc` are left in the repo from an earlier Firebase App Hosting setup; Vercel ignores them and they can stay or go.

## Tech stack

- Next.js 14 (App Router)
- Tailwind CSS
- Supabase (`resume_history` table, no auth/RLS)
- Gemini via the Google AI Studio / Gemini Developer API (`@google/generative-ai`) for resume tailoring
- Cheerio for job posting scraping
- `@react-pdf/renderer` for PDF generation
