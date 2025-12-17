/**
 * Tool: guest_personas.upsert
 * Generates or updates a guest persona using RAG-powered interview analysis.
 * 
 * Uses brain.search to find relevant quotes and content from interviews,
 * then generates a structured persona capturing who the guest is,
 * what they believe, and what they bring to LifeRX.
 */

import { ToolDefinition, ToolContext, ToolResponse } from '../types';
import { createServiceClient } from '../../supabase/server';
import { executeTool } from '../executeTool';
import OpenAI from 'openai';

// Lazy-initialized to avoid build-time errors
let openai: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!openai) {
    openai = new OpenAI();
  }
  return openai;
}

interface UpsertPersonaArgs {
  /** Guest ID to generate persona for */
  guest_id: string;
  /** Optional: specific interview IDs to analyze */
  source_interview_ids?: string[];
}

interface PersonaContent {
  summary: string;
  beliefs: string[];
  expertise: string[];
  unique_povs: string[];
}

/**
 * Use brain.search to find relevant content about this guest.
 */
async function findGuestContent(
  guestName: string,
  context: ToolContext
): Promise<{ quotes: string[]; interviewIds: string[] }> {
  const quotes: string[] = [];
  const interviewIds: Set<string> = new Set();
  
  try {
    // Search for interview content mentioning this guest
    const searchResult = await executeTool('brain.search', {
      query: `${guestName} interview quotes insights`,
      intent: 'Finding interview content and quotes from this guest for persona generation',
      limit: 20,
    }, context);
    
    if (searchResult.success && searchResult.data) {
      const data = searchResult.data as { results?: Array<{
        content: string;
        source?: { type?: string; id?: string };
      }> };
      const results = data.results || [];
      
      for (const result of results) {
        if (result.content) {
          quotes.push(result.content);
        }
        if (result.source?.type === 'interview' && result.source?.id) {
          interviewIds.add(result.source.id);
        }
      }
    }
  } catch (error) {
    console.warn('[guest_personas.upsert] brain.search error:', error);
  }
  
  return { quotes, interviewIds: Array.from(interviewIds) };
}

/**
 * Generate persona content using AI analysis of quotes and content.
 */
async function generatePersona(
  guestName: string,
  guestBio: string | null,
  quotes: string[]
): Promise<PersonaContent> {
  const systemPrompt = `You are an expert at understanding people and distilling their essence.
Given information about a guest, generate a structured persona.

Output JSON with these fields:
- summary: 1-2 sentence description of who this person is
- beliefs: Array of 3-5 core beliefs/values this person holds
- expertise: Array of 3-5 areas of expertise
- unique_povs: Array of 2-4 unique perspectives or angles this person brings`;

  const userPrompt = `Generate a persona for: ${guestName}

${guestBio ? `Bio: ${guestBio}` : ''}

${quotes.length > 0 ? `Content from interviews and quotes:
${quotes.slice(0, 10).join('\n\n')}` : 'No interview content available - generate based on name and bio only.'}

Return valid JSON only.`;

  try {
    const completion = await getOpenAI().chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
      max_tokens: 800,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No content in AI response');
    }

    const parsed = JSON.parse(content) as PersonaContent;
    
    return {
      summary: parsed.summary || `${guestName} is a thought leader in their field.`,
      beliefs: parsed.beliefs || [],
      expertise: parsed.expertise || [],
      unique_povs: parsed.unique_povs || [],
    };
  } catch (error) {
    console.error('[guest_personas.upsert] AI generation error:', error);
    
    // Fallback persona
    return {
      summary: `${guestName} is a contributor to LifeRX.`,
      beliefs: [],
      expertise: [],
      unique_povs: [],
    };
  }
}

export const guestPersonasUpsert: ToolDefinition<UpsertPersonaArgs> = {
  name: 'guest_personas.upsert',
  description: 'Generate or update a guest persona using RAG-powered interview analysis',
  version: '1.0.0',
  
  async execute(args: UpsertPersonaArgs, context: ToolContext): Promise<ToolResponse> {
    const supabase = createServiceClient();
    
    // Check write permission
    if (!context.allowWrites) {
      return {
        success: false,
        error: {
          code: 'WRITE_NOT_ALLOWED',
          message: 'Write operations are not permitted in this context',
        },
      };
    }
    
    // Validate input
    if (!args.guest_id) {
      return {
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'guest_id is required',
        },
      };
    }
    
    // Fetch guest
    const { data: guest, error: guestError } = await supabase
      .from('guests')
      .select('id, full_name, name, bio')
      .eq('id', args.guest_id)
      .single();
    
    if (guestError || !guest) {
      return {
        success: false,
        error: {
          code: 'GUEST_NOT_FOUND',
          message: `Guest with id ${args.guest_id} not found`,
        },
      };
    }
    
    const guestName = guest.full_name || guest.name || 'Unknown Guest';
    
    // Find content about this guest via RAG
    const { quotes, interviewIds } = await findGuestContent(guestName, context);
    
    // Merge with provided interview IDs
    const allInterviewIds = [
      ...new Set([...interviewIds, ...(args.source_interview_ids || [])]),
    ];
    
    // Generate persona content
    const personaContent = await generatePersona(
      guestName,
      guest.bio || null,
      quotes
    );
    
    // Check for existing persona
    const { data: existing } = await supabase
      .from('guest_personas')
      .select('id')
      .eq('guest_id', args.guest_id)
      .eq('org_id', context.org_id)
      .single();
    
    let personaId: string;
    let action: 'created' | 'updated';
    
    if (existing) {
      // Update existing persona
      const { error: updateError } = await supabase
        .from('guest_personas')
        .update({
          summary: personaContent.summary,
          beliefs: personaContent.beliefs,
          expertise: personaContent.expertise,
          unique_povs: personaContent.unique_povs,
          source_interview_ids: allInterviewIds,
          source_quote_count: quotes.length,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);
      
      if (updateError) {
        return {
          success: false,
          error: { code: 'DB_ERROR', message: updateError.message },
        };
      }
      
      personaId = existing.id;
      action = 'updated';
    } else {
      // Create new persona
      const { data: newPersona, error: insertError } = await supabase
        .from('guest_personas')
        .insert({
          org_id: context.org_id,
          guest_id: args.guest_id,
          persona_type: 'comprehensive', // Required by existing schema
          content: personaContent, // Required by existing schema - store as jsonb
          summary: personaContent.summary,
          beliefs: personaContent.beliefs,
          expertise: personaContent.expertise,
          unique_povs: personaContent.unique_povs,
          source_interview_ids: allInterviewIds,
          source_quote_count: quotes.length,
          generated_at: new Date().toISOString(),
        })
        .select('id')
        .single();
      
      if (insertError) {
        return {
          success: false,
          error: { code: 'DB_ERROR', message: insertError.message },
        };
      }
      
      personaId = newPersona.id;
      action = 'created';
    }
    
    return {
      success: true,
      data: {
        persona_id: personaId,
      },
      explainability: {
        action,
        guest_name: guestName,
        interviews_analyzed: allInterviewIds.length,
        quotes_found: quotes.length,
        beliefs_generated: personaContent.beliefs.length,
        expertise_areas: personaContent.expertise.length,
        unique_povs_identified: personaContent.unique_povs.length,
        source_interview_ids: allInterviewIds,
      },
      writes: [
        {
          table: 'guest_personas',
          operation: action === 'created' ? 'insert' : 'update',
          id: personaId,
        },
      ],
    };
  },
};

