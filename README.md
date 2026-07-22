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

## Deployment (Firebase App Hosting)

This app uses Next.js API routes and streams PDFs, so it's deployed with **Firebase App Hosting** (not static Firebase Hosting, which doesn't support SSR/API routes). App Hosting requires the Firebase project to be on the Blaze (pay-as-you-go) plan.

Push to the connected GitHub branch — Firebase App Hosting builds and deploys automatically on push. See [`apphosting.yaml`](apphosting.yaml) for the runtime configuration; the Firebase web app config is plain (non-secret) env vars there since it only identifies the project, not an API credential.

## Tech stack

- Next.js 14 (App Router)
- Tailwind CSS
- Supabase (`resume_history` table, no auth/RLS)
- Gemini via Firebase AI Logic (`firebase/ai`) for resume tailoring
- Cheerio for job posting scraping
- `@react-pdf/renderer` for PDF generation
