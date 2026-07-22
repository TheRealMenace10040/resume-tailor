'use client';

import { useEffect, useState } from 'react';
import { defaultBaseResume } from '@/lib/resume-data';
import { deleteResume, fetchAllResumes, setActiveResume } from '@/lib/resumes';
import { BaseResume, ResumeRow } from '@/lib/types';

interface ResumeListProps {
  activeResumeId: string | null;
  refreshSignal: number;
  onActiveResumeChange: (resume: BaseResume, resumeId: string | null) => void;
}

export function ResumeList({ activeResumeId, refreshSignal, onActiveResumeChange }: ResumeListProps) {
  const [rows, setRows] = useState<ResumeRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function loadResumes() {
    setIsLoading(true);
    const { data, error: fetchError } = await fetchAllResumes();
    setRows(data);
    setError(fetchError);
    setIsLoading(false);
  }

  useEffect(() => {
    loadResumes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshSignal]);

  async function handleMakeActive(row: ResumeRow) {
    setBusyId(row.id);
    setError(null);
    const { data, error: activateError } = await setActiveResume(row.id);
    if (activateError || !data) {
      setError(activateError || 'Failed to switch active resume.');
      setBusyId(null);
      return;
    }
    onActiveResumeChange(data.resume_data, data.id);
    await loadResumes();
    setBusyId(null);
  }

  async function handleDelete(row: ResumeRow) {
    setBusyId(row.id);
    setError(null);
    const { fallback, error: deleteError } = await deleteResume(row.id, rows);
    if (deleteError) {
      setError(deleteError);
      setBusyId(null);
      setPendingDeleteId(null);
      return;
    }
    if (row.id === activeResumeId) {
      if (fallback) {
        onActiveResumeChange(fallback.resume_data, fallback.id);
      } else {
        onActiveResumeChange(defaultBaseResume, null);
      }
    }
    await loadResumes();
    setBusyId(null);
    setPendingDeleteId(null);
  }

  if (isLoading) {
    return <p className="text-sm text-slate-500">Loading resumes…</p>;
  }

  if (rows.length === 0) {
    return <p className="text-sm text-slate-500">No resumes uploaded yet. Upload a PDF above to get started.</p>;
  }

  return (
    <div>
      {error && <p className="mb-2 text-sm text-red-600">{error}</p>}
      <ul className="divide-y divide-slate-200 rounded-md border border-slate-200 bg-white">
        {rows.map((row) => {
          const isActive = row.id === activeResumeId;
          const isBusy = busyId === row.id;
          return (
            <li key={row.id} className="flex items-center justify-between gap-4 p-4">
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium text-slate-900">{row.label}</p>
                  {isActive && (
                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-800">
                      Active
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500">
                  Uploaded {new Date(row.created_at).toLocaleString()}
                  {row.source_filename ? ` · ${row.source_filename}` : ''}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {!isActive && (
                  <button
                    onClick={() => handleMakeActive(row)}
                    disabled={isBusy}
                    className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-700 disabled:opacity-50"
                  >
                    {isBusy ? 'Switching…' : 'Make Active'}
                  </button>
                )}
                {pendingDeleteId === row.id ? (
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-slate-600">Delete?</span>
                    <button
                      onClick={() => handleDelete(row)}
                      disabled={isBusy}
                      className="rounded-md bg-red-600 px-2 py-1 text-xs font-medium text-white hover:bg-red-500 disabled:opacity-50"
                    >
                      {isBusy ? 'Deleting…' : 'Confirm'}
                    </button>
                    <button
                      onClick={() => setPendingDeleteId(null)}
                      disabled={isBusy}
                      className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-200"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setPendingDeleteId(row.id)}
                    className="rounded-md bg-slate-100 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-slate-200"
                  >
                    Delete
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
