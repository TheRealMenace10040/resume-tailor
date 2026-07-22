'use client';

import { useState } from 'react';
import { BaseResume, TailoredResumeResult } from '@/lib/types';

interface DownloadPdfButtonProps {
  baseResume: BaseResume;
  tailoredResult: TailoredResumeResult | null;
}

export function DownloadPdfButton({ baseResume, tailoredResult }: DownloadPdfButtonProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDownload() {
    setIsDownloading(true);
    setError(null);
    try {
      const response = await fetch('/api/download-resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ baseResume, tailoredResult }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate PDF.');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${baseResume.contact.name.replace(/\s+/g, '_')}_Resume.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download PDF.');
    } finally {
      setIsDownloading(false);
    }
  }

  return (
    <div>
      <button
        onClick={handleDownload}
        disabled={isDownloading}
        className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
      >
        {isDownloading ? 'Generating PDF…' : 'Download Resume PDF'}
      </button>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
