/**
 * Tool: outreach.queue_send
 * Moves a draft message into the send queue.
 */

import { ToolDefinition, ToolContext, ToolResponse } from '../types';
import { createServiceClient } from '../../supabase/server';

interface QueueSendArgs {
  message_id: string;
}

export const outreachQueueSend: ToolDefinition<QueueSendArgs> = {
  name: 'outreach.queue_send',
  description: 'Queue a draft outreach message for sending',
  version: '1.0.0',

  async execute(args: QueueSendArgs, context: ToolContext): Promise<ToolResponse> {
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

    // 3. Fetch message
    const { data: message, error: fetchError } = await supabase
      .from('outreach_messages')
      .select('id, org_id, thread_id, status, direction')
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

    // 5. Validate status
    if (message.status !== 'draft') {
      return {
        success: false,
        error: { 
          code: 'INVALID_STATE', 
          message: `Cannot queue message with status '${message.status}'. Only draft messages can be queued.` 
        },
      };
    }

    // 6. Update message status
    const now = new Date().toISOString();
    
    const { error: updateMessageError } = await supabase
      .from('outreach_messages')
      .update({ status: 'queued' })
      .eq('id', args.message_id);

    if (updateMessageError) {
      return {
        success: false,
        error: { code: 'DB_ERROR', message: updateMessageError.message },
      };
    }

    // 7. Update thread state if thread exists
    if (message.thread_id) {
      const { error: updateThreadError } = await supabase
        .from('outreach_threads')
        .update({ 
          state: 'queued',
          last_event_at: now,
          updated_at: now,
        })
        .eq('id', message.thread_id);

      if (updateThreadError) {
        console.warn('[outreach.queue_send] Failed to update thread:', updateThreadError.message);
      }
    }

    return {
      success: true,
      data: { ok: true },
      explainability: {
        action: 'queued_message',
        message_id: args.message_id,
        thread_id: message.thread_id,
        previous_status: 'draft',
        new_status: 'queued',
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
      ],
    };
  },
};

