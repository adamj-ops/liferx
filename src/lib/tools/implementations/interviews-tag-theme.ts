/**
 * Tool: interviews.tag_theme
 * Tags an interview with a theme
 */

import { ToolDefinition, ToolContext, ToolResponse } from '../types';
import { createServerClient } from '../../supabase/server';

interface TagThemeArgs {
  interview_id: string;
  theme_name: string;
  confidence?: number;
  notes?: string;
}

export const interviewsTagTheme: ToolDefinition<TagThemeArgs> = {
  name: 'interviews.tag_theme',
  description: 'Tag an interview with a theme',
  version: '1.0.0',
  
  async execute(args: TagThemeArgs, context: ToolContext): Promise<ToolResponse> {
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
    
    // Get or create theme
    let theme;
    const { data: existingTheme } = await supabase
      .from('themes')
      .select('id, name, pillar')
      .eq('name', args.theme_name)
      .single();
    
    if (existingTheme) {
      theme = existingTheme;
    } else {
      const { data: newTheme, error: themeError } = await supabase
        .from('themes')
        .insert({
          name: args.theme_name,
          created_by: context.user_id,
          updated_by: context.user_id,
        })
        .select()
        .single();
      
      if (themeError) {
        return {
          success: false,
          error: { code: 'DB_ERROR', message: themeError.message },
        };
      }
      theme = newTheme;
    }
    
    // Upsert interview_theme
    const { data: existingLink } = await supabase
      .from('interview_themes')
      .select('id')
      .eq('interview_id', args.interview_id)
      .eq('theme_id', theme.id)
      .single();
    
    let result;
    let action: 'created' | 'updated';
    
    if (existingLink) {
      const { data, error } = await supabase
        .from('interview_themes')
        .update({
          confidence: args.confidence ?? 0.8,
          notes: args.notes,
        })
        .eq('id', existingLink.id)
        .select()
        .single();
      
      if (error) {
        return {
          success: false,
          error: { code: 'DB_ERROR', message: error.message },
        };
      }
      result = data;
      action = 'updated';
    } else {
      const { data, error } = await supabase
        .from('interview_themes')
        .insert({
          interview_id: args.interview_id,
          theme_id: theme.id,
          confidence: args.confidence ?? 0.8,
          notes: args.notes,
        })
        .select()
        .single();
      
      if (error) {
        return {
          success: false,
          error: { code: 'DB_ERROR', message: error.message },
        };
      }
      result = data;
      action = 'created';
    }
    
    return {
      success: true,
      data: {
        ...result,
        theme_name: theme.name,
        theme_pillar: theme.pillar,
        interview_title: interview.title,
      },
      explainability: {
        action: action === 'created' ? 'tagged' : 'updated_tag',
        theme_existed: !!existingTheme,
        confidence: args.confidence ?? 0.8,
      },
      writes: [
        {
          table: 'interview_themes',
          operation: action === 'created' ? 'insert' : 'update',
          id: result.id,
        },
      ],
    };
  },
};
