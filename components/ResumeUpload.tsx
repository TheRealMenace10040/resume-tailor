'use client';

import { useState } from 'react';
import { BaseResume } from '@/lib/types';

interface ResumeUploadProps {
  onParsed: (resume: BaseResume, filename: string) => void;
}

export function ResumeUpload({ onParsed }: ResumeUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleUpload() {
    if (!file) return;
    setError(null);
    setIsParsing(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch('/api/parse-resume', { method: 'POST', body: formData });
      const data = await response.json();
      if (!data.success) {
        setError(data.error || 'Failed to parse resume.');
        return;
      }
      onParsed(data.resume as BaseResume, file.name);
      setFile(null);
    } catch {
      setError('Something went wrong while parsing your resume.');
    } finally {
      setIsParsing(false);
    }
  }

  return (
    <section className="mt-6 rounded-lg border border-slate-200 bg-white p-5">
      <h2 className="text-lg font-semibold text-slate-900">Upload Resume (PDF)</h2>
      <p className="mt-1 text-sm text-slate-600">
        Upload a PDF resume to parse it. You&apos;ll be able to review and correct the details before it becomes
        your active resume.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <input
          type="file"
          accept="application/pdf,.pdf"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="text-sm text-slate-700"
        />
        <button
          onClick={handleUpload}
          disabled={!file || isParsing}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
        >
          {isParsing ? 'Parsing…' : 'Parse Resume'}
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </section>
  );
}
