import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAI, getGenerativeModel, GoogleAIBackend, Schema } from 'firebase/ai';
import { supabase } from '@/lib/supabase/client';
import { tailorResumeRequestSchema, TailoredResumeResult } from '@/lib/types';

export const runtime = 'nodejs';

const MODEL_NAME = 'gemini-2.5-flash';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

function isFirebaseAiConfigured(): boolean {
  return Boolean(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId);
}

const RESULT_SCHEMA = Schema.object({
  properties: {
    matchScore: Schema.number({
      description: 'Overall match score between the resume and job, 0-100.',
    }),
    tailoredSummary: Schema.string({
      description: 'A rewritten professional summary tailored to this specific job.',
    }),
    highlightedSkills: Schema.array({
      items: Schema.string(),
      description: "Skills from the candidate's existing skill list to emphasize for this job, ordered by relevance.",
    }),
    recommendedBullets: Schema.array({
      items: Schema.object({
        properties: {
          roleId: Schema.string({ description: 'The id of the work experience entry this bullet belongs to.' }),
          originalBullet: Schema.string(),
          tailoredBullet: Schema.string(),
          reasoning: Schema.string({ description: 'Brief explanation of why this rewrite better targets the job.' }),
        },
      }),
      description: 'Rewritten versions of existing resume bullets, tailored to the job description.',
    }),
    missingKeywords: Schema.array({
      items: Schema.string(),
      description: "Important keywords/skills from the job posting that are missing from the candidate's resume.",
    }),
  },
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = tailorResumeRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid request payload.', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { baseResume, jobDetails, jobUrl } = parsed.data;

    if (!isFirebaseAiConfigured()) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Firebase AI Logic is not configured. Add your Firebase web app config (NEXT_PUBLIC_FIREBASE_* values, from Project settings -> Your apps) to .env.local, make sure the Gemini API is enabled for this project (Firebase console -> Build -> AI Logic -> Get started), and restart the server to enable tailoring.',
        },
        { status: 200 }
      );
    }

    const experienceBlock = baseResume.experience
      .map(
        (exp) =>
          `- Role id: ${exp.id}\n  ${exp.role} at ${exp.company} (${exp.startDate} to ${exp.endDate})\n  Bullets:\n${exp.bullets
            .map((b) => `    - ${b}`)
            .join('\n')}`
      )
      .join('\n');

    const prompt = `Compare this candidate's resume against the job posting below and produce a tailoring analysis.

CANDIDATE RESUME
Summary: ${baseResume.summary}
Skills: ${baseResume.skills.join(', ')}
Experience:
${experienceBlock}

JOB POSTING
Title: ${jobDetails.title}
Company: ${jobDetails.company}
Key skills listed: ${jobDetails.keySkills.join(', ') || 'none extracted'}
Requirements:
${jobDetails.requirements.map((r) => `- ${r}`).join('\n') || 'none extracted'}
Full description:
${jobDetails.description}

Instructions:
- matchScore: honest 0-100 estimate of fit between resume and job.
- tailoredSummary: rewrite the professional summary to align with this job, staying truthful to the candidate's actual background.
- highlightedSkills: pick from the candidate's existing skills list only, ordered by relevance to this job.
- recommendedBullets: for each work experience bullet worth improving, provide a tailored rewrite that better reflects the job's language/requirements without fabricating experience. Use the exact roleId from the resume.
- missingKeywords: important skills/requirements from the job posting that are not present anywhere in the candidate's resume.

Respond with JSON matching the required schema.`;

    let tailoredResult: TailoredResumeResult;
    try {
      const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
      const ai = getAI(app, { backend: new GoogleAIBackend() });
      const model = getGenerativeModel(ai, {
        model: MODEL_NAME,
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: RESULT_SCHEMA,
        },
      });

      const result = await model.generateContent(prompt);
      const text = result.response.text();
      tailoredResult = JSON.parse(text) as TailoredResumeResult;
    } catch (aiError) {
      console.error('Gemini/Firebase AI Logic error:', aiError);
      const message = aiError instanceof Error ? aiError.message : 'Unknown error';
      return NextResponse.json(
        {
          success: false,
          error: `Failed to reach Gemini via Firebase AI Logic: ${message}. Make sure the Gemini API is enabled for this Firebase project (Build -> AI Logic in the Firebase console).`,
        },
        { status: 200 }
      );
    }

    const { error: insertError } = await supabase.from('resume_history').insert({
      job_title: jobDetails.title,
      company_name: jobDetails.company,
      job_url: jobUrl ?? null,
      raw_job_description: jobDetails.description,
      match_score: tailoredResult.matchScore,
      tailored_summary: tailoredResult.tailoredSummary,
      highlighted_skills: tailoredResult.highlightedSkills,
      recommended_bullets: tailoredResult.recommendedBullets,
      missing_keywords: tailoredResult.missingKeywords,
    });

    if (insertError) {
      console.error('Supabase insert error:', insertError);
    }

    return NextResponse.json({ success: true, result: tailoredResult });
  } catch (error) {
    console.error('tailor-resume error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: `Failed to tailor resume: ${message}` },
      { status: 200 }
    );
  }
}
