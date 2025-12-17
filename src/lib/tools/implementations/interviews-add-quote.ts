/**
 * Tool: interviews.add_quote
 * Adds a notable quote from an interview
 */

import { ToolDefinition, ToolContext, ToolResponse } from '../types';
import { createServerClient } from '../../supabase/server';

interface AddQuoteArgs {
  interview_id: string;
  guest_id: string;
  quote: string;
  pillar?: 'health' | 'wealth' | 'connection';
  emotional_insight?: string;
  context?: string;
  is_highlight?: boolean;
  tags?: string[];
  timestamp_start?: number;
  timestamp_end?: number;
}

export const interviewsAddQuote: ToolDefinition<AddQuoteArgs> = {
  name: 'interviews.add_quote',
  description: 'Add a notable quote from an interview',
  version: '1.0.0',
  
  async execute(args: AddQuoteArgs, context: ToolContext): Promise<ToolResponse> {
    const supabase = createServerClient();
    
    if (!context.allowWrites) {
      return {
        success: false,
        error: {
          code: 'WRITE_NOT_ALLOWED',
          message: 'Write operations are not permitted in this context',
        },
      };
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
        guest_id: args.guest_id,
        quote: args.quote,
        pillar: args.pillar,
        emotional_insight: args.emotional_insight,
        context: args.context,
        is_highlight: args.is_highlight ?? false,
        tags: args.tags ?? [],
        timestamp_start: args.timestamp_start,
        timestamp_end: args.timestamp_end,
      })
      .select()
      .single();
    
    if (error) {
      return {
        success: false,
        error: { code: 'DB_ERROR', message: error.message },
      };
    }
    
    return {
      success: true,
      data: { ...data, interview_title: interview.title },
      explainability: {
        action: 'added_quote',
        pillar: args.pillar,
        is_highlight: args.is_highlight ?? false,
        has_emotional_insight: !!args.emotional_insight,
        tags_count: args.tags?.length ?? 0,
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
