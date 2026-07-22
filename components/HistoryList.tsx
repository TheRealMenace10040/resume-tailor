'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { ResumeHistoryRow } from '@/lib/types';

export function HistoryList() {
  const [rows, setRows] = useState<ResumeHistoryRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadHistory() {
      const { data, error } = await supabase
        .from('resume_history')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(25);

      if (cancelled) return;

      if (error) {
        setError(error.message);
      } else {
        setRows(data as ResumeHistoryRow[]);
      }
      setIsLoading(false);
    }

    loadHistory();
    return () => {
      cancelled = true;
    };
  }, []);

  if (isLoading) {
    return <p className="text-sm text-slate-500">Loading history…</p>;
  }

  if (error) {
    return <p className="text-sm text-red-600">Couldn't load history: {error}</p>;
  }

  if (rows.length === 0) {
    return <p className="text-sm text-slate-500">No tailored resumes yet. Run your first tailor above.</p>;
  }

  return (
    <ul className="divide-y divide-slate-200 rounded-md border border-slate-200 bg-white">
      {rows.map((row) => (
        <li key={row.id} className="p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-medium text-slate-900">
                {row.job_title || 'Untitled role'}
                {row.company_name ? ` · ${row.company_name}` : ''}
              </p>
              <p className="text-xs text-slate-500">
                {new Date(row.created_at).toLocaleString()}
              </p>
              {row.job_url && (
                <a
                  href={row.job_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-blue-600 hover:underline"
                >
                  View posting
                </a>
              )}
            </div>
            {typeof row.match_score === 'number' && (
              <span className="shrink-0 rounded-full bg-slate-900 px-2.5 py-1 text-xs font-semibold text-white">
                {row.match_score}% match
              </span>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
