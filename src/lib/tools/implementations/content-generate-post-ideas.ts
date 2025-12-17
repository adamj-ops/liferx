/**
 * Tool: content.generate_post_ideas
 * Generate reusable post topics tied to a guest or theme.
 * 
 * Produces 3-5 post ideas, each with title, angle, pillar,
 * and emotional insight. Each idea persisted as separate asset.
 */

import OpenAI from 'openai';
import type { ToolDefinition, ToolContext, ToolResponse } from '../types';
import { createServiceClient } from '../../supabase/server';

interface GeneratePostIdeasArgs {
  guest_id?: string;
  theme_id?: string;
  max_ideas?: number;
}

interface PostIdea {
  title: string;
  one_sentence_angle: string;
  pillar: 'health' | 'wealth' | 'connection';
  emotional_insight: string;
}

interface PostIdeasExplainability {
  why_ideas_relevant: string;
  source_type: 'guest' | 'theme';
  source_id: string;
  guest_name?: string;
  theme_name?: string;
  total_ideas_generated: number;
}

const VALID_PILLARS = ['health', 'wealth', 'connection'] as const;

export const contentGeneratePostIdeas: ToolDefinition<GeneratePostIdeasArgs> = {
  name: 'content.generate_post_ideas',
  description: 'Generate reusable post topics tied to a guest or theme',
  version: '1.0.0',

  async execute(args: GeneratePostIdeasArgs, context: ToolContext): Promise<ToolResponse> {
    const supabase = createServiceClient();

    // Validate at least one input is provided
    if (!args.guest_id && !args.theme_id) {
      return {
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'At least one of guest_id or theme_id is required',
        },
      };
    }

    const maxIdeas = Math.min(Math.max(args.max_ideas || 5, 3), 10);

    // Collect context for idea generation
    let sourceType: 'guest' | 'theme';
    let sourceId: string;
    let guestName = '';
    let guestTitle = '';
    let guestCompany = '';
    let guestPillar = '';
    let themeName = '';
    let themeDescription = '';
    let themePillar = '';
    let personaSummary = '';
    let personaBeliefs: string[] = [];
    let personaExpertise: string[] = [];
    let personaUniquePovs: string[] = [];
    let quotes: string[] = [];
    let guestId: string | null = null;
    let themeId: string | null = null;

    // Priority: guest_id > theme_id
    if (args.guest_id) {
      sourceType = 'guest';
      sourceId = args.guest_id;
      guestId = args.guest_id;

      // Fetch guest
      const { data: guest, error } = await supabase
        .from('guests')
        .select('id, full_name, name, title, company, pillar, unique_pov')
        .eq('id', args.guest_id)
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
      guestPillar = guest.pillar || '';

      // Fetch persona
      const { data: persona } = await supabase
        .from('guest_personas')
        .select('summary, beliefs, expertise, unique_povs')
        .eq('guest_id', args.guest_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (persona) {
        personaSummary = persona.summary || '';
        personaBeliefs = persona.beliefs || [];
        personaExpertise = persona.expertise || [];
        personaUniquePovs = persona.unique_povs || [];
      }

      // Fetch some quotes from this guest
      const { data: guestQuotes } = await supabase
        .from('interview_quotes')
        .select('quote, topic')
        .eq('guest_id', args.guest_id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (guestQuotes) {
        quotes = guestQuotes.map(q => q.quote);
      }

    } else {
      // theme_id
      sourceType = 'theme';
      sourceId = args.theme_id!;
      themeId = args.theme_id!;

      // Fetch theme
      const { data: theme, error } = await supabase
        .from('themes')
        .select('id, name, description, pillar')
        .eq('id', args.theme_id!)
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
      themePillar = theme.pillar || '';

      // Fetch supporting quotes
      const { data: themeLinks } = await supabase
        .from('interview_themes')
        .select('interview_quotes(quote, topic)')
        .eq('theme_id', args.theme_id!)
        .limit(5);

      if (themeLinks) {
        for (const link of themeLinks) {
          // interview_quotes can be an array or a single object depending on the join
          const quoteDataRaw = link.interview_quotes as unknown;
          const quoteArray = Array.isArray(quoteDataRaw) ? quoteDataRaw : (quoteDataRaw ? [quoteDataRaw] : []);
          
          for (const q of quoteArray) {
            const quote = q as { quote?: string; topic?: string };
            if (quote.quote) {
              quotes.push(quote.quote);
            }
          }
        }
      }
    }

    // Generate post ideas using AI
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const systemPrompt = `You are a content strategist for LifeRX generating post ideas.
Each idea should be specific, not generic, and tied to Health, Wealth, or Connection.

Generate ${maxIdeas} post ideas. Each idea has:
- title: A compelling post title (max 15 words)
- one_sentence_angle: The unique angle or hook (1 sentence)
- pillar: health, wealth, or connection (lowercase)
- emotional_insight: What emotion or transformation this taps into (1 sentence)

Also explain:
- why_ideas_relevant: Why these ideas work for this source (1 sentence)

Ideas should NOT be generic. They should reflect the specific perspective, expertise,
or theme provided. Avoid clichés like "5 tips for success".

Return valid JSON with:
{
  "ideas": [...],
  "why_ideas_relevant": "..."
}`;

    const contextParts: string[] = [];
    if (guestName) {
      contextParts.push(`Guest: ${guestName}${guestTitle ? `, ${guestTitle}` : ''}${guestCompany ? ` at ${guestCompany}` : ''}`);
    }
    if (themeName) {
      contextParts.push(`Theme: ${themeName}`);
    }
    if (themeDescription) {
      contextParts.push(`Theme description: ${themeDescription}`);
    }
    if (personaSummary) {
      contextParts.push(`Persona: ${personaSummary}`);
    }
    if (personaBeliefs.length > 0) {
      contextParts.push(`Core beliefs: ${personaBeliefs.join(', ')}`);
    }
    if (personaExpertise.length > 0) {
      contextParts.push(`Expertise: ${personaExpertise.join(', ')}`);
    }
    if (personaUniquePovs.length > 0) {
      contextParts.push(`Unique perspectives: ${personaUniquePovs.join(', ')}`);
    }
    if (quotes.length > 0) {
      contextParts.push(`Sample quotes:\n${quotes.slice(0, 3).map((q, i) => `${i + 1}. "${q}"`).join('\n')}`);
    }

    const userPrompt = `Generate ${maxIdeas} post ideas based on this context:

${contextParts.join('\n')}

Generate the post ideas JSON.`;

    let postIdeas: PostIdea[] = [];
    let explainability: PostIdeasExplainability;

    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.7,
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

      // Validate and normalize ideas
      const rawIdeas = Array.isArray(parsed.ideas) ? parsed.ideas : [];
      const defaultPillar = (guestPillar || themePillar || 'health').toLowerCase();

      postIdeas = rawIdeas.slice(0, maxIdeas).map((idea: Partial<PostIdea>) => {
        const rawPillar = (idea.pillar || defaultPillar).toLowerCase();
        const pillar = VALID_PILLARS.includes(rawPillar as typeof VALID_PILLARS[number])
          ? rawPillar as 'health' | 'wealth' | 'connection'
          : 'health';

        return {
          title: idea.title || 'Untitled',
          one_sentence_angle: idea.one_sentence_angle || '',
          pillar,
          emotional_insight: idea.emotional_insight || '',
        };
      });

      explainability = {
        why_ideas_relevant: parsed.why_ideas_relevant || 'These ideas are tailored to the source content.',
        source_type: sourceType,
        source_id: sourceId,
        guest_name: guestName || undefined,
        theme_name: themeName || undefined,
        total_ideas_generated: postIdeas.length,
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
          ideas: postIdeas,
        },
        explainability: {
          action: 'preview',
          reason: 'Post ideas generated but not persisted (allowWrites=false)',
          ...explainability,
        },
      };
    }

    // Insert each idea as a separate content_asset
    const createdAssetIds: string[] = [];
    const failedInserts: Array<{ title: string; error: string }> = [];

    for (const idea of postIdeas) {
      const assetBody = {
        ...idea,
        source_type: sourceType,
        source_id: sourceId,
        explainability: {
          why_ideas_relevant: explainability.why_ideas_relevant,
        },
      };

      const { data: insertedAsset, error: insertError } = await supabase
        .from('content_assets')
        .insert({
          org_id: context.org_id,
          type: 'post_idea',
          title: idea.title,
          body: assetBody,
          pillar: idea.pillar,
          tone: null, // Post ideas don't have a specific tone
          theme_id: themeId,
          guest_id: guestId,
          interview_id: null,
          source_quote_ids: null,
        })
        .select('id')
        .single();

      if (insertError) {
        failedInserts.push({ title: idea.title, error: insertError.message });
      } else if (insertedAsset) {
        createdAssetIds.push(insertedAsset.id);
      }
    }

    return {
      success: true,
      data: {
        asset_ids: createdAssetIds,
        ideas_created: createdAssetIds.length,
        ideas_failed: failedInserts.length,
      },
      explainability: {
        action: 'created',
        ...explainability,
        failed_inserts: failedInserts.length > 0 ? failedInserts : undefined,
      },
      writes: createdAssetIds.map(id => ({
        table: 'content_assets' as const,
        operation: 'insert' as const,
        id,
      })),
    };
  },
};

