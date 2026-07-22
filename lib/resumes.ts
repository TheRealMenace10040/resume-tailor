import { supabase } from '@/lib/supabase/client';
import { BaseResume, ResumeRow } from '@/lib/types';

export async function fetchActiveResume(): Promise<ResumeRow | null> {
  const { data, error } = await supabase.from('resumes').select('*').eq('is_active', true).maybeSingle();
  if (error) {
    console.error('fetchActiveResume error:', error);
    return null;
  }
  return data as ResumeRow | null;
}

export async function fetchAllResumes(): Promise<{ data: ResumeRow[]; error: string | null }> {
  const { data, error } = await supabase.from('resumes').select('*').order('created_at', { ascending: false });
  if (error) {
    return { data: [], error: error.message };
  }
  return { data: (data ?? []) as ResumeRow[], error: null };
}

export async function setActiveResume(id: string): Promise<{ data: ResumeRow | null; error: string | null }> {
  const { error: deactivateError } = await supabase
    .from('resumes')
    .update({ is_active: false })
    .neq('id', id)
    .eq('is_active', true);

  if (deactivateError) {
    return { data: null, error: deactivateError.message };
  }

  const { data, error } = await supabase
    .from('resumes')
    .update({ is_active: true })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: data as ResumeRow, error: null };
}

export async function saveAndActivateResume(params: {
  label: string;
  resumeData: BaseResume;
  sourceFilename: string | null;
}): Promise<{ data: ResumeRow | null; error: string | null }> {
  const { error: deactivateError } = await supabase.from('resumes').update({ is_active: false }).eq('is_active', true);

  if (deactivateError) {
    return { data: null, error: deactivateError.message };
  }

  const { data, error } = await supabase
    .from('resumes')
    .insert({
      label: params.label,
      resume_data: params.resumeData,
      source_filename: params.sourceFilename,
      is_active: true,
    })
    .select()
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: data as ResumeRow, error: null };
}

export async function deleteResume(
  id: string,
  allResumes: ResumeRow[]
): Promise<{ fallback: ResumeRow | null; error: string | null }> {
  const target = allResumes.find((r) => r.id === id);
  const remaining = allResumes.filter((r) => r.id !== id);
  let fallback: ResumeRow | null = null;

  if (target?.is_active && remaining.length > 0) {
    const next = [...remaining].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )[0];
    const { data, error } = await setActiveResume(next.id);
    if (error) {
      return { fallback: null, error };
    }
    fallback = data;
  }

  const { error: deleteError } = await supabase.from('resumes').delete().eq('id', id);
  if (deleteError) {
    return { fallback, error: deleteError.message };
  }

  return { fallback, error: null };
}
