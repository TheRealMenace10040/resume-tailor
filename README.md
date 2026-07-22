# Resume Tailor

Paste a job posting, get a resume tailored to it, and download a matching PDF to submit yourself. This app does **not** auto-apply to jobs — it only prepares a resume for you to submit manually.

## Features

- Paste a job posting URL (Greenhouse/Lever-style ATS pages) and the app scrapes the title, company, and description via `fetch` + Cheerio.
- If scraping fails or the site isn't supported, paste the job description manually instead.
- Claude compares your resume to the job and returns a match score, a tailored summary, highlighted skills, recommended bullet rewrites, and missing keywords.
- Download a tailored resume as a PDF.
- History of past tailoring runs, stored in Supabase.

This is a single-user app with no login — anyone with the URL and no Supabase RLS can read/write the `resume_history` table, so keep the deployed URL private.

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy the env example and fill in your Anthropic API key:

   ```bash
   cp .env.local.example .env.local
   ```

   Get an Anthropic API key at [console.anthropic.com](https://console.anthropic.com) (Settings → API Keys) and paste it into `.env.local` as `ANTHROPIC_API_KEY`. The Supabase values are already filled in for this project.

   Without an Anthropic key, everything else (scraping, manual entry, PDF download, history) still works — "Tailor my resume" will show a clear setup error instead of crashing.

3. Run the dev server:

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

## Editing your base resume

Your resume content lives in [`lib/resume-data.ts`](lib/resume-data.ts) as the `defaultBaseResume` object. Edit it directly with your real name, contact info, skills, experience, and education.

## Deployment (Firebase App Hosting)

This app uses Next.js API routes and streams PDFs, so it's deployed with **Firebase App Hosting** (not static Firebase Hosting, which doesn't support SSR/API routes).

1. Set the Anthropic API key as a secret so it's available at runtime:

   ```bash
   firebase apphosting:secrets:set ANTHROPIC_API_KEY
   ```

2. Push to the connected GitHub branch — Firebase App Hosting builds and deploys automatically on push.

See [`apphosting.yaml`](apphosting.yaml) for the runtime configuration (env vars and secret wiring).

## Tech stack

- Next.js 14 (App Router)
- Tailwind CSS
- Supabase (`resume_history` table, no auth/RLS)
- Anthropic Messages API (Claude) for resume tailoring
- Cheerio for job posting scraping
- `@react-pdf/renderer` for PDF generation
