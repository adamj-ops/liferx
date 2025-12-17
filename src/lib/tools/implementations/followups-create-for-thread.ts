/**
 * Tool: followups.create_for_thread
 * Creates a follow-up task linked to an outreach thread.
 */

import { ToolDefinition, ToolContext, ToolResponse } from '../types';
import { createServiceClient } from '../../supabase/server';

interface CreateForThreadArgs {
  thread_id: string;
  due_at: string;
  reason: string;
}

export const followupsCreateForThread: ToolDefinition<CreateForThreadArgs> = {
  name: 'followups.create_for_thread',
  description: 'Create a follow-up task for an outreach thread',
  version: '1.0.0',

  async execute(args: CreateForThreadArgs, context: ToolContext): Promise<ToolResponse> {
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

    if (!args.due_at) {
      return {
        success: false,
        error: { code: 'INVALID_INPUT', message: 'due_at is required' },
      };
    }

    const dueDate = new Date(args.due_at);
    if (isNaN(dueDate.getTime())) {
      return {
        success: false,
        error: { code: 'INVALID_DATE', message: `Invalid due_at date: ${args.due_at}` },
      };
    }

    if (!args.reason || args.reason.trim().length === 0) {
      return {
        success: false,
        error: { code: 'INVALID_INPUT', message: 'reason is required' },
      };
    }

    // 3. Verify thread exists and get org_id
    const { data: thread, error: threadError } = await supabase
      .from('outreach_threads')
      .select('id, org_id')
      .eq('id', args.thread_id)
      .single();

    if (threadError || !thread) {
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

    // 5. Insert followup with both new and legacy fields
    const { data: followup, error: insertError } = await supabase
      .from('followups')
      .insert({
        org_id: context.org_id,
        thread_id: args.thread_id,
        due_at: dueDate.toISOString(),
        status: 'open',
        reason: args.reason.trim(),
        // Legacy fields for backward compatibility
        related_type: 'outreach',
        related_id: args.thread_id,
        action: 'follow_up',
        priority: 'medium',
      })
      .select('id')
      .single();

    if (insertError) {
      return {
        success: false,
        error: { code: 'DB_ERROR', message: insertError.message },
      };
    }

    // Calculate days until due
    const daysUntilDue = Math.ceil((dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

    return {
      success: true,
      data: {
        followup_id: followup.id,
      },
      explainability: {
        action: 'created_followup',
        thread_id: args.thread_id,
        due_at: dueDate.toISOString(),
        days_until_due: daysUntilDue,
        reason: args.reason.trim(),
      },
      writes: [
        {
          table: 'followups',
          operation: 'insert',
          id: followup.id,
        },
      ],
    };
  },
};

