import { z } from 'zod';

export interface WorkExperience {
  id: string;
  company: string;
  role: string;
  startDate: string;
  endDate: string;
  bullets: string[];
}

export interface BaseResume {
  contact: {
    name: string;
    email: string;
    phone?: string;
    location?: string;
    links: { label: string; url: string }[];
  };
  summary: string;
  skills: string[];
  experience: WorkExperience[];
  education: { institution: string; degree: string; graduationYear: string }[];
}

export interface JobPostingDetails {
  title: string;
  company: string;
  description: string;
  keySkills: string[];
  requirements: string[];
}

export interface TailoredResumeResult {
  matchScore: number;
  tailoredSummary: string;
  highlightedSkills: string[];
  recommendedBullets: {
    roleId: string;
    originalBullet: string;
    tailoredBullet: string;
    reasoning: string;
  }[];
  missingKeywords: string[];
}

export const jobPostingDetailsSchema = z.object({
  title: z.string(),
  company: z.string(),
  description: z.string().min(1, 'Job description cannot be empty'),
  keySkills: z.array(z.string()).default([]),
  requirements: z.array(z.string()).default([]),
});

export const workExperienceSchema = z.object({
  id: z.string(),
  company: z.string(),
  role: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  bullets: z.array(z.string()),
});

export const baseResumeSchema = z.object({
  contact: z.object({
    name: z.string(),
    email: z.string(),
    phone: z.string().optional(),
    location: z.string().optional(),
    links: z.array(z.object({ label: z.string(), url: z.string() })),
  }),
  summary: z.string(),
  skills: z.array(z.string()),
  experience: z.array(workExperienceSchema),
  education: z.array(
    z.object({
      institution: z.string(),
      degree: z.string(),
      graduationYear: z.string(),
    })
  ),
});

export const scrapeJobRequestSchema = z.object({
  url: z.string().url('Please provide a valid URL'),
});

export const tailorResumeRequestSchema = z.object({
  baseResume: baseResumeSchema,
  jobDetails: jobPostingDetailsSchema,
  jobUrl: z.string().url().optional(),
});

export interface ResumeRow {
  id: string;
  label: string;
  resume_data: BaseResume;
  source_filename: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ResumeHistoryRow {
  id: string;
  job_title: string | null;
  company_name: string | null;
  job_url: string | null;
  raw_job_description: string | null;
  match_score: number | null;
  tailored_summary: string | null;
  highlighted_skills: string[] | null;
  recommended_bullets: TailoredResumeResult['recommendedBullets'] | null;
  missing_keywords: string[] | null;
  created_at: string;
  updated_at: string;
}

export const tailoredResumeResultSchema = z.object({
  matchScore: z.number().min(0).max(100),
  tailoredSummary: z.string(),
  highlightedSkills: z.array(z.string()),
  recommendedBullets: z.array(
    z.object({
      roleId: z.string(),
      originalBullet: z.string(),
      tailoredBullet: z.string(),
      reasoning: z.string(),
    })
  ),
  missingKeywords: z.array(z.string()),
});
