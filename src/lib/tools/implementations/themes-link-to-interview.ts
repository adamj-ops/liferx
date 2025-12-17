/**
 * Tool: themes.link_to_interview
 * Links a theme to an interview, optionally at the quote level.
 * 
 * Uses partial unique indexes to handle deduplication.
 */

import { ToolDefinition, ToolContext, ToolResponse } from '../types';
import { createServiceClient } from '../../supabase/server';

interface LinkToInterviewArgs {
  theme_id: string;
  interview_id: string;
  quote_id?: string;
}

export const themesLinkToInterview: ToolDefinition<LinkToInterviewArgs> = {
  name: 'themes.link_to_interview',
  description: 'Link a theme to an interview, optionally at the quote level',
  version: '1.0.0',

  async execute(args: LinkToInterviewArgs, context: ToolContext): Promise<ToolResponse> {
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

    // Validate theme exists
    const { data: theme } = await supabase
      .from('themes')
      .select('id')
      .eq('id', args.theme_id)
      .single();

    if (!theme) {
      return {
        success: false,
        error: {
          code: 'THEME_NOT_FOUND',
          message: `Theme with id ${args.theme_id} not found`,
        },
      };
    }

    // Validate interview exists
    const { data: interview } = await supabase
      .from('interviews')
      .select('id')
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

    // Validate quote exists if provided
    if (args.quote_id) {
      const { data: quote } = await supabase
        .from('interview_quotes')
        .select('id')
        .eq('id', args.quote_id)
        .single();

      if (!quote) {
        return {
          success: false,
          error: {
            code: 'QUOTE_NOT_FOUND',
            message: `Quote with id ${args.quote_id} not found`,
          },
        };
      }
    }

    // Check if link already exists
    let existingQuery = supabase
      .from('interview_themes')
      .select('id')
      .eq('theme_id', args.theme_id)
      .eq('interview_id', args.interview_id);

    if (args.quote_id) {
      existingQuery = existingQuery.eq('quote_id', args.quote_id);
    } else {
      existingQuery = existingQuery.is('quote_id', null);
    }

    const { data: existing } = await existingQuery.single();

    if (existing) {
      // Link already exists
      return {
        success: true,
        data: {
          link_id: existing.id,
          already_existed: true,
        },
        explainability: {
          action: 'skipped',
          reason: 'Link already exists',
        },
      };
    }

    // Create new link
    const { data, error } = await supabase
      .from('interview_themes')
      .insert({
        theme_id: args.theme_id,
        interview_id: args.interview_id,
        quote_id: args.quote_id ?? null,
        org_id: context.org_id,
      })
      .select('id')
      .single();

    if (error) {
      // Handle unique constraint violation gracefully
      if (error.code === '23505') {
        return {
          success: true,
          data: {
            link_id: null,
            already_existed: true,
          },
          explainability: {
            action: 'skipped',
            reason: 'Link already exists (constraint)',
          },
        };
      }

      return {
        success: false,
        error: { code: 'DB_ERROR', message: error.message },
      };
    }

    return {
      success: true,
      data: {
        link_id: data.id,
        already_existed: false,
      },
      explainability: {
        action: 'created',
        theme_id: args.theme_id,
        interview_id: args.interview_id,
        quote_id: args.quote_id ?? null,
      },
      writes: [
        {
          table: 'interview_themes',
          operation: 'insert',
          id: data.id,
        },
      ],
    };
  },
};

