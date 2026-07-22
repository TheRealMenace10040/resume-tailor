import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import { scrapeJobRequestSchema, JobPostingDetails } from '@/lib/types';

export const runtime = 'nodejs';

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

function cleanText(text: string): string {
  return text.replace(/\r/g, '').replace(/\n{3,}/g, '\n\n').replace(/[ \t]{2,}/g, ' ').trim();
}

function extractKeySkillsAndRequirements(description: string): {
  keySkills: string[];
  requirements: string[];
} {
  const lines = description.split('\n').map((l) => l.trim()).filter(Boolean);
  const requirements: string[] = [];
  for (const line of lines) {
    const bulletMatch = line.match(/^[-•*]\s*(.+)/);
    if (bulletMatch && bulletMatch[1].length > 15 && bulletMatch[1].length < 300) {
      requirements.push(bulletMatch[1]);
    }
  }
  return { keySkills: [], requirements: requirements.slice(0, 20) };
}

function extractCompanyFromDocTitle($: cheerio.CheerioAPI): string {
  const docTitle = $('title').text().trim();
  const atMatch = docTitle.match(/\bat\s+(.+)$/i);
  if (atMatch) return atMatch[1].trim();
  const dashMatch = docTitle.match(/^(.+?)\s+-\s+.+$/);
  if (dashMatch) return dashMatch[1].trim();
  return '';
}

function parseGreenhouse($: cheerio.CheerioAPI): { title: string; company: string; description: string } | null {
  const title = $('#header .app-title, h1.app-title, .job__title h1, h1[class*="title"]').first().text().trim();
  const company =
    $('#header .company-name, .company-name').first().text().trim().replace(/^at\s+/i, '') ||
    $('meta[property="og:site_name"]').attr('content') ||
    extractCompanyFromDocTitle($) ||
    '';
  const descriptionEl = $('#content, .job__description, #app-body').first();
  const description = cleanText(descriptionEl.text());

  if (!title || description.length < 50) return null;
  return { title, company, description };
}

function parseLever($: cheerio.CheerioAPI): { title: string; company: string; description: string } | null {
  const title = $('.posting-headline h2, .posting-header h2').first().text().trim();
  const company =
    $('meta[property="og:site_name"]').attr('content') ||
    extractCompanyFromDocTitle($) ||
    ($('.main-header-logo img').attr('alt') || '').replace(/\s*logo$/i, '').trim() ||
    '';
  const descriptionEl = $('.section-wrapper, .posting-page .content, [data-qa="job-description"]').first();
  let description = cleanText(descriptionEl.text());
  if (!description || description.length < 50) {
    description = cleanText($('.posting-page').text());
  }

  if (!title || description.length < 50) return null;
  return { title, company, description };
}

function parseLinkedIn($: cheerio.CheerioAPI): { title: string; company: string; description: string } | null {
  const title = $('h1.top-card-layout__title, .topcard__title').first().text().trim();
  const company =
    $('a.topcard__org-name-link, .topcard__org-name-link').first().text().trim() ||
    $('meta[property="og:site_name"]').attr('content') ||
    extractCompanyFromDocTitle($) ||
    '';

  const descriptionEl = $('.show-more-less-html__markup, .description__text').first();
  descriptionEl.find('br').replaceWith('\n');
  descriptionEl.find('li, p').each((_, el) => {
    $(el).append('\n');
  });
  const description = cleanText(descriptionEl.text());

  if (!title || description.length < 50) return null;
  return { title, company, description };
}

function parseGeneric($: cheerio.CheerioAPI): { title: string; company: string; description: string } | null {
  const title =
    $('h1').first().text().trim() ||
    $('meta[property="og:title"]').attr('content')?.trim() ||
    $('title').text().trim();
  const company = $('meta[property="og:site_name"]').attr('content') || extractCompanyFromDocTitle($) || '';

  const candidates = ['main', 'article', '#content', '.job-description', '[class*="description"]', 'body'];
  let description = '';
  for (const selector of candidates) {
    const text = cleanText($(selector).first().text());
    if (text.length > description.length) description = text;
    if (description.length > 200) break;
  }

  if (!title || description.length < 100) return null;
  return { title, company, description };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = scrapeJobRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Please provide a valid job posting URL.' },
        { status: 400 }
      );
    }

    const { url } = parsed.data;

    let html: string;
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': USER_AGENT,
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        signal: AbortSignal.timeout(15000),
      });

      if (!response.ok) {
        return NextResponse.json(
          {
            success: false,
            error: `The job page responded with status ${response.status}. Please paste the job description manually instead.`,
          },
          { status: 200 }
        );
      }
      html = await response.text();
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: "Couldn't reach that URL. Please paste the job description manually instead.",
        },
        { status: 200 }
      );
    }

    const $ = cheerio.load(html);
    const host = new URL(url).hostname;

    let parsedJob: { title: string; company: string; description: string } | null = null;

    if (host.includes('greenhouse.io')) {
      parsedJob = parseGreenhouse($);
    } else if (host.includes('lever.co')) {
      parsedJob = parseLever($);
    } else if (host.includes('linkedin.com')) {
      parsedJob = parseLinkedIn($);
    }

    if (!parsedJob) {
      parsedJob = parseGreenhouse($) || parseLever($) || parseLinkedIn($) || parseGeneric($);
    }

    if (!parsedJob) {
      return NextResponse.json(
        {
          success: false,
          error: "Couldn't extract the job details from that page. Please paste the job description manually instead.",
        },
        { status: 200 }
      );
    }

    const { keySkills, requirements } = extractKeySkillsAndRequirements(parsedJob.description);

    const jobDetails: JobPostingDetails = {
      title: parsedJob.title || 'Untitled Position',
      company: parsedJob.company || 'Unknown Company',
      description: parsedJob.description,
      keySkills,
      requirements,
    };

    return NextResponse.json({ success: true, jobDetails });
  } catch (error) {
    console.error('scrape-job error:', error);
    return NextResponse.json(
      { success: false, error: 'Something went wrong while scraping. Please paste the job description manually instead.' },
      { status: 200 }
    );
  }
}
