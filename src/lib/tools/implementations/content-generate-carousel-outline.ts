/**
 * Tool: content.generate_carousel_outline
 * Create an Instagram/LinkedIn carousel outline from a theme.
 * 
 * Fetches theme + supporting quotes + guest insights,
 * generates slide-by-slide outline with hook and CTA.
 */

import OpenAI from 'openai';
import type { ToolDefinition, ToolContext, ToolResponse } from '../types';
import { createServiceClient } from '../../supabase/server';

interface GenerateCarouselOutlineArgs {
  theme_id: string;
}

interface CarouselSlide {
  slide_number: number;
  type: 'hook' | 'content' | 'cta';
  headline: string;
  body: string;
  visual_note?: string;
}

interface CarouselContent {
  title: string;
  slides: CarouselSlide[];
  pillar: 'health' | 'wealth' | 'connection';
  tone: 'inspiring' | 'tactical' | 'reflective';
  total_slides: number;
}

interface CarouselExplainability {
  why_carousel_fits: string;
  theme_name: string;
  supporting_quotes_count: number;
  guests_featured: string[];
}

const VALID_PILLARS = ['health', 'wealth', 'connection'] as const;
const VALID_TONES = ['inspiring', 'tactical', 'reflective'] as const;

export const contentGenerateCarouselOutline: ToolDefinition<GenerateCarouselOutlineArgs> = {
  name: 'content.generate_carousel_outline',
  description: 'Create an Instagram/LinkedIn carousel outline from a theme',
  version: '1.0.0',

  async execute(args: GenerateCarouselOutlineArgs, context: ToolContext): Promise<ToolResponse> {
    const supabase = createServiceClient();

    // Validate input
    if (!args.theme_id) {
      return {
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'theme_id is required',
        },
      };
    }

    // 1. Fetch the theme
    const { data: theme, error: themeError } = await supabase
      .from('themes')
      .select('id, name, description, pillar, tone, evidence, org_id')
      .eq('id', args.theme_id)
      .single();

    if (themeError || !theme) {
      return {
        success: false,
        error: {
          code: 'THEME_NOT_FOUND',
          message: `Theme with id ${args.theme_id} not found`,
        },
      };
    }

    // 2. Fetch supporting quotes via interview_themes
    const { data: themeLinks } = await supabase
      .from('interview_themes')
      .select(`
        interview_id,
        quote_id,
        interview_quotes(id, quote, topic, guest_id)
      `)
      .eq('theme_id', args.theme_id)
      .limit(10);

    const quotes: Array<{ quote: string; topic: string; guest_id: string | null }> = [];
    const guestIds = new Set<string>();

    if (themeLinks) {
      for (const link of themeLinks) {
        const quoteData = link.interview_quotes as { id: string; quote: string; topic: string; guest_id: string | null } | null;
        if (quoteData) {
          quotes.push({
            quote: quoteData.quote,
            topic: quoteData.topic,
            guest_id: quoteData.guest_id,
          });
          if (quoteData.guest_id) {
            guestIds.add(quoteData.guest_id);
          }
        }
      }
    }

    // 3. Fetch guest names
    const guestNames: string[] = [];
    if (guestIds.size > 0) {
      const { data: guests } = await supabase
        .from('guests')
        .select('id, full_name, name')
        .in('id', Array.from(guestIds));
      
      if (guests) {
        for (const guest of guests) {
          guestNames.push(guest.full_name || guest.name || 'Unknown Guest');
        }
      }
    }

    // 4. Generate carousel outline using AI
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const systemPrompt = `You are a content strategist for LifeRX creating carousel posts for Instagram and LinkedIn.
Carousels should be 5-8 slides with a clear narrative arc.

Generate a carousel outline with:
- title: The carousel's main title
- slides: Array of 5-8 slides, each with:
  - slide_number: 1, 2, 3, etc.
  - type: "hook" (first slide), "content" (middle slides), or "cta" (last slide)
  - headline: Main text on the slide (max 10 words)
  - body: Supporting text (1-2 sentences)
  - visual_note: Optional suggestion for visual element
- pillar: health, wealth, or connection (lowercase)
- tone: inspiring, tactical, or reflective (lowercase)

Also explain:
- why_carousel_fits: Why this theme works as a carousel (1 sentence)

The hook slide should stop scrollers. The CTA slide should drive engagement.
Return valid JSON only.`;

    const quotesContext = quotes.length > 0
      ? `\n\nSupporting quotes:\n${quotes.slice(0, 5).map((q, i) => `${i + 1}. "${q.quote}" (${q.topic || 'no topic'})`).join('\n')}`
      : '';

    const userPrompt = `Create a carousel outline for this theme:

Theme: ${theme.name}
Description: ${theme.description || 'Not specified'}
${theme.pillar ? `Pillar: ${theme.pillar}` : ''}
${theme.tone ? `Tone: ${theme.tone}` : ''}
${guestNames.length > 0 ? `Featured guests: ${guestNames.join(', ')}` : ''}
${quotesContext}

Generate the carousel JSON.`;

    let carouselContent: CarouselContent;
    let explainability: CarouselExplainability;

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
      const rawPillar = (parsed.pillar || theme.pillar || 'health').toLowerCase();
      const pillar = VALID_PILLARS.includes(rawPillar as typeof VALID_PILLARS[number])
        ? rawPillar as 'health' | 'wealth' | 'connection'
        : 'health';

      // Validate and normalize tone
      const rawTone = (parsed.tone || theme.tone || 'inspiring').toLowerCase();
      const tone = VALID_TONES.includes(rawTone as typeof VALID_TONES[number])
        ? rawTone as 'inspiring' | 'tactical' | 'reflective'
        : 'inspiring';

      // Ensure slides array is valid
      const slides: CarouselSlide[] = Array.isArray(parsed.slides)
        ? parsed.slides.map((slide: Partial<CarouselSlide>, idx: number) => ({
            slide_number: slide.slide_number || idx + 1,
            type: slide.type || (idx === 0 ? 'hook' : idx === parsed.slides.length - 1 ? 'cta' : 'content'),
            headline: slide.headline || '',
            body: slide.body || '',
            visual_note: slide.visual_note,
          }))
        : [];

      carouselContent = {
        title: parsed.title || theme.name,
        slides,
        pillar,
        tone,
        total_slides: slides.length,
      };

      explainability = {
        why_carousel_fits: parsed.why_carousel_fits || 'This theme has enough depth to support a multi-slide narrative.',
        theme_name: theme.name,
        supporting_quotes_count: quotes.length,
        guests_featured: guestNames,
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

    // 5. Persist if writes are allowed
    if (!context.allowWrites) {
      return {
        success: true,
        data: {
          preview: true,
          carousel: carouselContent,
        },
        explainability: {
          action: 'preview',
          reason: 'Carousel outline generated but not persisted (allowWrites=false)',
          ...explainability,
        },
      };
    }

    // Insert into content_assets
    const assetBody = {
      ...carouselContent,
      explainability,
    };

    // Collect source quote IDs
    const sourceQuoteIds = quotes
      .filter(q => q.guest_id)
      .slice(0, 10)
      .map(() => args.theme_id); // Using theme_id as reference since we don't have quote IDs directly

    const { data: insertedAsset, error: insertError } = await supabase
      .from('content_assets')
      .insert({
        org_id: context.org_id,
        type: 'carousel',
        title: carouselContent.title,
        body: assetBody,
        pillar: carouselContent.pillar,
        tone: carouselContent.tone,
        theme_id: args.theme_id,
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

