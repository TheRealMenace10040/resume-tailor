import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI, SchemaType, type Schema } from '@google/generative-ai';
// The package's main entry (index.js) runs a debug self-test on import when bundled,
// which throws ENOENT in Next.js's serverless runtime. Importing the inner lib avoids it.
import pdfParse from 'pdf-parse/lib/pdf-parse.js';
import { BaseResume, baseResumeSchema } from '@/lib/types';

export const runtime = 'nodejs';

const MODEL_NAME = 'gemini-flash-latest';

function isGeminiConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

const PARSE_SCHEMA: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    contact: {
      type: SchemaType.OBJECT,
      properties: {
        name: { type: SchemaType.STRING, description: "Candidate's full name." },
        email: { type: SchemaType.STRING, description: 'Email address, empty string if not found.' },
        phone: { type: SchemaType.STRING, description: 'Phone number, empty string if not found.' },
        location: { type: SchemaType.STRING, description: 'City/state or location, empty string if not found.' },
        links: {
          type: SchemaType.ARRAY,
          items: {
            type: SchemaType.OBJECT,
            properties: {
              label: { type: SchemaType.STRING, description: 'e.g. GitHub, LinkedIn, Portfolio' },
              url: { type: SchemaType.STRING },
            },
            required: ['label', 'url'],
          },
          description: 'Any URLs, handles, or profile links found (GitHub, LinkedIn, portfolio, personal site, etc).',
        },
      },
      required: ['name', 'email', 'links'],
    },
    summary: { type: SchemaType.STRING, description: 'Professional summary/objective, empty string if none present.' },
    skills: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
    experience: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          company: { type: SchemaType.STRING },
          role: { type: SchemaType.STRING },
          startDate: { type: SchemaType.STRING, description: 'e.g. "2023-01" or "Jan 2023"' },
          endDate: { type: SchemaType.STRING, description: 'e.g. "Present" or "2023-06"' },
          bullets: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
        },
        required: ['company', 'role', 'startDate', 'endDate', 'bullets'],
      },
    },
    education: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          institution: { type: SchemaType.STRING },
          degree: { type: SchemaType.STRING },
          graduationYear: { type: SchemaType.STRING },
        },
        required: ['institution', 'degree', 'graduationYear'],
      },
    },
  },
  required: ['contact', 'summary', 'skills', 'experience', 'education'],
};

interface ParsedResumeShape {
  contact: {
    name: string;
    email: string;
    phone?: string;
    location?: string;
    links: { label: string; url: string }[];
  };
  summary: string;
  skills: string[];
  experience: {
    company: string;
    role: string;
    startDate: string;
    endDate: string;
    bullets: string[];
  }[];
  education: { institution: string; degree: string; graduationYear: string }[];
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json({ success: false, error: 'Please upload a PDF file.' }, { status: 400 });
    }

    if (file.type && file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      return NextResponse.json({ success: false, error: 'Please upload a PDF file.' }, { status: 400 });
    }

    if (!isGeminiConfigured()) {
      return NextResponse.json(
        {
          success: false,
          error:
            'GEMINI_API_KEY is not configured. Get a free key at https://aistudio.google.com/apikey, add it to .env.local, and restart the server to enable resume parsing.',
        },
        { status: 200 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let rawText: string;
    try {
      const parsed = await pdfParse(buffer);
      rawText = parsed.text?.trim() ?? '';
    } catch (pdfError) {
      console.error('pdf-parse error:', pdfError);
      return NextResponse.json(
        { success: false, error: "Couldn't read that PDF. Make sure it's a valid, text-based PDF file." },
        { status: 200 }
      );
    }

    if (!rawText || rawText.length < 30) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Couldn't extract any text from that PDF. It may be a scanned image without a text layer — try a different file.",
        },
        { status: 200 }
      );
    }

    const prompt = `Extract structured resume data from the raw text below, which was extracted from a PDF resume.

RAW RESUME TEXT:
${rawText}

Instructions:
- Pull out contact info (name, email, phone, location) and any links (GitHub, LinkedIn, portfolio, personal site) mentioned as URLs or handles.
- Write a short professional summary if one exists in the text, otherwise synthesize a brief 1-2 sentence summary from the experience.
- List skills as individual short strings.
- List each work experience entry with company, role, start date, end date (use "Present" if current), and bullet points describing the role. Preserve the original wording of bullets as closely as possible.
- List education entries with institution, degree, and graduation year.
- Do not fabricate information that isn't present in the text. Use empty strings/arrays for anything you can't find.

Respond with JSON matching the required schema.`;

    let parsedShape: ParsedResumeShape;
    try {
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
      const model = genAI.getGenerativeModel({
        model: MODEL_NAME,
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: PARSE_SCHEMA,
        },
      });

      const result = await model.generateContent(prompt);
      const text = result.response.text();
      parsedShape = JSON.parse(text) as ParsedResumeShape;
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

    const resume: BaseResume = {
      contact: {
        name: parsedShape.contact?.name || '',
        email: parsedShape.contact?.email || '',
        phone: parsedShape.contact?.phone || undefined,
        location: parsedShape.contact?.location || undefined,
        links: parsedShape.contact?.links ?? [],
      },
      summary: parsedShape.summary || '',
      skills: parsedShape.skills ?? [],
      experience: (parsedShape.experience ?? []).map((exp, idx) => ({
        id: `exp-${idx + 1}`,
        company: exp.company || '',
        role: exp.role || '',
        startDate: exp.startDate || '',
        endDate: exp.endDate || '',
        bullets: exp.bullets ?? [],
      })),
      education: parsedShape.education ?? [],
    };

    const validated = baseResumeSchema.safeParse(resume);
    if (!validated.success) {
      console.error('Parsed resume failed validation:', validated.error.flatten());
      return NextResponse.json(
        {
          success: false,
          error: 'The parser produced an unexpected format. Please try a different PDF or contact support.',
        },
        { status: 200 }
      );
    }

    return NextResponse.json({ success: true, resume: validated.data });
  } catch (error) {
    console.error('parse-resume error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: `Failed to parse resume: ${message}` },
      { status: 200 }
    );
  }
}
