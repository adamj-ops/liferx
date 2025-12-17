/**
 * Tool: content.generate_shortform_script
 * Generate a short-form video or audio script (30–60s).
 * 
 * Fetches context based on quote, theme, or guest,
 * generates spoken-optimized script with hook, message, and CTA.
 */

import OpenAI from 'openai';
import type { ToolDefinition, ToolContext, ToolResponse } from '../types';
import { createServiceClient } from '../../supabase/server';

interface GenerateShortformScriptArgs {
  quote_id?: string;
  theme_id?: string;
  guest_id?: string;
}

interface ShortformScriptContent {
  title: string;
  opening_hook: string;
  core_message: string;
  closing_cta: string;
  delivery_notes: string;
  estimated_duration_seconds: number;
  pillar: 'health' | 'wealth' | 'connection';
  tone: 'inspiring' | 'tactical' | 'reflective';
}

interface ShortformScriptExplainability {
  why_format_fits: string;
  source_type: 'quote' | 'theme' | 'guest';
  source_id: string;
  guest_name?: string;
  theme_name?: string;
}

const VALID_PILLARS = ['health', 'wealth', 'connection'] as const;
const VALID_TONES = ['inspiring', 'tactical', 'reflective'] as const;

export const contentGenerateShortformScript: ToolDefinition<GenerateShortformScriptArgs> = {
  name: 'content.generate_shortform_script',
  description: 'Generate a short-form video or audio script (30–60s)',
  version: '1.0.0',

  async execute(args: GenerateShortformScriptArgs, context: ToolContext): Promise<ToolResponse> {
    const supabase = createServiceClient();

    // Validate at least one input is provided
    if (!args.quote_id && !args.theme_id && !args.guest_id) {
      return {
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'At least one of quote_id, theme_id, or guest_id is required',
        },
      };
    }

    // Collect context for script generation
    let sourceType: 'quote' | 'theme' | 'guest';
    let sourceId: string;
    let quoteText = '';
    let quoteTopic = '';
    let quotePillar = '';
    let quoteTone = '';
    let guestName = '';
    let guestTitle = '';
    let guestCompany = '';
    let themeName = '';
    let themeDescription = '';
    let personaSummary = '';
    let interviewId: string | null = null;
    let guestId: string | null = null;
    let themeId: string | null = null;
    const sourceQuoteIds: string[] = [];

    // Priority: quote_id > theme_id > guest_id
    if (args.quote_id) {
      sourceType = 'quote';
      sourceId = args.quote_id;
      sourceQuoteIds.push(args.quote_id);

      // Fetch quote
      const { data: quote, error } = await supabase
        .from('interview_quotes')
        .select('id, quote, topic, pillar, tone, interview_id, guest_id')
        .eq('id', args.quote_id)
        .single();

      if (error || !quote) {
        return {
          success: false,
          error: {
            code: 'QUOTE_NOT_FOUND',
            message: `Quote with id ${args.quote_id} not found`,
          },
        };
      }

      quoteText = quote.quote;
      quoteTopic = quote.topic || '';
      quotePillar = quote.pillar || '';
      quoteTone = quote.tone || '';
      interviewId = quote.interview_id;
      guestId = quote.guest_id;

      // Fetch guest info
      if (quote.guest_id) {
        const { data: guest } = await supabase
          .from('guests')
          .select('id, full_name, name, title, company')
          .eq('id', quote.guest_id)
          .single();

        if (guest) {
          guestName = guest.full_name || guest.name || '';
          guestTitle = guest.title || '';
          guestCompany = guest.company || '';
        }
      }

    } else if (args.theme_id) {
      sourceType = 'theme';
      sourceId = args.theme_id;
      themeId = args.theme_id;

      // Fetch theme
      const { data: theme, error } = await supabase
        .from('themes')
        .select('id, name, description, pillar, tone')
        .eq('id', args.theme_id)
        .single();

      if (error || !theme) {
        return {
          success: false,
          error: {
            code: 'THEME_NOT_FOUND',
            message: `Theme with id ${args.theme_id} not found`,
          },
        };
      }

      themeName = theme.name;
      themeDescription = theme.description || '';
      quotePillar = theme.pillar || '';
      quoteTone = theme.tone || '';

      // Fetch a supporting quote for the theme
      const { data: themeLink } = await supabase
        .from('interview_themes')
        .select('quote_id, interview_quotes(id, quote, topic, guest_id)')
        .eq('theme_id', args.theme_id)
        .not('quote_id', 'is', null)
        .limit(1)
        .single();

      if (themeLink?.interview_quotes) {
        const q = themeLink.interview_quotes as { id: string; quote: string; topic: string; guest_id: string | null };
        quoteText = q.quote;
        quoteTopic = q.topic;
        sourceQuoteIds.push(q.id);
        guestId = q.guest_id;

        if (q.guest_id) {
          const { data: guest } = await supabase
            .from('guests')
            .select('id, full_name, name, title, company')
            .eq('id', q.guest_id)
            .single();

          if (guest) {
            guestName = guest.full_name || guest.name || '';
            guestTitle = guest.title || '';
            guestCompany = guest.company || '';
          }
        }
      }

    } else {
      // guest_id
      sourceType = 'guest';
      sourceId = args.guest_id!;
      guestId = args.guest_id!;

      // Fetch guest
      const { data: guest, error } = await supabase
        .from('guests')
        .select('id, full_name, name, title, company, pillar')
        .eq('id', args.guest_id!)
        .single();

      if (error || !guest) {
        return {
          success: false,
          error: {
            code: 'GUEST_NOT_FOUND',
            message: `Guest with id ${args.guest_id} not found`,
          },
        };
      }

      guestName = guest.full_name || guest.name || '';
      guestTitle = guest.title || '';
      guestCompany = guest.company || '';
      quotePillar = guest.pillar || '';

      // Fetch a quote from this guest
      const { data: guestQuote } = await supabase
        .from('interview_quotes')
        .select('id, quote, topic, pillar, tone, interview_id')
        .eq('guest_id', args.guest_id!)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (guestQuote) {
        quoteText = guestQuote.quote;
        quoteTopic = guestQuote.topic || '';
        quotePillar = guestQuote.pillar || quotePillar;
        quoteTone = guestQuote.tone || '';
        interviewId = guestQuote.interview_id;
        sourceQuoteIds.push(guestQuote.id);
      }
    }

    // Fetch persona if we have a guest
    if (guestId) {
      const { data: persona } = await supabase
        .from('guest_personas')
        .select('summary')
        .eq('guest_id', guestId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (persona?.summary) {
        personaSummary = persona.summary;
      }
    }

    // Generate script using AI
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const systemPrompt = `You are a content creator for LifeRX crafting short-form video/audio scripts.
Scripts should be 30-60 seconds when spoken (~75-150 words).

Generate a script with:
- title: A compelling title for the content
- opening_hook: First 5-10 seconds to grab attention (1-2 sentences)
- core_message: Main content (3-5 sentences, conversational and spoken-optimized)
- closing_cta: Call to action (1 sentence)
- delivery_notes: Tips for how to deliver this (pacing, emphasis, etc.)
- estimated_duration_seconds: Expected duration (30-60)
- pillar: health, wealth, or connection (lowercase)
- tone: inspiring, tactical, or reflective (lowercase)

Also explain:
- why_format_fits: Why this content works as a shortform script (1 sentence)

Write for SPEAKING, not reading. Short sentences. Natural pauses.
Return valid JSON only.`;

    const userPrompt = `Create a shortform script from this content:

${quoteText ? `Quote: "${quoteText}"` : ''}
${quoteTopic ? `Topic: ${quoteTopic}` : ''}
${guestName ? `Speaker: ${guestName}${guestTitle ? `, ${guestTitle}` : ''}${guestCompany ? ` at ${guestCompany}` : ''}` : ''}
${themeName ? `Theme: ${themeName}` : ''}
${themeDescription ? `Theme description: ${themeDescription}` : ''}
${personaSummary ? `Speaker persona: ${personaSummary}` : ''}

Generate the shortform script JSON.`;

    let scriptContent: ShortformScriptContent;
    let explainability: ShortformScriptExplainability;

    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.6,
      });

      const responseContent = completion.choices[0]?.message?.content;
      if (!responseContent) {
        return {
          success: false,
          error: {
            code: 'AI_ERROR',
            message: 'No response from AI analysis',
          },
        };
      }

      const parsed = JSON.parse(responseContent);

      // Validate and normalize pillar
      const rawPillar = (parsed.pillar || quotePillar || 'health').toLowerCase();
      const pillar = VALID_PILLARS.includes(rawPillar as typeof VALID_PILLARS[number])
        ? rawPillar as 'health' | 'wealth' | 'connection'
        : 'health';

      // Validate and normalize tone
      const rawTone = (parsed.tone || quoteTone || 'inspiring').toLowerCase();
      const tone = VALID_TONES.includes(rawTone as typeof VALID_TONES[number])
        ? rawTone as 'inspiring' | 'tactical' | 'reflective'
        : 'inspiring';

      scriptContent = {
        title: parsed.title || 'Untitled Script',
        opening_hook: parsed.opening_hook || '',
        core_message: parsed.core_message || '',
        closing_cta: parsed.closing_cta || '',
        delivery_notes: parsed.delivery_notes || '',
        estimated_duration_seconds: parsed.estimated_duration_seconds || 45,
        pillar,
        tone,
      };

      explainability = {
        why_format_fits: parsed.why_format_fits || 'This content is well-suited for spoken delivery.',
        source_type: sourceType,
        source_id: sourceId,
        guest_name: guestName || undefined,
        theme_name: themeName || undefined,
      };
    } catch (err) {
      return {
        success: false,
        error: {
          code: 'AI_PARSE_ERROR',
          message: err instanceof Error ? err.message : 'Failed to parse AI response',
        },
      };
    }

    // Persist if writes are allowed
    if (!context.allowWrites) {
      return {
        success: true,
        data: {
          preview: true,
          script: scriptContent,
        },
        explainability: {
          action: 'preview',
          reason: 'Shortform script generated but not persisted (allowWrites=false)',
          ...explainability,
        },
      };
    }

    // Insert into content_assets
    const assetBody = {
      ...scriptContent,
      explainability,
    };

    const { data: insertedAsset, error: insertError } = await supabase
      .from('content_assets')
      .insert({
        org_id: context.org_id,
        type: 'shortform_script',
        title: scriptContent.title,
        body: assetBody,
        pillar: scriptContent.pillar,
        tone: scriptContent.tone,
        theme_id: themeId,
        guest_id: guestId,
        interview_id: interviewId,
        source_quote_ids: sourceQuoteIds.length > 0 ? sourceQuoteIds : null,
      })
      .select('id')
      .single();

    if (insertError) {
      return {
        success: false,
        error: { code: 'DB_ERROR', message: insertError.message },
      };
    }

    return {
      success: true,
      data: {
        asset_id: insertedAsset.id,
      },
      explainability: {
        action: 'created',
        ...explainability,
      },
      writes: [
        {
          table: 'content_assets',
          operation: 'insert' as const,
          id: insertedAsset.id,
        },
      ],
    };
  },
};

