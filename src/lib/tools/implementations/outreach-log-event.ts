/**
 * Tool: outreach.log_event
 * Logs an outreach activity
 */

import { ToolDefinition, ToolContext, ToolResponse } from '../types';
import { createServerClient } from '../../supabase/server';

interface LogOutreachArgs {
  guest_id?: string;
  prospect_id?: string;
  event_type: 'email_sent' | 'email_opened' | 'reply_received' | 'meeting_scheduled' | 'call_completed' | 'social_dm';
  channel: string;
  subject?: string;
  content?: string;
  status?: 'pending' | 'sent' | 'delivered' | 'opened' | 'replied' | 'bounced';
}

export const outreachLogEvent: ToolDefinition<LogOutreachArgs> = {
  name: 'outreach.log_event',
  description: 'Log an outreach activity',
  version: '1.0.0',
  
  async execute(args: LogOutreachArgs, context: ToolContext): Promise<ToolResponse> {
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
    
    // Validate at least one target
    if (!args.guest_id && !args.prospect_id) {
      return {
        success: false,
        error: {
          code: 'MISSING_TARGET',
          message: 'Either guest_id or prospect_id is required',
        },
      };
    }
    
    const { data, error } = await supabase
      .from('outreach_events')
      .insert({
        guest_id: args.guest_id,
        prospect_id: args.prospect_id,
        event_type: args.event_type,
        channel: args.channel,
        subject: args.subject,
        content: args.content,
        status: args.status ?? 'sent',
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
      data,
      explainability: {
        action: 'logged_outreach',
        event_type: args.event_type,
        channel: args.channel,
        target_type: args.guest_id ? 'guest' : 'prospect',
      },
      writes: [
        {
          table: 'outreach_events',
          operation: 'insert',
          id: data.id,
        },
      ],
    };
  },
};
