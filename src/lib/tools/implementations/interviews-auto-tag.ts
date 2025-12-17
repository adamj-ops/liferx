/**
 * Tool: interviews.auto_tag
 * Automatically tags an interview based on transcript content.
 * 
 * Uses transcript + RAG over prior interviews to infer:
 * - industries
 * - expertise areas
 * - pillars (Health / Wealth / Connection)
 * - tones (inspiring, tactical, reflective)
 */

import OpenAI from 'openai';
import type { ToolDefinition, ToolContext, ToolResponse } from '../types';
import { createServiceClient } from '../../supabase/server';
import { executeTool } from '../executeTool';

interface AutoTagArgs {
  interview_id: string;
}

interface TagResult {
  industries: string[];
  expertise: string[];
  pillars: string[];
  tones: string[];
}

interface TagExplainability {
  industries_rationale: Record<string, string>;
  expertise_rationale: Record<string, string>;
  pillars_rationale: Record<string, string>;
  tones_rationale: Record<string, string>;
}

const VALID_PILLARS = ['Health', 'Wealth', 'Connection'];
const VALID_TONES = ['inspiring', 'tactical', 'reflective'];

export const interviewsAutoTag: ToolDefinition<AutoTagArgs> = {
  name: 'interviews.auto_tag',
  description: 'Automatically tag an interview based on transcript content using AI analysis',
  version: '1.0.0',

  async execute(args: AutoTagArgs, context: ToolContext): Promise<ToolResponse> {
    const supabase = createServiceClient();

    // 1. Fetch the interview
    const { data: interview, error: fetchError } = await supabase
      .from('interviews')
      .select('id, title, transcript, raw_transcript, guest_id, org_id')
      .eq('id', args.interview_id)
      .single();

    if (fetchError || !interview) {
      return {
        success: false,
        error: {
          code: 'INTERVIEW_NOT_FOUND',
          message: `Interview with id ${args.interview_id} not found`,
        },
      };
    }

    // Use transcript or fall back to raw_transcript
    const transcript = interview.transcript || interview.raw_transcript;
    if (!transcript || transcript.trim().length < 100) {
      return {
        success: false,
        error: {
          code: 'INSUFFICIENT_CONTENT',
          message: 'Interview transcript is too short for analysis (minimum 100 characters)',
        },
      };
    }

    // 2. Get context from RAG (similar interviews)
    let ragContext = '';
    try {
      const searchResult = await executeTool('brain.search', {
        query: `Interview content: ${transcript.slice(0, 500)}`,
        intent: 'interview_evidence',
        limit: 3,
        threshold: 0.5,
      }, { ...context, allowWrites: false });

      if (searchResult.success && searchResult.data) {
        const results = (searchResult.data as { results?: Array<{ content: string }> }).results || [];
        ragContext = results
          .slice(0, 3)
          .map((r: { content: string }) => r.content.slice(0, 300))
          .join('\n---\n');
      }
    } catch {
      // Continue without RAG context
      console.warn('[interviews.auto_tag] RAG search failed, continuing without context');
    }

    // 3. Use OpenAI to analyze transcript and infer tags
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const systemPrompt = `You are an expert content analyst for LifeRX, a platform focused on Health, Wealth, and Connection.

Analyze the interview transcript and identify:
1. **Industries**: What industries/sectors does this person work in or discuss? (e.g., "healthcare", "fintech", "education")
2. **Expertise**: What specific areas of expertise does this person have? (e.g., "mindfulness", "investing", "leadership")
3. **Pillars**: Which LifeRX pillars does this interview primarily address? Choose from: Health, Wealth, Connection
4. **Tones**: What is the overall tone of the interview? Choose from: inspiring, tactical, reflective

For each tag, provide a brief rationale explaining why you assigned it.

Return your analysis as a JSON object with this exact structure:
{
  "industries": ["industry1", "industry2"],
  "expertise": ["expertise1", "expertise2"],
  "pillars": ["Health", "Wealth"],
  "tones": ["inspiring", "tactical"],
  "rationale": {
    "industries": {"industry1": "reason", "industry2": "reason"},
    "expertise": {"expertise1": "reason", "expertise2": "reason"},
    "pillars": {"Health": "reason", "Wealth": "reason"},
    "tones": {"inspiring": "reason", "tactical": "reason"}
  }
}

Rules:
- Industries and expertise should be lowercase, 1-3 words each
- Pillars must be exactly: "Health", "Wealth", or "Connection"
- Tones must be exactly: "inspiring", "tactical", or "reflective"
- Include 1-5 items per category
- Be specific rather than generic`;

    let userPrompt = `Analyze this interview transcript:\n\n${transcript.slice(0, 8000)}`;
    if (ragContext) {
      userPrompt += `\n\n---\nContext from similar interviews:\n${ragContext}`;
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
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

    let analysis: {
      industries: string[];
      expertise: string[];
      pillars: string[];
      tones: string[];
      rationale: {
        industries: Record<string, string>;
        expertise: Record<string, string>;
        pillars: Record<string, string>;
        tones: Record<string, string>;
      };
    };

    try {
      analysis = JSON.parse(responseContent);
    } catch {
      return {
        success: false,
        error: {
          code: 'PARSE_ERROR',
          message: 'Failed to parse AI response',
        },
      };
    }

    // 4. Validate and normalize tags
    const normalizedTags: TagResult = {
      industries: (analysis.industries || [])
        .map((i: string) => i.toLowerCase().trim())
        .filter((i: string) => i.length > 0)
        .slice(0, 10),
      expertise: (analysis.expertise || [])
        .map((e: string) => e.toLowerCase().trim())
        .filter((e: string) => e.length > 0)
        .slice(0, 10),
      pillars: (analysis.pillars || [])
        .filter((p: string) => VALID_PILLARS.includes(p))
        .slice(0, 3),
      tones: (analysis.tones || [])
        .filter((t: string) => VALID_TONES.includes(t))
        .slice(0, 3),
    };

    // 5. Persist tags if writes are allowed
    if (!context.allowWrites) {
      return {
        success: true,
        data: normalizedTags,
        explainability: {
          action: 'dry_run',
          reason: 'Tags computed but not persisted (allowWrites=false)',
          rationale: analysis.rationale,
        },
      };
    }

    const { error: updateError } = await supabase
      .from('interviews')
      .update({
        industries: normalizedTags.industries,
        expertise: normalizedTags.expertise,
        pillars: normalizedTags.pillars,
        tones: normalizedTags.tones,
      })
      .eq('id', args.interview_id)
      .eq('org_id', context.org_id);

    if (updateError) {
      return {
        success: false,
        error: { code: 'DB_ERROR', message: updateError.message },
      };
    }

    const explainability: TagExplainability = {
      industries_rationale: analysis.rationale?.industries || {},
      expertise_rationale: analysis.rationale?.expertise || {},
      pillars_rationale: analysis.rationale?.pillars || {},
      tones_rationale: analysis.rationale?.tones || {},
    };

    return {
      success: true,
      data: normalizedTags,
      explainability: {
        action: 'tagged',
        rag_context_used: !!ragContext,
        ...explainability,
      },
      writes: [
        {
          table: 'interviews',
          operation: 'update',
          id: args.interview_id,
        },
      ],
    };
  },
};

