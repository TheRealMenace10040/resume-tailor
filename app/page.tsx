'use client';

import { useState } from 'react';
import { defaultBaseResume } from '@/lib/resume-data';
import { JobPostingDetails, TailoredResumeResult } from '@/lib/types';
import { DownloadPdfButton } from '@/components/DownloadPdfButton';
import { HistoryList } from '@/components/HistoryList';

type InputMode = 'url' | 'manual';

export default function HomePage() {
  const baseResume = defaultBaseResume;

  const [inputMode, setInputMode] = useState<InputMode>('url');
  const [jobUrl, setJobUrl] = useState('');
  const [manualTitle, setManualTitle] = useState('');
  const [manualCompany, setManualCompany] = useState('');
  const [manualDescription, setManualDescription] = useState('');

  const [jobDetails, setJobDetails] = useState<JobPostingDetails | null>(null);
  const [tailoredResult, setTailoredResult] = useState<TailoredResumeResult | null>(null);

  const [isScraping, setIsScraping] = useState(false);
  const [isTailoring, setIsTailoring] = useState(false);
  const [scrapeError, setScrapeError] = useState<string | null>(null);
  const [tailorError, setTailorError] = useState<string | null>(null);

  async function handleFetchJob() {
    setScrapeError(null);
    setIsScraping(true);
    setJobDetails(null);
    try {
      const response = await fetch('/api/scrape-job', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: jobUrl }),
      });
      const data = await response.json();
      if (!data.success) {
        setScrapeError(data.error || 'Failed to scrape job posting.');
        return;
      }
      setJobDetails(data.jobDetails);
    } catch {
      setScrapeError("Couldn't reach the scraping service. Please paste the job description manually instead.");
    } finally {
      setIsScraping(false);
    }
  }

  function handleUseManualDescription() {
    if (!manualDescription.trim()) return;
    setJobDetails({
      title: manualTitle.trim() || 'Untitled Position',
      company: manualCompany.trim() || 'Unknown Company',
      description: manualDescription.trim(),
      keySkills: [],
      requirements: [],
    });
  }

  async function handleTailor() {
    if (!jobDetails) return;
    setTailorError(null);
    setIsTailoring(true);
    setTailoredResult(null);
    try {
      const response = await fetch('/api/tailor-resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baseResume,
          jobDetails,
          jobUrl: inputMode === 'url' && jobUrl ? jobUrl : undefined,
        }),
      });
      const data = await response.json();
      if (!data.success) {
        setTailorError(data.error || 'Failed to tailor resume.');
        return;
      }
      setTailoredResult(data.result);
    } catch {
      setTailorError('Something went wrong while tailoring your resume.');
    } finally {
      setIsTailoring(false);
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-bold text-slate-900">Resume Tailor</h1>
      <p className="mt-1 text-sm text-slate-600">
        Paste a job posting, get a tailored resume, and download a matching PDF to submit yourself.
      </p>

      {/* Base resume */}
      <section className="mt-8 rounded-lg border border-slate-200 bg-white p-5">
        <h2 className="text-lg font-semibold text-slate-900">Base Resume</h2>
        <p className="mt-1 text-sm font-medium">{baseResume.contact.name}</p>
        <p className="text-sm text-slate-600">{baseResume.summary}</p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {baseResume.skills.map((skill) => (
            <span key={skill} className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
              {skill}
            </span>
          ))}
        </div>
        <div className="mt-4 space-y-3">
          {baseResume.experience.map((exp) => (
            <div key={exp.id}>
              <p className="text-sm font-medium text-slate-900">
                {exp.role} · {exp.company}
              </p>
              <p className="text-xs text-slate-500">
                {exp.startDate} – {exp.endDate}
              </p>
              <ul className="mt-1 list-inside list-disc text-sm text-slate-600">
                {exp.bullets.map((bullet, idx) => (
                  <li key={idx}>{bullet}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* Job input */}
      <section className="mt-6 rounded-lg border border-slate-200 bg-white p-5">
        <h2 className="text-lg font-semibold text-slate-900">Job Posting</h2>

        <div className="mt-3 flex gap-2">
          <button
            onClick={() => setInputMode('url')}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${
              inputMode === 'url' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'
            }`}
          >
            Paste URL
          </button>
          <button
            onClick={() => setInputMode('manual')}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${
              inputMode === 'manual' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'
            }`}
          >
            Paste description manually
          </button>
        </div>

        {inputMode === 'url' ? (
          <div className="mt-4 space-y-2">
            <input
              type="url"
              value={jobUrl}
              onChange={(e) => setJobUrl(e.target.value)}
              placeholder="https://boards.greenhouse.io/company/jobs/12345"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
            <button
              onClick={handleFetchJob}
              disabled={!jobUrl || isScraping}
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
            >
              {isScraping ? 'Fetching…' : 'Fetch job details'}
            </button>
            {scrapeError && (
              <p className="text-sm text-red-600">
                {scrapeError}{' '}
                <button onClick={() => setInputMode('manual')} className="underline">
                  Switch to manual entry
                </button>
              </p>
            )}
          </div>
        ) : (
          <div className="mt-4 space-y-2">
            <div className="flex gap-2">
              <input
                type="text"
                value={manualTitle}
                onChange={(e) => setManualTitle(e.target.value)}
                placeholder="Job title (optional)"
                className="w-1/2 rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
              <input
                type="text"
                value={manualCompany}
                onChange={(e) => setManualCompany(e.target.value)}
                placeholder="Company (optional)"
                className="w-1/2 rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <textarea
              value={manualDescription}
              onChange={(e) => setManualDescription(e.target.value)}
              placeholder="Paste the full job description here…"
              rows={8}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
            <button
              onClick={handleUseManualDescription}
              disabled={!manualDescription.trim()}
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
            >
              Use this description
            </button>
          </div>
        )}

        {jobDetails && (
          <div className="mt-4 rounded-md bg-slate-50 p-3 text-sm">
            <p className="font-medium text-slate-900">
              {jobDetails.title} · {jobDetails.company}
            </p>
            <p className="mt-1 line-clamp-3 text-slate-600">{jobDetails.description}</p>
          </div>
        )}

        <button
          onClick={handleTailor}
          disabled={!jobDetails || isTailoring}
          className="mt-4 w-full rounded-md bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
        >
          {isTailoring ? 'Tailoring…' : 'Tailor my resume'}
        </button>
        {tailorError && <p className="mt-2 text-sm text-red-600">{tailorError}</p>}
      </section>

      {/* Results */}
      {tailoredResult && (
        <section className="mt-6 rounded-lg border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Results</h2>
            <span className="rounded-full bg-slate-900 px-3 py-1 text-sm font-semibold text-white">
              {tailoredResult.matchScore}% match
            </span>
          </div>

          <div className="mt-4">
            <h3 className="text-sm font-semibold text-slate-900">Tailored Summary</h3>
            <p className="mt-1 text-sm text-slate-600">{tailoredResult.tailoredSummary}</p>
          </div>

          <div className="mt-4">
            <h3 className="text-sm font-semibold text-slate-900">Highlighted Skills</h3>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {tailoredResult.highlightedSkills.map((skill) => (
                <span key={skill} className="rounded bg-green-100 px-2 py-0.5 text-xs text-green-800">
                  {skill}
                </span>
              ))}
            </div>
          </div>

          {tailoredResult.recommendedBullets.length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-semibold text-slate-900">Recommended Bullet Swaps</h3>
              <div className="mt-2 space-y-3">
                {tailoredResult.recommendedBullets.map((b, idx) => (
                  <div key={idx} className="rounded-md border border-slate-200 p-3 text-sm">
                    <p className="text-slate-500 line-through">{b.originalBullet}</p>
                    <p className="mt-1 font-medium text-slate-900">{b.tailoredBullet}</p>
                    <p className="mt-1 text-xs text-slate-500">{b.reasoning}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tailoredResult.missingKeywords.length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-semibold text-slate-900">Missing Keywords</h3>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {tailoredResult.missingKeywords.map((kw) => (
                  <span key={kw} className="rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-800">
                    {kw}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="mt-5">
            <DownloadPdfButton baseResume={baseResume} tailoredResult={tailoredResult} />
          </div>
        </section>
      )}

      {/* History */}
      <section className="mt-6">
        <h2 className="text-lg font-semibold text-slate-900">History</h2>
        <div className="mt-3">
          <HistoryList />
        </div>
      </section>
    </main>
  );
}
