/**
 * Tool: outreach.mark_sent
 * Marks a message as sent and schedules follow-up.
 */

import { ToolDefinition, ToolContext, ToolResponse } from '../types';
import { createServiceClient } from '../../supabase/server';
import { executeTool } from '../executeTool';

interface MarkSentArgs {
  message_id: string;
  provider_message_id?: string;
}

const DEFAULT_FOLLOWUP_DAYS = 7;

export const outreachMarkSent: ToolDefinition<MarkSentArgs> = {
  name: 'outreach.mark_sent',
  description: 'Mark an outreach message as sent and schedule follow-up',
  version: '1.0.0',

  async execute(args: MarkSentArgs, context: ToolContext): Promise<ToolResponse> {
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

    // 2. Validate input
    if (!args.message_id) {
      return {
        success: false,
        error: { code: 'INVALID_INPUT', message: 'message_id is required' },
      };
    }

    // 3. Fetch message with thread
    const { data: message, error: fetchError } = await supabase
      .from('outreach_messages')
      .select('id, org_id, thread_id, status, channel')
      .eq('id', args.message_id)
      .single();

    if (fetchError || !message) {
      return {
        success: false,
        error: { code: 'MESSAGE_NOT_FOUND', message: `Message ${args.message_id} not found` },
      };
    }

    // 4. Verify org ownership
    if (message.org_id !== context.org_id) {
      return {
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Message does not belong to this organization' },
      };
    }

    // 5. Validate status (should be queued)
    if (message.status !== 'queued' && message.status !== 'draft') {
      return {
        success: false,
        error: { 
          code: 'INVALID_STATE', 
          message: `Cannot mark message as sent with status '${message.status}'.` 
        },
      };
    }

    const now = new Date();
    const nowIso = now.toISOString();

    // 6. Update message
    const { error: updateMessageError } = await supabase
      .from('outreach_messages')
      .update({ 
        status: 'sent',
        sent_at: nowIso,
        provider_message_id: args.provider_message_id || null,
      })
      .eq('id', args.message_id);

    if (updateMessageError) {
      return {
        success: false,
        error: { code: 'DB_ERROR', message: updateMessageError.message },
      };
    }

    // 7. Update thread and schedule follow-up
    let followupId: string | null = null;
    const followupDate = new Date(now.getTime() + DEFAULT_FOLLOWUP_DAYS * 24 * 60 * 60 * 1000);
    const followupDateIso = followupDate.toISOString();

    if (message.thread_id) {
      // Get campaign config for custom followup timing
      const { data: thread } = await supabase
        .from('outreach_threads')
        .select('campaign_id')
        .eq('id', message.thread_id)
        .single();

      let configFollowupDays = DEFAULT_FOLLOWUP_DAYS;
      if (thread?.campaign_id) {
        const { data: campaign } = await supabase
          .from('outreach_campaigns')
          .select('config')
          .eq('id', thread.campaign_id)
          .single();

        if (campaign?.config && typeof campaign.config === 'object') {
          const config = campaign.config as Record<string, unknown>;
          if (typeof config.followup_days === 'number') {
            configFollowupDays = config.followup_days;
          }
        }
      }

      const configFollowupDate = new Date(now.getTime() + configFollowupDays * 24 * 60 * 60 * 1000);

      // Update thread
      const { error: updateThreadError } = await supabase
        .from('outreach_threads')
        .update({ 
          state: 'sent',
          last_event_at: nowIso,
          next_followup_at: configFollowupDate.toISOString(),
          updated_at: nowIso,
        })
        .eq('id', message.thread_id);

      if (updateThreadError) {
        console.warn('[outreach.mark_sent] Failed to update thread:', updateThreadError.message);
      }

      // Create followup
      const followupResult = await executeTool('followups.create_for_thread', {
        thread_id: message.thread_id,
        due_at: configFollowupDate.toISOString(),
        reason: 'Scheduled follow-up after message sent',
      }, context);

      if (followupResult.success && followupResult.data) {
        followupId = (followupResult.data as { followup_id: string }).followup_id;
      }
    }

    return {
      success: true,
      data: { ok: true },
      explainability: {
        action: 'marked_sent',
        message_id: args.message_id,
        thread_id: message.thread_id,
        provider_message_id: args.provider_message_id || null,
        sent_at: nowIso,
        followup_scheduled_for: followupDateIso,
        followup_id: followupId,
      },
      writes: [
        {
          table: 'outreach_messages',
          operation: 'update',
          id: args.message_id,
        },
        ...(message.thread_id ? [{
          table: 'outreach_threads' as const,
          operation: 'update' as const,
          id: message.thread_id,
        }] : []),
        ...(followupId ? [{
          table: 'followups' as const,
          operation: 'insert' as const,
          id: followupId,
        }] : []),
      ],
    };
  },
};

