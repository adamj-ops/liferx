/**
 * Tool: interviews.extract_defining_quotes
 * Extract the most reusable and defining quotes from an interview.
 * 
 * Parses transcript, identifies direct first-person quotes,
 * rejects paraphrases, and classifies each quote.
 */

import OpenAI from 'openai';
import type { ToolDefinition, ToolContext, ToolResponse } from '../types';
import { createServiceClient } from '../../supabase/server';
import { executeTool } from '../executeTool';

interface ExtractQuotesArgs {
  interview_id: string;
  max_quotes?: number;
}

interface ProposedQuote {
  quote: string;
  topic: string;
  pillar: 'Health' | 'Wealth' | 'Connection';
  tone: 'inspiring' | 'tactical' | 'reflective';
  rationale: string;
}

const VALID_PILLARS = ['Health', 'Wealth', 'Connection'] as const;
const VALID_TONES = ['inspiring', 'tactical', 'reflective'] as const;

export const interviewsExtractDefiningQuotes: ToolDefinition<ExtractQuotesArgs> = {
  name: 'interviews.extract_defining_quotes',
  description: 'Extract the most reusable and defining quotes from an interview transcript',
  version: '1.0.0',

  async execute(args: ExtractQuotesArgs, context: ToolContext): Promise<ToolResponse> {
    const supabase = createServiceClient();
    const maxQuotes = args.max_quotes ?? 5;

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
          message: 'Interview transcript is too short for quote extraction (minimum 100 characters)',
        },
      };
    }

    // 2. Use OpenAI to extract defining quotes
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const systemPrompt = `You are an expert content curator for LifeRX, a platform focused on Health, Wealth, and Connection.

Your task is to extract the most powerful, reusable, and defining DIRECT QUOTES from an interview transcript.

CRITICAL RULES for quote selection:
1. ONLY extract DIRECT, FIRST-PERSON quotes spoken by the guest
2. Quotes MUST be verbatim text from the transcript (can be slightly cleaned for clarity)
3. REJECT any paraphrases or third-person descriptions
4. REJECT quotes that start with "They said...", "He believes...", "According to..."
5. Prefer quotes that:
   - Express a unique perspective or insight
   - Are self-contained and understandable without context
   - Are emotionally resonant or thought-provoking
   - Could be used for social media, articles, or marketing

For each quote, provide:
- The exact quote text (40-200 characters preferred)
- Topic: what the quote is about (2-5 words)
- Pillar: Health, Wealth, or Connection
- Tone: inspiring, tactical, or reflective
- Rationale: why this quote is worth saving (1 sentence)

Return a JSON object with this exact structure:
{
  "quotes": [
    {
      "quote": "The exact quote text here",
      "topic": "topic description",
      "pillar": "Health",
      "tone": "inspiring",
      "rationale": "Why this quote matters"
    }
  ]
}

Extract up to ${maxQuotes} of the best quotes. Quality over quantity.`;

    const userPrompt = `Extract defining quotes from this interview transcript:\n\n${transcript.slice(0, 12000)}`;

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

    let analysis: { quotes: ProposedQuote[] };
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

    const proposedQuotes = analysis.quotes || [];
    
    // 3. Validate and filter quotes
    const validatedQuotes: ProposedQuote[] = [];
    const rejectedQuotes: Array<{ quote: string; reason: string }> = [];

    for (const q of proposedQuotes.slice(0, maxQuotes)) {
      // Validate pillar
      if (!VALID_PILLARS.includes(q.pillar as typeof VALID_PILLARS[number])) {
        rejectedQuotes.push({ quote: q.quote, reason: `Invalid pillar: ${q.pillar}` });
        continue;
      }

      // Validate tone
      if (!VALID_TONES.includes(q.tone as typeof VALID_TONES[number])) {
        rejectedQuotes.push({ quote: q.quote, reason: `Invalid tone: ${q.tone}` });
        continue;
      }

      // Check quote is not too short
      if (!q.quote || q.quote.trim().length < 20) {
        rejectedQuotes.push({ quote: q.quote || '', reason: 'Quote too short' });
        continue;
      }

      // Check quote is not too long
      if (q.quote.length > 500) {
        rejectedQuotes.push({ quote: q.quote.slice(0, 50) + '...', reason: 'Quote too long' });
        continue;
      }

      validatedQuotes.push(q);
    }

    // 4. Persist quotes if writes are allowed
    if (!context.allowWrites) {
      return {
        success: true,
        data: {
          quotes_found: validatedQuotes.length,
          quotes: validatedQuotes,
          rejected: rejectedQuotes,
        },
        explainability: {
          action: 'dry_run',
          reason: 'Quotes extracted but not persisted (allowWrites=false)',
        },
      };
    }

    // Use the interviews.add_quote tool to persist each quote
    const createdQuoteIds: string[] = [];
    const failedQuotes: Array<{ quote: string; error: string }> = [];

    for (const q of validatedQuotes) {
      const addResult = await executeTool('interviews.add_quote', {
        interview_id: args.interview_id,
        quote: q.quote.trim(),
        topic: q.topic,
        pillar: q.pillar,
        tone: q.tone,
      }, context);

      if (addResult.success && addResult.data) {
        const quoteId = (addResult.data as { quote_id: string }).quote_id;
        createdQuoteIds.push(quoteId);
      } else {
        failedQuotes.push({
          quote: q.quote.slice(0, 50) + '...',
          error: addResult.error?.message || 'Unknown error',
        });
      }
    }

    return {
      success: true,
      data: {
        quotes_created: createdQuoteIds.length,
        quote_ids: createdQuoteIds,
      },
      explainability: {
        action: 'extracted',
        quotes_proposed: proposedQuotes.length,
        quotes_validated: validatedQuotes.length,
        quotes_created: createdQuoteIds.length,
        quotes_failed: failedQuotes.length,
        failed_details: failedQuotes.length > 0 ? failedQuotes : undefined,
        rejected_details: rejectedQuotes.length > 0 ? rejectedQuotes : undefined,
        quote_rationales: validatedQuotes.map(q => ({
          quote: q.quote.slice(0, 50) + '...',
          rationale: q.rationale,
        })),
      },
      writes: createdQuoteIds.map(id => ({
        table: 'interview_quotes',
        operation: 'insert' as const,
        id,
      })),
    };
  },
};

