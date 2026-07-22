import { NextRequest, NextResponse } from 'next/server';
import { renderToStream, DocumentProps } from '@react-pdf/renderer';
import React from 'react';
import { ResumePDFDocument } from '@/components/ResumePDFDocument';
import { baseResumeSchema, tailoredResumeResultSchema } from '@/lib/types';
import { z } from 'zod';

export const runtime = 'nodejs';

const downloadRequestSchema = z.object({
  baseResume: baseResumeSchema,
  tailoredResult: tailoredResumeResultSchema.nullable().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = downloadRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid resume data.' },
        { status: 400 }
      );
    }

    const { baseResume, tailoredResult } = parsed.data;

    const stream = await renderToStream(
      React.createElement(ResumePDFDocument, { resume: baseResume, tailoredResult }) as React.ReactElement<DocumentProps>
    );

    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.from(chunk));
    }
    const pdfBuffer = Buffer.concat(chunks);

    const fileName = `${baseResume.contact.name.replace(/\s+/g, '_')}_Resume.pdf`;

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    });
  } catch (error) {
    console.error('download-resume error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate PDF.' },
      { status: 500 }
    );
  }
}
