import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { supabase } from '@/lib/supabase/client';
import { tailorResumeRequestSchema, TailoredResumeResult } from '@/lib/types';

export const runtime = 'nodejs';

const MODEL = 'claude-sonnet-5';

const RESULT_TOOL = {
  name: 'submit_tailored_resume',
  description: 'Submit the structured resume-tailoring analysis.',
  input_schema: {
    type: 'object' as const,
    properties: {
      matchScore: {
        type: 'number',
        description: 'Overall match score between the resume and job, 0-100.',
      },
      tailoredSummary: {
        type: 'string',
        description: 'A rewritten professional summary tailored to this specific job.',
      },
      highlightedSkills: {
        type: 'array',
        items: { type: 'string' },
        description: "Skills from the candidate's existing skill list to emphasize for this job, ordered by relevance.",
      },
      recommendedBullets: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            roleId: { type: 'string', description: 'The id of the work experience entry this bullet belongs to.' },
            originalBullet: { type: 'string' },
            tailoredBullet: { type: 'string' },
            reasoning: { type: 'string', description: 'Brief explanation of why this rewrite better targets the job.' },
          },
          required: ['roleId', 'originalBullet', 'tailoredBullet', 'reasoning'],
        },
        description: 'Rewritten versions of existing resume bullets, tailored to the job description.',
      },
      missingKeywords: {
        type: 'array',
        items: { type: 'string' },
        description: "Important keywords/skills from the job posting that are missing from the candidate's resume.",
      },
    },
    required: ['matchScore', 'tailoredSummary', 'highlightedSkills', 'recommendedBullets', 'missingKeywords'],
  },
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

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          error:
            'ANTHROPIC_API_KEY is not configured. Add your Anthropic API key (from console.anthropic.com) to .env.local as ANTHROPIC_API_KEY and restart the server to enable tailoring.',
        },
        { status: 200 }
      );
    }

    const anthropic = new Anthropic({ apiKey });

    const experienceBlock = baseResume.experience
      .map(
        (exp) =>
          `- Role id: ${exp.id}\n  ${exp.role} at ${exp.company} (${exp.startDate} to ${exp.endDate})\n  Bullets:\n${exp.bullets
            .map((b) => `    - ${b}`)
            .join('\n')}`
      )
      .join('\n');

    const userMessage = `Compare this candidate's resume against the job posting below and produce a tailoring analysis.

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

Call the submit_tailored_resume tool with your analysis.`;

    const message = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 4096,
      tools: [RESULT_TOOL],
      tool_choice: { type: 'tool', name: RESULT_TOOL.name },
      messages: [{ role: 'user', content: userMessage }],
    });

    const toolUseBlock = message.content.find(
      (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use'
    );

    if (!toolUseBlock) {
      return NextResponse.json(
        { success: false, error: 'The AI did not return a structured result. Please try again.' },
        { status: 200 }
      );
    }

    const tailoredResult = toolUseBlock.input as TailoredResumeResult;

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
