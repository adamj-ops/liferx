/**
 * Tool: outreach.upsert_thread
 * Creates or updates an outreach thread for a guest in a campaign.
 */

import { ToolDefinition, ToolContext, ToolResponse } from '../types';
import { createServiceClient } from '../../supabase/server';

interface UpsertThreadArgs {
  campaign_id: string;
  guest_id: string;
  state?: 'draft' | 'queued' | 'sent' | 'replied' | 'bounced' | 'opted_out' | 'paused' | 'completed';
  next_followup_at?: string;
  metadata?: Record<string, unknown>;
}

const VALID_STATES = ['draft', 'queued', 'sent', 'replied', 'bounced', 'opted_out', 'paused', 'completed'];

export const outreachUpsertThread: ToolDefinition<UpsertThreadArgs> = {
  name: 'outreach.upsert_thread',
  description: 'Create or update an outreach thread for a guest in a campaign',
  version: '1.0.0',

  async execute(args: UpsertThreadArgs, context: ToolContext): Promise<ToolResponse> {
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
    if (!args.campaign_id) {
      return {
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'campaign_id is required',
        },
      };
    }

    if (!args.guest_id) {
      return {
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'guest_id is required',
        },
      };
    }

    if (args.state && !VALID_STATES.includes(args.state)) {
      return {
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: `Invalid state. Must be one of: ${VALID_STATES.join(', ')}`,
        },
      };
    }

    // 3. Verify campaign exists and belongs to org
    const { data: campaign, error: campaignError } = await supabase
      .from('outreach_campaigns')
      .select('id, org_id')
      .eq('id', args.campaign_id)
      .eq('org_id', context.org_id)
      .single();

    if (campaignError || !campaign) {
      return {
        success: false,
        error: {
          code: 'CAMPAIGN_NOT_FOUND',
          message: `Campaign ${args.campaign_id} not found or not accessible`,
        },
      };
    }

    // 4. Check if thread already exists
    const { data: existingThread } = await supabase
      .from('outreach_threads')
      .select('id, state')
      .eq('org_id', context.org_id)
      .eq('campaign_id', args.campaign_id)
      .eq('guest_id', args.guest_id)
      .single();

    const now = new Date().toISOString();
    let threadId: string;
    let action: 'created' | 'updated';
    let previousState: string | null = null;

    if (existingThread) {
      // Update existing thread
      previousState = existingThread.state;
      
      const updates: Record<string, unknown> = {
        updated_at: now,
      };

      if (args.state) {
        updates.state = args.state;
        updates.last_event_at = now;
      }
      if (args.next_followup_at !== undefined) {
        updates.next_followup_at = args.next_followup_at ? new Date(args.next_followup_at).toISOString() : null;
      }
      if (args.metadata) {
        updates.metadata = args.metadata;
      }

      const { error: updateError } = await supabase
        .from('outreach_threads')
        .update(updates)
        .eq('id', existingThread.id);

      if (updateError) {
        return {
          success: false,
          error: { code: 'DB_ERROR', message: updateError.message },
        };
      }

      threadId = existingThread.id;
      action = 'updated';
    } else {
      // Create new thread
      const { data: newThread, error: insertError } = await supabase
        .from('outreach_threads')
        .insert({
          org_id: context.org_id,
          campaign_id: args.campaign_id,
          guest_id: args.guest_id,
          state: args.state || 'draft',
          next_followup_at: args.next_followup_at ? new Date(args.next_followup_at).toISOString() : null,
          metadata: args.metadata || {},
          last_event_at: now,
        })
        .select('id')
        .single();

      if (insertError) {
        return {
          success: false,
          error: { code: 'DB_ERROR', message: insertError.message },
        };
      }

      threadId = newThread.id;
      action = 'created';
    }

    return {
      success: true,
      data: {
        thread_id: threadId,
      },
      explainability: {
        action,
        previous_state: previousState,
        new_state: args.state || (action === 'created' ? 'draft' : previousState),
        campaign_id: args.campaign_id,
        guest_id: args.guest_id,
      },
      writes: [
        {
          table: 'outreach_threads',
          operation: action === 'created' ? 'insert' : 'update',
          id: threadId,
        },
      ],
    };
  },
};

