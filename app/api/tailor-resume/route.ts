import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI, SchemaType, type Schema } from '@google/generative-ai';
import { supabase } from '@/lib/supabase/client';
import { tailorResumeRequestSchema, TailoredResumeResult } from '@/lib/types';

export const runtime = 'nodejs';

const MODEL_NAME = 'gemini-2.5-flash';

function isGeminiConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

const RESULT_SCHEMA: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    matchScore: {
      type: SchemaType.NUMBER,
      description: 'Overall match score between the resume and job, 0-100.',
    },
    tailoredSummary: {
      type: SchemaType.STRING,
      description: 'A rewritten professional summary tailored to this specific job.',
    },
    highlightedSkills: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
      description: "Skills from the candidate's existing skill list to emphasize for this job, ordered by relevance.",
    },
    recommendedBullets: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          roleId: { type: SchemaType.STRING, description: 'The id of the work experience entry this bullet belongs to.' },
          originalBullet: { type: SchemaType.STRING },
          tailoredBullet: { type: SchemaType.STRING },
          reasoning: { type: SchemaType.STRING, description: 'Brief explanation of why this rewrite better targets the job.' },
        },
      },
      description: 'Rewritten versions of existing resume bullets, tailored to the job description.',
    },
    missingKeywords: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
      description: "Important keywords/skills from the job posting that are missing from the candidate's resume.",
    },
  },
  required: ['matchScore', 'tailoredSummary', 'highlightedSkills', 'recommendedBullets', 'missingKeywords'],
};

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

    if (!isGeminiConfigured()) {
      return NextResponse.json(
        {
          success: false,
          error:
            'GEMINI_API_KEY is not configured. Get a free key at https://aistudio.google.com/apikey, add it to .env.local, and restart the server to enable tailoring.',
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
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
      const model = genAI.getGenerativeModel({
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
      console.error('Gemini API error:', aiError);
      const message = aiError instanceof Error ? aiError.message : 'Unknown error';
      return NextResponse.json(
        {
          success: false,
          error: `Failed to reach the Gemini API: ${message}. Check that GEMINI_API_KEY in .env.local is valid.`,
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
