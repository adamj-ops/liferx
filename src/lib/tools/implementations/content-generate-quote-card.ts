/**
 * Tool: content.generate_quote_card
 * Turn a defining quote into a publishable quote card concept.
 * 
 * Fetches quote + guest persona + theme context,
 * generates structured card content with explainability.
 */

import OpenAI from 'openai';
import type { ToolDefinition, ToolContext, ToolResponse } from '../types';
import { createServiceClient } from '../../supabase/server';

interface GenerateQuoteCardArgs {
  quote_id: string;
}

interface QuoteCardContent {
  headline: string;
  subtext: string;
  attribution: string;
  suggested_caption: string;
  pillar: 'health' | 'wealth' | 'connection';
  tone: 'inspiring' | 'tactical' | 'reflective';
}

interface QuoteCardExplainability {
  why_this_works: string;
  quote_length: number;
  guest_name: string;
  theme_name?: string;
}

const VALID_PILLARS = ['health', 'wealth', 'connection'] as const;
const VALID_TONES = ['inspiring', 'tactical', 'reflective'] as const;

export const contentGenerateQuoteCard: ToolDefinition<GenerateQuoteCardArgs> = {
  name: 'content.generate_quote_card',
  description: 'Turn a defining quote into a publishable quote card concept',
  version: '1.0.0',

  async execute(args: GenerateQuoteCardArgs, context: ToolContext): Promise<ToolResponse> {
    const supabase = createServiceClient();

    // Validate input
    if (!args.quote_id) {
      return {
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'quote_id is required',
        },
      };
    }

    // 1. Fetch the quote with interview and guest info
    const { data: quote, error: quoteError } = await supabase
      .from('interview_quotes')
      .select(`
        id,
        quote,
        topic,
        pillar,
        tone,
        context,
        interview_id,
        guest_id,
        org_id
      `)
      .eq('id', args.quote_id)
      .single();

    if (quoteError || !quote) {
      return {
        success: false,
        error: {
          code: 'QUOTE_NOT_FOUND',
          message: `Quote with id ${args.quote_id} not found`,
        },
      };
    }

    // 2. Fetch guest info
    let guestName = 'Unknown Guest';
    let guestTitle = '';
    let guestCompany = '';
    
    if (quote.guest_id) {
      const { data: guest } = await supabase
        .from('guests')
        .select('id, full_name, name, title, company')
        .eq('id', quote.guest_id)
        .single();
      
      if (guest) {
        guestName = guest.full_name || guest.name || 'Unknown Guest';
        guestTitle = guest.title || '';
        guestCompany = guest.company || '';
      }
    }

    // 3. Fetch any theme associated with this quote or interview
    let themeName: string | undefined;
    
    // First try quote-level theme link
    const { data: quoteThemeLink } = await supabase
      .from('interview_themes')
      .select('theme_id, themes(name)')
      .eq('quote_id', args.quote_id)
      .limit(1)
      .single();
    
    if (quoteThemeLink?.themes) {
      themeName = (quoteThemeLink.themes as { name: string }).name;
    } else if (quote.interview_id) {
      // Fallback to interview-level theme
      const { data: interviewThemeLink } = await supabase
        .from('interview_themes')
        .select('theme_id, themes(name)')
        .eq('interview_id', quote.interview_id)
        .is('quote_id', null)
        .limit(1)
        .single();
      
      if (interviewThemeLink?.themes) {
        themeName = (interviewThemeLink.themes as { name: string }).name;
      }
    }

    // 4. Fetch guest persona if available
    let personaSummary = '';
    if (quote.guest_id) {
      const { data: persona } = await supabase
        .from('guest_personas')
        .select('summary')
        .eq('guest_id', quote.guest_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (persona?.summary) {
        personaSummary = persona.summary;
      }
    }

    // 5. Generate quote card content using AI
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const systemPrompt = `You are a content strategist for LifeRX, creating quote cards for social media.
Your cards must be authentic to the speaker's voice and tied to Health, Wealth, or Connection.

Generate a quote card concept with:
- headline: A punchy version or key phrase from the quote (max 15 words)
- subtext: Supporting context or expansion (1-2 sentences)
- attribution: How to credit the speaker (e.g., "— Jane Doe, CEO at HealthTech")
- suggested_caption: Social media caption (1-2 sentences, conversational)
- pillar: health, wealth, or connection (lowercase)
- tone: inspiring, tactical, or reflective (lowercase)

Also explain:
- why_this_works: Why this quote works as a standalone card (1 sentence)

Return valid JSON only.`;

    const userPrompt = `Create a quote card from this quote:

Quote: "${quote.quote}"
Topic: ${quote.topic || 'Not specified'}
Guest: ${guestName}${guestTitle ? `, ${guestTitle}` : ''}${guestCompany ? ` at ${guestCompany}` : ''}
${themeName ? `Theme: ${themeName}` : ''}
${personaSummary ? `Guest persona: ${personaSummary}` : ''}
${quote.context ? `Context: ${quote.context}` : ''}

Generate the quote card JSON.`;

    let cardContent: QuoteCardContent;
    let explainability: QuoteCardExplainability;

    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.5,
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
      const rawPillar = (parsed.pillar || quote.pillar || 'health').toLowerCase();
      const pillar = VALID_PILLARS.includes(rawPillar as typeof VALID_PILLARS[number])
        ? rawPillar as 'health' | 'wealth' | 'connection'
        : 'health';

      // Validate and normalize tone
      const rawTone = (parsed.tone || quote.tone || 'inspiring').toLowerCase();
      const tone = VALID_TONES.includes(rawTone as typeof VALID_TONES[number])
        ? rawTone as 'inspiring' | 'tactical' | 'reflective'
        : 'inspiring';

      cardContent = {
        headline: parsed.headline || quote.quote.slice(0, 60),
        subtext: parsed.subtext || '',
        attribution: parsed.attribution || `— ${guestName}`,
        suggested_caption: parsed.suggested_caption || '',
        pillar,
        tone,
      };

      explainability = {
        why_this_works: parsed.why_this_works || 'This quote captures a distinct perspective.',
        quote_length: quote.quote.length,
        guest_name: guestName,
        theme_name: themeName,
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

    // 6. Persist if writes are allowed
    if (!context.allowWrites) {
      return {
        success: true,
        data: {
          preview: true,
          card: cardContent,
        },
        explainability: {
          action: 'preview',
          reason: 'Quote card generated but not persisted (allowWrites=false)',
          ...explainability,
        },
      };
    }

    // Insert into content_assets
    const assetBody = {
      ...cardContent,
      original_quote: quote.quote,
      explainability,
    };

    const { data: insertedAsset, error: insertError } = await supabase
      .from('content_assets')
      .insert({
        org_id: context.org_id,
        type: 'quote_card',
        title: cardContent.headline,
        body: assetBody,
        pillar: cardContent.pillar,
        tone: cardContent.tone,
        guest_id: quote.guest_id,
        interview_id: quote.interview_id,
        source_quote_ids: [args.quote_id],
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

