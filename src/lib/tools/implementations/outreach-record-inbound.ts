/**
 * Tool: outreach.record_inbound
 * Records an inbound message/reply from a guest.
 */

import { ToolDefinition, ToolContext, ToolResponse } from '../types';
import { createServiceClient } from '../../supabase/server';

interface RecordInboundArgs {
  thread_id: string;
  channel: string;
  body: string;
}

export const outreachRecordInbound: ToolDefinition<RecordInboundArgs> = {
  name: 'outreach.record_inbound',
  description: 'Record an inbound message/reply from a guest',
  version: '1.0.0',

  async execute(args: RecordInboundArgs, context: ToolContext): Promise<ToolResponse> {
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

    // 2. Validate inputs
    if (!args.thread_id) {
      return {
        success: false,
        error: { code: 'INVALID_INPUT', message: 'thread_id is required' },
      };
    }

    if (!args.body || args.body.trim().length === 0) {
      return {
        success: false,
        error: { code: 'INVALID_INPUT', message: 'body is required' },
      };
    }

    if (!args.channel) {
      return {
        success: false,
        error: { code: 'INVALID_INPUT', message: 'channel is required' },
      };
    }

    // 3. Fetch thread
    const { data: thread, error: fetchError } = await supabase
      .from('outreach_threads')
      .select('id, org_id, guest_id, state')
      .eq('id', args.thread_id)
      .single();

    if (fetchError || !thread) {
      return {
        success: false,
        error: { code: 'THREAD_NOT_FOUND', message: `Thread ${args.thread_id} not found` },
      };
    }

    // 4. Verify org ownership
    if (thread.org_id !== context.org_id) {
      return {
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Thread does not belong to this organization' },
      };
    }

    const now = new Date().toISOString();
    const previousState = thread.state;

    // 5. Insert inbound message
    const { data: insertedMessage, error: insertError } = await supabase
      .from('outreach_messages')
      .insert({
        org_id: context.org_id,
        thread_id: args.thread_id,
        guest_id: thread.guest_id,
        direction: 'inbound',
        channel: args.channel,
        body: args.body.trim(),
        status: 'replied',
      })
      .select('id')
      .single();

    if (insertError) {
      return {
        success: false,
        error: { code: 'DB_ERROR', message: insertError.message },
      };
    }

    // 6. Update thread state
    const { error: updateThreadError } = await supabase
      .from('outreach_threads')
      .update({ 
        state: 'replied',
        last_event_at: now,
        next_followup_at: null, // Clear scheduled followup
        updated_at: now,
      })
      .eq('id', args.thread_id);

    if (updateThreadError) {
      console.warn('[outreach.record_inbound] Failed to update thread:', updateThreadError.message);
    }

    return {
      success: true,
      data: {
        inbound_message_id: insertedMessage.id,
      },
      explainability: {
        action: 'recorded_inbound',
        thread_id: args.thread_id,
        channel: args.channel,
        previous_state: previousState,
        new_state: 'replied',
        followup_cleared: true,
      },
      writes: [
        {
          table: 'outreach_messages',
          operation: 'insert',
          id: insertedMessage.id,
        },
        {
          table: 'outreach_threads',
          operation: 'update',
          id: args.thread_id,
        },
      ],
    };
  },
};

