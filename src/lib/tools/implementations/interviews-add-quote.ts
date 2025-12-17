/**
 * Tool: interviews.add_quote
 * Adds a notable quote from an interview with semantic metadata.
 * 
 * Validates that quotes are direct (not paraphrased) and meaningful.
 */

import { ToolDefinition, ToolContext, ToolResponse } from '../types';
import { createServiceClient } from '../../supabase/server';

interface AddQuoteArgs {
  interview_id: string;
  quote: string;
  topic: string;
  pillar: 'Health' | 'Wealth' | 'Connection';
  tone: 'inspiring' | 'tactical' | 'reflective';
}

// Common paraphrase patterns to reject
const PARAPHRASE_PATTERNS = [
  /^(they|he|she|it)\s+(said|believes?|thinks?|mentioned)/i,
  /^according to/i,
  /^(the guest|the speaker)\s/i,
];

export const interviewsAddQuote: ToolDefinition<AddQuoteArgs> = {
  name: 'interviews.add_quote',
  description: 'Add a direct quote from an interview with topic and tone metadata',
  version: '2.0.0',
  
  async execute(args: AddQuoteArgs, context: ToolContext): Promise<ToolResponse> {
    const supabase = createServiceClient();
    
    if (!context.allowWrites) {
      return {
        success: false,
        error: {
          code: 'WRITE_NOT_ALLOWED',
          message: 'Write operations are not permitted in this context',
        },
      };
    }
    
    // Validation: Reject empty after trim
    const trimmedQuote = args.quote.trim();
    if (!trimmedQuote) {
      return {
        success: false,
        error: {
          code: 'EMPTY_QUOTE',
          message: 'Quote cannot be empty',
        },
      };
    }
    
    // Validation: Must contain at least one space (not single-word junk)
    if (!trimmedQuote.includes(' ')) {
      return {
        success: false,
        error: {
          code: 'SINGLE_WORD',
          message: 'Quote must be more than a single word',
        },
      };
    }
    
    // Validation: Reject common paraphrase patterns
    for (const pattern of PARAPHRASE_PATTERNS) {
      if (pattern.test(trimmedQuote)) {
        return {
          success: false,
          error: {
            code: 'PARAPHRASED',
            message: 'Quote appears to be paraphrased, not a direct quote',
          },
        };
      }
    }
    
    // Verify interview exists
    const { data: interview } = await supabase
      .from('interviews')
      .select('id, title')
      .eq('id', args.interview_id)
      .single();
    
    if (!interview) {
      return {
        success: false,
        error: {
          code: 'INTERVIEW_NOT_FOUND',
          message: `Interview with id ${args.interview_id} not found`,
        },
      };
    }
    
    const { data, error } = await supabase
      .from('interview_quotes')
      .insert({
        interview_id: args.interview_id,
        quote: trimmedQuote,
        pillar: args.pillar.toLowerCase(),  // Store lowercase for consistency
        topic: args.topic,
        tone: args.tone,
        org_id: context.org_id,
      })
      .select('id')
      .single();
    
    if (error) {
      return {
        success: false,
        error: { code: 'DB_ERROR', message: error.message },
      };
    }
    
    return {
      success: true,
      data: {
        quote_id: data.id,
      },
      explainability: {
        topic: args.topic,
        pillar: args.pillar,
        tone: args.tone,
        reason: `Quote is reusable because it captures a distinct perspective on ${args.topic}`,
      },
      writes: [
        {
          table: 'interview_quotes',
          operation: 'insert',
          id: data.id,
        },
      ],
    };
  },
};
