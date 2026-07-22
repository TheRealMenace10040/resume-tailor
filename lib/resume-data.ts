import { BaseResume } from './types';

export const defaultBaseResume: BaseResume = {
  contact: {
    name: 'Your Name',
    email: 'your.email@example.com',
    location: 'Your Location',
    links: [
      { label: 'GitHub', url: 'https://github.com' },
      { label: 'Portfolio', url: 'https://job-streak-app.web.app' },
    ],
  },
  summary:
    'Detail-oriented professional with technical expertise across laboratory quality assurance, database management, and full-stack software development.',
  skills: [
    'Quality Assurance',
    'Microbiology Testing',
    'TypeScript',
    'React',
    'SQL',
    'Supabase',
    'C++',
    'Salesforce',
    'REST APIs',
  ],
  experience: [
    {
      id: 'exp-1',
      company: 'Current Company',
      role: 'Quality Microbiology Laboratory Technician',
      startDate: '2023-01',
      endDate: 'Present',
      bullets: [
        'Executed quality control protocols and microbiological testing according to strict compliance standards.',
        'Managed laboratory database records and optimized reporting workflows for efficiency.',
        'Collaborated across teams to resolve technical issues and maintain quality assurance integrity.',
      ],
    },
  ],
  education: [
    { institution: 'University', degree: 'Bachelor of Science', graduationYear: '2022' },
  ],
};
