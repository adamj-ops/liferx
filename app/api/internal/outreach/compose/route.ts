/**
 * Internal API: Outreach Compose
 * 
 * Composes a personalized outreach message for a guest.
 * Protected by internal shared secret authentication.
 */

import { NextRequest, NextResponse } from 'next/server';
import { executeTool } from '@/lib/tools/executeTool';

const INTERNAL_SHARED_SECRET = process.env.INTERNAL_SHARED_SECRET;

/**
 * Authenticate internal API requests
 */
function authenticateRequest(request: NextRequest): { authorized: boolean; reason?: string } {
  // In development without secret, allow requests
  if (!INTERNAL_SHARED_SECRET) {
    if (process.env.NODE_ENV === 'development') {
      return { authorized: true };
    }
    return { authorized: false, reason: 'INTERNAL_SHARED_SECRET not configured' };
  }

  const secret = request.headers.get('X-Internal-Secret');
  if (!secret) {
    return { authorized: false, reason: 'Missing X-Internal-Secret header' };
  }

  if (secret !== INTERNAL_SHARED_SECRET) {
    return { authorized: false, reason: 'Invalid secret' };
  }

  return { authorized: true };
}

/**
 * POST /api/internal/outreach/compose
 * 
 * Body: {
 *   org_id: string;          // Required for tool execution
 *   guest_id: string;        // Guest to compose message for
 *   campaign_type: string;   // post_release | contributor_invite | followup
 *   channel: string;         // email | linkedin | instagram | x
 *   campaign_id?: string;    // Optional: use existing campaign
 *   quote_ids?: string[];    // Optional: specific quotes to reference
 *   theme_ids?: string[];    // Optional: specific themes to reference
 *   asset_ids?: string[];    // Optional: specific assets to include
 * }
 */
export async function POST(request: NextRequest) {
  // 1. Authenticate
  const auth = authenticateRequest(request);
  if (!auth.authorized) {
    return NextResponse.json(
      { error: 'Unauthorized', reason: auth.reason },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();

    // 2. Validate required fields
    if (!body.org_id) {
      return NextResponse.json(
        { error: 'Missing required field', message: 'org_id is required' },
        { status: 400 }
      );
    }

    if (!body.guest_id) {
      return NextResponse.json(
        { error: 'Missing required field', message: 'guest_id is required' },
        { status: 400 }
      );
    }

    if (!body.campaign_type) {
      return NextResponse.json(
        { error: 'Missing required field', message: 'campaign_type is required' },
        { status: 400 }
      );
    }

    if (!body.channel) {
      return NextResponse.json(
        { error: 'Missing required field', message: 'channel is required' },
        { status: 400 }
      );
    }

    // 3. Execute the compose tool
    const result = await executeTool('outreach.compose_message', {
      guest_id: body.guest_id,
      campaign_type: body.campaign_type,
      channel: body.channel,
      campaign_id: body.campaign_id,
      quote_ids: body.quote_ids,
      theme_ids: body.theme_ids,
      asset_ids: body.asset_ids,
    }, {
      org_id: body.org_id,
      allowWrites: true,
      session_id: body.session_id,
      user_id: body.user_id,
      metadata: {
        source: 'internal_api',
        endpoint: '/api/internal/outreach/compose',
      },
    });

    if (!result.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: result.error?.code || 'COMPOSE_FAILED',
          message: result.error?.message || 'Failed to compose message',
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.data,
      explainability: result.explainability,
    });

  } catch (error) {
    console.error('[outreach/compose] Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'INTERNAL_ERROR', 
        message: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/internal/outreach/compose - Health check
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    endpoint: '/api/internal/outreach/compose',
    methods: ['POST'],
    required_fields: ['org_id', 'guest_id', 'campaign_type', 'channel'],
    optional_fields: ['campaign_id', 'quote_ids', 'theme_ids', 'asset_ids'],
  });
}

