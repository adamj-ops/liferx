/**
 * Tool: outreach.create_campaign
 * Creates a new outreach campaign.
 */

import { ToolDefinition, ToolContext, ToolResponse } from '../types';
import { createServiceClient } from '../../supabase/server';

interface CreateCampaignArgs {
  name: string;
  type: 'post_release' | 'contributor_invite' | 'followup' | 'custom';
  config?: Record<string, unknown>;
}

const VALID_TYPES = ['post_release', 'contributor_invite', 'followup', 'custom'];

export const outreachCreateCampaign: ToolDefinition<CreateCampaignArgs> = {
  name: 'outreach.create_campaign',
  description: 'Create a new outreach campaign',
  version: '1.0.0',

  async execute(args: CreateCampaignArgs, context: ToolContext): Promise<ToolResponse> {
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
    if (!args.name || args.name.trim().length === 0) {
      return {
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'Campaign name is required',
        },
      };
    }

    if (!args.type || !VALID_TYPES.includes(args.type)) {
      return {
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: `Invalid campaign type. Must be one of: ${VALID_TYPES.join(', ')}`,
        },
      };
    }

    // 3. Insert campaign
    const { data: campaign, error: insertError } = await supabase
      .from('outreach_campaigns')
      .insert({
        org_id: context.org_id,
        name: args.name.trim(),
        type: args.type,
        config: args.config || {},
        status: 'active',
      })
      .select('id')
      .single();

    if (insertError) {
      return {
        success: false,
        error: { code: 'DB_ERROR', message: insertError.message },
      };
    }

    return {
      success: true,
      data: {
        campaign_id: campaign.id,
      },
      explainability: {
        action: 'created_campaign',
        campaign_name: args.name.trim(),
        campaign_type: args.type,
        status: 'active',
      },
      writes: [
        {
          table: 'outreach_campaigns',
          operation: 'insert',
          id: campaign.id,
        },
      ],
    };
  },
};

