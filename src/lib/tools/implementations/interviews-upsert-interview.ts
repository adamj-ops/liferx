/**
 * Tool: interviews.upsert_interview
 * Creates or updates an interview record
 */

import { ToolDefinition, ToolContext, ToolResponse } from '../types';
import { createServerClient } from '../../supabase/server';

interface UpsertInterviewArgs {
  guest_id: string;
  title: string;
  status?: 'scheduled' | 'recorded' | 'published' | 'archived';
  summary?: string;
  recorded_at?: string;
  published_at?: string;
  transcript_url?: string;
  audio_url?: string;
  video_url?: string;
}

export const interviewsUpsertInterview: ToolDefinition<UpsertInterviewArgs> = {
  name: 'interviews.upsert_interview',
  description: 'Create or update an interview record',
  version: '1.0.0',
  
  async execute(args: UpsertInterviewArgs, context: ToolContext): Promise<ToolResponse> {
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
    
    // Verify guest exists
    const { data: guest } = await supabase
      .from('guests')
      .select('id, name')
      .eq('id', args.guest_id)
      .single();
    
    if (!guest) {
      return {
        success: false,
        error: {
          code: 'GUEST_NOT_FOUND',
          message: `Guest with id ${args.guest_id} not found`,
        },
      };
    }
    
    // Check for existing interview by guest + title
    const { data: existing } = await supabase
      .from('interviews')
      .select('id')
      .eq('guest_id', args.guest_id)
      .eq('title', args.title)
      .single();
    
    let result;
    let action: 'created' | 'updated';
    
    if (existing) {
      const { data, error } = await supabase
        .from('interviews')
        .update({
          title: args.title,
          status: args.status,
          summary: args.summary,
          recorded_at: args.recorded_at,
          published_at: args.published_at,
          transcript_url: args.transcript_url,
          audio_url: args.audio_url,
          video_url: args.video_url,
        })
        .eq('id', existing.id)
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
        .from('interviews')
        .insert({
          guest_id: args.guest_id,
          title: args.title,
          status: args.status ?? 'scheduled',
          summary: args.summary,
          recorded_at: args.recorded_at,
          published_at: args.published_at,
          transcript_url: args.transcript_url,
          audio_url: args.audio_url,
          video_url: args.video_url,
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
      data: { ...result, guest_name: guest.name },
      explainability: {
        action,
        status: result.status,
        guest_name: guest.name,
      },
      writes: [
        {
          table: 'interviews',
          operation: action === 'created' ? 'insert' : 'update',
          id: result.id,
        },
      ],
    };
  },
};
