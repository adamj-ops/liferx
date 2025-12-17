/**
 * Theme Scanner Background Job
 * 
 * Scans recent interviews for recurring themes using AI.
 * Writes themes with evidence for explainability.
 */

import OpenAI from 'openai';
import { createServiceClient } from '../lib/supabase/server';
import { executeTool } from '../lib/tools/executeTool';
import { ToolContext } from '../lib/tools/types';

// ============================================================================
// Types
// ============================================================================

export interface ThemeScannerInput {
  org_id: string;
  lookback_days?: number;   // default: 30
  max_interviews?: number;  // default: 50
  dry_run?: boolean;        // default: false
}

interface ProposedTheme {
  name: string;
  description: string;
  pillar?: 'Health' | 'Wealth' | 'Connection';
  tone?: 'inspiring' | 'tactical' | 'reflective';
  confidence: number;
  supporting_interview_ids: string[];
  supporting_quote_ids: string[];
  occurrences: number;
  rationale: string;
}

interface ThemeResultItem {
  name: string;
  slug: string;
  confidence_score: number;
  occurrences: number;
  action: 'created' | 'updated' | 'would_create' | 'would_update';
}

export interface ThemeScannerResult {
  dry_run: boolean;
  themes_created: number;
  themes_updated: number;
  links_created: number;
  skipped: Array<{ item: string; reason: string }>;
  themes: ThemeResultItem[];
}

// ============================================================================
// Constants
// ============================================================================

const MAX_THEMES_PER_RUN = 20;
const MAX_LINKS_PER_THEME = 20;
const RULES_VERSION = '1.0.0';

const DEFAULT_LOOKBACK_DAYS = 30;
const DEFAULT_MAX_INTERVIEWS = 50;

// ============================================================================
// Helpers
// ============================================================================

function nameToSlug(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

// ============================================================================
// Main Job
// ============================================================================

export async function runThemeScanner(input: ThemeScannerInput): Promise<ThemeScannerResult> {
  const supabase = createServiceClient();
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const lookbackDays = input.lookback_days ?? DEFAULT_LOOKBACK_DAYS;
  const maxInterviews = input.max_interviews ?? DEFAULT_MAX_INTERVIEWS;
  const dryRun = input.dry_run ?? false;

  const result: ThemeScannerResult = {
    dry_run: dryRun,
    themes_created: 0,
    themes_updated: 0,
    links_created: 0,
    skipped: [],
    themes: [],
  };

  // 1. Query recent interviews (org-scoped)
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - lookbackDays);

  const { data: interviews, error: interviewsError } = await supabase
    .from('interviews')
    .select('id, title, summary, raw_transcript')
    .gte('created_at', cutoffDate.toISOString())
    .limit(maxInterviews);

  if (interviewsError) {
    throw new Error(`Failed to fetch interviews: ${interviewsError.message}`);
  }

  if (!interviews || interviews.length === 0) {
    result.skipped.push({ item: 'all', reason: 'No interviews found in lookback period' });
    return result;
  }

  // 2. Query quotes from those interviews
  const interviewIds = interviews.map(i => i.id);
  const { data: quotes, error: quotesError } = await supabase
    .from('interview_quotes')
    .select('id, interview_id, quote, topic, pillar, tone')
    .in('interview_id', interviewIds);

  if (quotesError) {
    throw new Error(`Failed to fetch quotes: ${quotesError.message}`);
  }

  // 3. Build prompt content
  const contentForAnalysis = interviews.map(interview => {
    const interviewQuotes = (quotes || []).filter(q => q.interview_id === interview.id);
    return {
      interview_id: interview.id,
      title: interview.title || 'Untitled',
      summary: interview.summary || '',
      quotes: interviewQuotes.map(q => ({
        quote_id: q.id,
        text: q.quote,
        topic: q.topic,
        pillar: q.pillar,
        tone: q.tone,
      })),
    };
  });

  // 4. Call OpenAI to extract themes
  const systemPrompt = `You are an expert content analyst for LifeRX, a platform focused on Health, Wealth, and Connection.

Analyze the following interview content and identify recurring themes across the interviews.

For each theme you identify:
1. Give it a clear, concise name (e.g., "Redefining Success", "Burnout Recovery", "Community Building")
2. Write a brief description (1-2 sentences)
3. Identify which pillar it relates to (Health, Wealth, or Connection) if applicable
4. Identify the tone (inspiring, tactical, or reflective) if applicable
5. Rate your confidence from 0 to 1 (0.8+ for strong themes)
6. List the interview_ids that support this theme
7. List specific quote_ids that support this theme
8. Count how many times this theme appears across the content
9. Explain your rationale for identifying this theme

Return your analysis as a JSON array of themes. Only include themes with confidence >= 0.5.
Limit to the top ${MAX_THEMES_PER_RUN} most significant themes.`;

  const userPrompt = `Analyze these interviews and quotes for recurring themes:

${JSON.stringify(contentForAnalysis, null, 2)}

Return a JSON array with this exact structure:
[
  {
    "name": "Theme Name",
    "description": "Brief description",
    "pillar": "Health" | "Wealth" | "Connection" | null,
    "tone": "inspiring" | "tactical" | "reflective" | null,
    "confidence": 0.85,
    "supporting_interview_ids": ["uuid1", "uuid2"],
    "supporting_quote_ids": ["uuid3", "uuid4"],
    "occurrences": 5,
    "rationale": "Why this theme exists"
  }
]`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.3,
  });

  const responseContent = completion.choices[0]?.message?.content;
  if (!responseContent) {
    throw new Error('No response from OpenAI');
  }

  let proposedThemes: ProposedTheme[];
  try {
    const parsed = JSON.parse(responseContent);
    // Handle both { themes: [...] } and direct array formats
    proposedThemes = Array.isArray(parsed) ? parsed : (parsed.themes || []);
  } catch (e) {
    throw new Error(`Failed to parse OpenAI response: ${e}`);
  }

  // 5. Cap themes
  proposedThemes = proposedThemes.slice(0, MAX_THEMES_PER_RUN);

  // 6. Process themes
  const toolContext: ToolContext = {
    org_id: input.org_id,
    allowWrites: !dryRun,
    user_id: 'system:theme-scanner',
    metadata: { job: 'theme-scanner', rules_version: RULES_VERSION },
  };

  // Check existing themes to determine would_create vs would_update for dry run
  const existingThemeSlugs = new Set<string>();
  if (dryRun) {
    const slugs = proposedThemes.map(t => nameToSlug(t.name));
    const { data: existingThemes } = await supabase
      .from('themes')
      .select('slug')
      .eq('org_id', input.org_id)
      .in('slug', slugs);
    
    if (existingThemes) {
      existingThemes.forEach(t => existingThemeSlugs.add(t.slug));
    }
  }

  for (const theme of proposedThemes) {
    const slug = nameToSlug(theme.name);
    
    if (dryRun) {
      // Report what would happen
      const wouldAction = existingThemeSlugs.has(slug) ? 'would_update' : 'would_create';
      result.themes.push({
        name: theme.name,
        slug,
        confidence_score: theme.confidence,
        occurrences: theme.occurrences,
        action: wouldAction,
      });
      continue;
    }

    // 6a. Upsert theme
    const upsertResult = await executeTool('themes.upsert_theme', {
      name: theme.name,
      description: theme.description,
      pillar: theme.pillar,
      tone: theme.tone,
      confidence_score: theme.confidence,
      evidence: {
        quote_ids: theme.supporting_quote_ids,
        interview_ids: theme.supporting_interview_ids,
        occurrences: theme.occurrences,
        rationale: theme.rationale,
      },
    }, toolContext);

    if (!upsertResult.success) {
      result.skipped.push({
        item: theme.name,
        reason: upsertResult.error?.message || 'Unknown error',
      });
      continue;
    }

    const themeId = (upsertResult.data as { theme_id: string; action: string }).theme_id;
    const action = (upsertResult.data as { theme_id: string; action: 'created' | 'updated' }).action;

    if (action === 'created') {
      result.themes_created++;
    } else {
      result.themes_updated++;
    }

    result.themes.push({
      name: theme.name,
      slug,
      confidence_score: theme.confidence,
      occurrences: theme.occurrences,
      action,
    });

    // 6b. Link to interviews (capped)
    const interviewsToLink = theme.supporting_interview_ids.slice(0, MAX_LINKS_PER_THEME);
    for (const interviewId of interviewsToLink) {
      const linkResult = await executeTool('themes.link_to_interview', {
        theme_id: themeId,
        interview_id: interviewId,
      }, toolContext);

      if (linkResult.success) {
        const linkData = linkResult.data as { link_id: string | null; already_existed: boolean };
        if (!linkData.already_existed) {
          result.links_created++;
        }
      }
    }

    // 6c. Link to quotes (capped, remaining from interview cap)
    const quotesLinked = 0;
    const remainingLinkCap = MAX_LINKS_PER_THEME - interviewsToLink.length;
    const quotesToLink = theme.supporting_quote_ids.slice(0, remainingLinkCap);
    
    for (const quoteId of quotesToLink) {
      // Find the interview for this quote
      const quote = quotes?.find(q => q.id === quoteId);
      if (!quote) continue;

      const linkResult = await executeTool('themes.link_to_interview', {
        theme_id: themeId,
        interview_id: quote.interview_id,
        quote_id: quoteId,
      }, toolContext);

      if (linkResult.success) {
        const linkData = linkResult.data as { link_id: string | null; already_existed: boolean };
        if (!linkData.already_existed) {
          result.links_created++;
        }
      }
    }
  }

  return result;
}

