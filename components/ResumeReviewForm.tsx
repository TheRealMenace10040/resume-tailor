'use client';

import { useState } from 'react';
import { BaseResume, WorkExperience } from '@/lib/types';
import { saveAndActivateResume } from '@/lib/resumes';

interface ResumeReviewFormProps {
  initialResume: BaseResume;
  defaultLabel: string;
  sourceFilename: string | null;
  onCancel: () => void;
  onSaved: (resume: BaseResume, resumeId: string) => void;
}

export function ResumeReviewForm({
  initialResume,
  defaultLabel,
  sourceFilename,
  onCancel,
  onSaved,
}: ResumeReviewFormProps) {
  const [resume, setResume] = useState<BaseResume>(initialResume);
  const [label, setLabel] = useState(defaultLabel);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateContact<K extends keyof BaseResume['contact']>(key: K, value: BaseResume['contact'][K]) {
    setResume((r) => ({ ...r, contact: { ...r.contact, [key]: value } }));
  }

  function updateLink(idx: number, field: 'label' | 'url', value: string) {
    setResume((r) => {
      const links = [...r.contact.links];
      links[idx] = { ...links[idx], [field]: value };
      return { ...r, contact: { ...r.contact, links } };
    });
  }

  function addLink() {
    setResume((r) => ({ ...r, contact: { ...r.contact, links: [...r.contact.links, { label: '', url: '' }] } }));
  }

  function removeLink(idx: number) {
    setResume((r) => ({ ...r, contact: { ...r.contact, links: r.contact.links.filter((_, i) => i !== idx) } }));
  }

  function updateSkills(value: string) {
    setResume((r) => ({
      ...r,
      skills: value
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    }));
  }

  function updateExperience(idx: number, field: keyof Omit<WorkExperience, 'id' | 'bullets'>, value: string) {
    setResume((r) => {
      const experience = [...r.experience];
      experience[idx] = { ...experience[idx], [field]: value };
      return { ...r, experience };
    });
  }

  function updateBullet(expIdx: number, bulletIdx: number, value: string) {
    setResume((r) => {
      const experience = [...r.experience];
      const bullets = [...experience[expIdx].bullets];
      bullets[bulletIdx] = value;
      experience[expIdx] = { ...experience[expIdx], bullets };
      return { ...r, experience };
    });
  }

  function addBullet(expIdx: number) {
    setResume((r) => {
      const experience = [...r.experience];
      experience[expIdx] = { ...experience[expIdx], bullets: [...experience[expIdx].bullets, ''] };
      return { ...r, experience };
    });
  }

  function removeBullet(expIdx: number, bulletIdx: number) {
    setResume((r) => {
      const experience = [...r.experience];
      experience[expIdx] = {
        ...experience[expIdx],
        bullets: experience[expIdx].bullets.filter((_, i) => i !== bulletIdx),
      };
      return { ...r, experience };
    });
  }

  function addExperience() {
    setResume((r) => ({
      ...r,
      experience: [
        ...r.experience,
        { id: `exp-${Date.now()}`, company: '', role: '', startDate: '', endDate: '', bullets: [''] },
      ],
    }));
  }

  function removeExperience(idx: number) {
    setResume((r) => ({ ...r, experience: r.experience.filter((_, i) => i !== idx) }));
  }

  function updateEducation(idx: number, field: 'institution' | 'degree' | 'graduationYear', value: string) {
    setResume((r) => {
      const education = [...r.education];
      education[idx] = { ...education[idx], [field]: value };
      return { ...r, education };
    });
  }

  function addEducation() {
    setResume((r) => ({
      ...r,
      education: [...r.education, { institution: '', degree: '', graduationYear: '' }],
    }));
  }

  function removeEducation(idx: number) {
    setResume((r) => ({ ...r, education: r.education.filter((_, i) => i !== idx) }));
  }

  async function handleSave() {
    setError(null);
    setIsSaving(true);
    try {
      const { data, error: saveError } = await saveAndActivateResume({
        label: label.trim() || 'Untitled Resume',
        resumeData: resume,
        sourceFilename,
      });
      if (saveError || !data) {
        setError(saveError || 'Failed to save resume.');
        return;
      }
      onSaved(resume, data.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save resume.');
    } finally {
      setIsSaving(false);
    }
  }

  const inputClass = 'mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm';

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4">
      <div className="my-8 w-full max-w-2xl rounded-lg bg-white p-6">
        <h2 className="text-lg font-semibold text-slate-900">Review Parsed Resume</h2>
        <p className="mt-1 text-sm text-slate-600">
          Check the details below and correct anything the parser got wrong before saving.
        </p>

        <div className="mt-4">
          <label className="text-sm font-medium text-slate-700">Label this resume</label>
          <input type="text" value={label} onChange={(e) => setLabel(e.target.value)} className={inputClass} />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <div>
            <label className="text-sm font-medium text-slate-700">Name</label>
            <input value={resume.contact.name} onChange={(e) => updateContact('name', e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Email</label>
            <input value={resume.contact.email} onChange={(e) => updateContact('email', e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Phone</label>
            <input
              value={resume.contact.phone ?? ''}
              onChange={(e) => updateContact('phone', e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Location</label>
            <input
              value={resume.contact.location ?? ''}
              onChange={(e) => updateContact('location', e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        <div className="mt-3">
          <label className="text-sm font-medium text-slate-700">Links</label>
          {resume.contact.links.map((link, idx) => (
            <div key={idx} className="mt-1 flex gap-2">
              <input
                placeholder="Label"
                value={link.label}
                onChange={(e) => updateLink(idx, 'label', e.target.value)}
                className="w-1/3 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
              />
              <input
                placeholder="URL"
                value={link.url}
                onChange={(e) => updateLink(idx, 'url', e.target.value)}
                className="flex-1 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
              />
              <button onClick={() => removeLink(idx)} className="text-xs text-red-600">
                Remove
              </button>
            </div>
          ))}
          <button onClick={addLink} className="mt-1 text-xs text-blue-600 hover:underline">
            + Add link
          </button>
        </div>

        <div className="mt-3">
          <label className="text-sm font-medium text-slate-700">Summary</label>
          <textarea
            value={resume.summary}
            onChange={(e) => setResume((r) => ({ ...r, summary: e.target.value }))}
            rows={3}
            className={inputClass}
          />
        </div>

        <div className="mt-3">
          <label className="text-sm font-medium text-slate-700">Skills (comma-separated)</label>
          <textarea value={resume.skills.join(', ')} onChange={(e) => updateSkills(e.target.value)} rows={2} className={inputClass} />
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-slate-700">Experience</label>
            <button onClick={addExperience} className="text-xs text-blue-600 hover:underline">
              + Add role
            </button>
          </div>
          <div className="mt-2 space-y-3">
            {resume.experience.map((exp, idx) => (
              <div key={exp.id} className="rounded-md border border-slate-200 p-3">
                <div className="flex justify-end">
                  <button onClick={() => removeExperience(idx)} className="text-xs text-red-600">
                    Remove role
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    placeholder="Company"
                    value={exp.company}
                    onChange={(e) => updateExperience(idx, 'company', e.target.value)}
                    className="rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                  />
                  <input
                    placeholder="Role"
                    value={exp.role}
                    onChange={(e) => updateExperience(idx, 'role', e.target.value)}
                    className="rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                  />
                  <input
                    placeholder="Start date"
                    value={exp.startDate}
                    onChange={(e) => updateExperience(idx, 'startDate', e.target.value)}
                    className="rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                  />
                  <input
                    placeholder="End date"
                    value={exp.endDate}
                    onChange={(e) => updateExperience(idx, 'endDate', e.target.value)}
                    className="rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                  />
                </div>
                <div className="mt-2">
                  <label className="text-xs font-medium text-slate-600">Bullets</label>
                  {exp.bullets.map((bullet, bIdx) => (
                    <div key={bIdx} className="mt-1 flex gap-2">
                      <textarea
                        value={bullet}
                        onChange={(e) => updateBullet(idx, bIdx, e.target.value)}
                        rows={2}
                        className="flex-1 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                      />
                      <button onClick={() => removeBullet(idx, bIdx)} className="text-xs text-red-600">
                        Remove
                      </button>
                    </div>
                  ))}
                  <button onClick={() => addBullet(idx)} className="mt-1 text-xs text-blue-600 hover:underline">
                    + Add bullet
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-slate-700">Education</label>
            <button onClick={addEducation} className="text-xs text-blue-600 hover:underline">
              + Add education
            </button>
          </div>
          <div className="mt-2 space-y-2">
            {resume.education.map((edu, idx) => (
              <div key={idx} className="flex gap-2">
                <input
                  placeholder="Institution"
                  value={edu.institution}
                  onChange={(e) => updateEducation(idx, 'institution', e.target.value)}
                  className="flex-1 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                />
                <input
                  placeholder="Degree"
                  value={edu.degree}
                  onChange={(e) => updateEducation(idx, 'degree', e.target.value)}
                  className="flex-1 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                />
                <input
                  placeholder="Year"
                  value={edu.graduationYear}
                  onChange={(e) => updateEducation(idx, 'graduationYear', e.target.value)}
                  className="w-24 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                />
                <button onClick={() => removeEducation(idx)} className="text-xs text-red-600">
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onCancel}
            disabled={isSaving}
            className="rounded-md bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
          >
            {isSaving ? 'Saving…' : 'Save & Activate'}
          </button>
        </div>
      </div>
    </div>
  );
}
