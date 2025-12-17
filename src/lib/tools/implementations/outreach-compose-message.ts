/**
 * Tool: outreach.compose_message
 * Generates a personalized outreach message using guest intelligence.
 */

import OpenAI from 'openai';
import { ToolDefinition, ToolContext, ToolResponse } from '../types';
import { createServiceClient } from '../../supabase/server';
import { executeTool } from '../executeTool';

interface ComposeMessageArgs {
  guest_id: string;
  campaign_type: 'post_release' | 'contributor_invite' | 'followup';
  channel: 'email' | 'linkedin' | 'instagram' | 'x';
  campaign_id?: string; // If provided, use existing campaign
  asset_ids?: string[];
  theme_ids?: string[];
  quote_ids?: string[];
}

interface GuestContext {
  name: string;
  company?: string;
  role?: string;
  email?: string;
  pillar?: string;
  unique_pov?: string;
  has_podcast?: boolean;
  social_presence_strength?: number;
}

interface PersonaContext {
  summary?: string;
  beliefs?: string[];
  expertise?: string[];
  unique_povs?: string[];
}

interface QuoteContext {
  quote: string;
  topic?: string;
  pillar?: string;
}

const CAMPAIGN_TYPE_LABELS = {
  post_release: 'Post-Release Follow-up',
  contributor_invite: 'Contributor Invite',
  followup: 'General Follow-up',
};

export const outreachComposeMessage: ToolDefinition<ComposeMessageArgs> = {
  name: 'outreach.compose_message',
  description: 'Compose a personalized outreach message for a guest',
  version: '1.0.0',

  async execute(args: ComposeMessageArgs, context: ToolContext): Promise<ToolResponse> {
    const supabase = createServiceClient();

    // 1. Check write permission
    if (!context.allowWrites) {
      return {
        success: false,
        error: {
          code: 'WRITE_NOT_ALLOWED',
          message: 'Write operations are not permitted in this context',
        },
      };
    }

    // 2. Validate inputs
    if (!args.guest_id) {
      return {
        success: false,
        error: { code: 'INVALID_INPUT', message: 'guest_id is required' },
      };
    }

    const validTypes = ['post_release', 'contributor_invite', 'followup'];
    if (!args.campaign_type || !validTypes.includes(args.campaign_type)) {
      return {
        success: false,
        error: { code: 'INVALID_INPUT', message: 'campaign_type must be post_release, contributor_invite, or followup' },
      };
    }

    const validChannels = ['email', 'linkedin', 'instagram', 'x'];
    if (!args.channel || !validChannels.includes(args.channel)) {
      return {
        success: false,
        error: { code: 'INVALID_INPUT', message: 'channel must be email, linkedin, instagram, or x' },
      };
    }

    // 3. Fetch guest data
    const { data: guest, error: guestError } = await supabase
      .from('guests')
      .select('id, name, full_name, company, primary_role, email, pillar, unique_pov, has_podcast, metadata')
      .eq('id', args.guest_id)
      .single();

    if (guestError || !guest) {
      return {
        success: false,
        error: { code: 'GUEST_NOT_FOUND', message: `Guest ${args.guest_id} not found` },
      };
    }

    const guestContext: GuestContext = {
      name: guest.full_name || guest.name,
      company: guest.company,
      role: guest.primary_role,
      email: guest.email,
      pillar: guest.pillar,
      unique_pov: guest.unique_pov,
      has_podcast: guest.has_podcast,
      social_presence_strength: (guest.metadata as Record<string, unknown>)?.enrichment 
        ? ((guest.metadata as Record<string, { social_presence_strength?: number }>).enrichment?.social_presence_strength) 
        : undefined,
    };

    // 4. Fetch guest score
    const { data: guestScore } = await supabase
      .from('guest_scores')
      .select('score_raw, final_score')
      .eq('guest_id', args.guest_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    // 5. Fetch guest persona
    let personaContext: PersonaContext = {};
    const { data: persona } = await supabase
      .from('guest_personas')
      .select('summary, beliefs, expertise, unique_povs')
      .eq('guest_id', args.guest_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (persona) {
      personaContext = {
        summary: persona.summary,
        beliefs: persona.beliefs,
        expertise: persona.expertise,
        unique_povs: persona.unique_povs,
      };
    }

    // 6. Fetch quotes (provided or top for guest)
    let quotes: QuoteContext[] = [];
    if (args.quote_ids && args.quote_ids.length > 0) {
      const { data: quoteData } = await supabase
        .from('interview_quotes')
        .select('quote, topic, pillar')
        .in('id', args.quote_ids)
        .limit(5);
      
      if (quoteData) {
        quotes = quoteData;
      }
    } else {
      // Get top quotes for this guest
      const { data: quoteData } = await supabase
        .from('interview_quotes')
        .select('quote, topic, pillar')
        .eq('guest_id', args.guest_id)
        .limit(3);
      
      if (quoteData) {
        quotes = quoteData;
      }
    }

    // 7. Fetch themes if provided
    let themes: Array<{ name: string; description?: string }> = [];
    if (args.theme_ids && args.theme_ids.length > 0) {
      const { data: themeData } = await supabase
        .from('themes')
        .select('name, description')
        .in('id', args.theme_ids)
        .limit(5);
      
      if (themeData) {
        themes = themeData;
      }
    }

    // 8. Fetch assets if provided
    let assets: Array<{ type: string; title?: string }> = [];
    if (args.asset_ids && args.asset_ids.length > 0) {
      const { data: assetData } = await supabase
        .from('content_assets')
        .select('type, title')
        .in('id', args.asset_ids)
        .limit(5);
      
      if (assetData) {
        assets = assetData;
      }
    }

    // 9. Optional: Get RAG context for additional supporting evidence
    let ragContext = '';
    try {
      const searchResult = await executeTool('brain.search', {
        query: `${guestContext.name} interview insights and perspectives`,
        intent: 'interview_evidence',
        limit: 3,
        threshold: 0.5,
      }, { ...context, allowWrites: false });

      if (searchResult.success && searchResult.data) {
        const results = (searchResult.data as { results?: Array<{ content: string }> }).results || [];
        ragContext = results.slice(0, 2).map(r => r.content.slice(0, 200)).join('\n');
      }
    } catch {
      // Continue without RAG context
    }

    // 10. Determine or create campaign
    let campaignId = args.campaign_id;
    
    if (!campaignId) {
      // Find existing campaign of this type or create one
      const { data: existingCampaign } = await supabase
        .from('outreach_campaigns')
        .select('id')
        .eq('org_id', context.org_id)
        .eq('type', args.campaign_type)
        .eq('status', 'active')
        .limit(1)
        .single();

      if (existingCampaign) {
        campaignId = existingCampaign.id;
      } else {
        // Create campaign
        const createResult = await executeTool('outreach.create_campaign', {
          name: CAMPAIGN_TYPE_LABELS[args.campaign_type],
          type: args.campaign_type,
          config: { auto_created: true },
        }, context);

        if (!createResult.success || !createResult.data) {
          return {
            success: false,
            error: { code: 'CAMPAIGN_CREATE_FAILED', message: 'Failed to create campaign' },
          };
        }

        campaignId = (createResult.data as { campaign_id: string }).campaign_id;
      }
    }

    // 11. Upsert thread
    const threadResult = await executeTool('outreach.upsert_thread', {
      campaign_id: campaignId,
      guest_id: args.guest_id,
      state: 'draft',
    }, context);

    if (!threadResult.success || !threadResult.data) {
      return {
        success: false,
        error: { code: 'THREAD_CREATE_FAILED', message: 'Failed to create/update thread' },
      };
    }

    const threadId = (threadResult.data as { thread_id: string }).thread_id;

    // 12. Generate message using OpenAI
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const systemPrompt = `You are a professional outreach copywriter for LifeRX, a media platform focused on Health, Wealth, and Connection.

Generate a personalized ${args.campaign_type.replace('_', ' ')} message for the ${args.channel} channel.

Message structure:
1. RECOGNITION: Reference something specific about them (quote, belief, work)
2. VALUE FRAMING: Explain why they fit LifeRX's mission
3. SPECIFIC ASK: Suggest a concrete format/opportunity
4. LOW-FRICTION CTA: One clear action

Channel guidelines:
- email: Subject line (under 50 chars) + professional body (150-300 words)
- linkedin: DM style, conversational, 100-200 words
- instagram: Casual, emoji-friendly, 80-150 words
- x: Very concise, 200-280 characters

Also suggest a "format_fit" - the ideal content format for this person:
- IG video series
- Podcast follow-up episode
- Newsletter contributor
- Quote card series
- Short-form video clips

Return JSON:
{
  "subject": "Subject line (email only)",
  "body": "Message body",
  "cta": "Specific call-to-action",
  "format_fit": "Recommended format",
  "format_fit_rationale": "Why this format"
}`;

    const userPrompt = `Compose a ${args.campaign_type.replace('_', ' ')} message for:

GUEST: ${guestContext.name}
${guestContext.company ? `Company: ${guestContext.company}` : ''}
${guestContext.role ? `Role: ${guestContext.role}` : ''}
${guestContext.pillar ? `Pillar: ${guestContext.pillar}` : ''}
${guestContext.unique_pov ? `Unique POV: ${guestContext.unique_pov}` : ''}
${guestContext.has_podcast ? 'Has podcast: Yes' : ''}
${guestScore ? `Guest Score: ${guestScore.final_score}/100` : ''}

${personaContext.summary ? `PERSONA SUMMARY: ${personaContext.summary}` : ''}
${personaContext.beliefs?.length ? `BELIEFS: ${personaContext.beliefs.join(', ')}` : ''}
${personaContext.expertise?.length ? `EXPERTISE: ${personaContext.expertise.join(', ')}` : ''}
${personaContext.unique_povs?.length ? `UNIQUE PERSPECTIVES: ${personaContext.unique_povs.join(', ')}` : ''}

${quotes.length > 0 ? `QUOTES:\n${quotes.map(q => `- "${q.quote}" (${q.topic || 'general'})`).join('\n')}` : ''}

${themes.length > 0 ? `THEMES: ${themes.map(t => t.name).join(', ')}` : ''}

${assets.length > 0 ? `AVAILABLE ASSETS: ${assets.map(a => `${a.type}: ${a.title}`).join(', ')}` : ''}

${ragContext ? `ADDITIONAL CONTEXT:\n${ragContext}` : ''}

CHANNEL: ${args.channel}
CAMPAIGN TYPE: ${args.campaign_type}`;

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
        error: { code: 'AI_ERROR', message: 'No response from AI' },
      };
    }

    let messageContent: {
      subject?: string;
      body: string;
      cta: string;
      format_fit: string;
      format_fit_rationale: string;
    };

    try {
      messageContent = JSON.parse(responseContent);
    } catch {
      return {
        success: false,
        error: { code: 'PARSE_ERROR', message: 'Failed to parse AI response' },
      };
    }

    // 13. Insert message as draft
    const personalization = {
      quote_ids: args.quote_ids || quotes.map(() => null).filter(Boolean),
      theme_ids: args.theme_ids || [],
      asset_ids: args.asset_ids || [],
      guest_email: guestContext.email,
      guest_name: guestContext.name,
      format_fit: messageContent.format_fit,
    };

    const { data: insertedMessage, error: insertError } = await supabase
      .from('outreach_messages')
      .insert({
        org_id: context.org_id,
        thread_id: threadId,
        guest_id: args.guest_id,
        direction: 'outbound',
        channel: args.channel,
        subject: args.channel === 'email' ? messageContent.subject : null,
        body: messageContent.body,
        status: 'draft',
        personalization,
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
        thread_id: threadId,
        message_id: insertedMessage.id,
        format_fit: messageContent.format_fit,
      },
      explainability: {
        action: 'composed_message',
        campaign_id: campaignId,
        campaign_type: args.campaign_type,
        channel: args.channel,
        quotes_used: quotes.length,
        themes_used: themes.length,
        assets_used: assets.length,
        rag_context_used: !!ragContext,
        format_fit: messageContent.format_fit,
        format_fit_rationale: messageContent.format_fit_rationale,
        cta: messageContent.cta,
      },
      writes: [
        {
          table: 'outreach_messages',
          operation: 'insert',
          id: insertedMessage.id,
        },
      ],
    };
  },
};

