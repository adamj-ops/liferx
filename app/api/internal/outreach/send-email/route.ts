/**
 * Internal API: Outreach Send Email
 * 
 * Sends a queued email message via Resend.
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
 * POST /api/internal/outreach/send-email
 * 
 * Body: {
 *   org_id: string;      // Required for tool execution
 *   message_id: string;  // Message to send
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

    if (!body.message_id) {
      return NextResponse.json(
        { error: 'Missing required field', message: 'message_id is required' },
        { status: 400 }
      );
    }

    // 3. Execute the send email tool
    const result = await executeTool('outreach.send_email', {
      message_id: body.message_id,
    }, {
      org_id: body.org_id,
      allowWrites: true,
      session_id: body.session_id,
      user_id: body.user_id,
      metadata: {
        source: 'internal_api',
        endpoint: '/api/internal/outreach/send-email',
      },
    });

    if (!result.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: result.error?.code || 'SEND_FAILED',
          message: result.error?.message || 'Failed to send email',
          explainability: result.explainability,
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
    console.error('[outreach/send-email] Error:', error);
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
 * GET /api/internal/outreach/send-email - Health check
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    endpoint: '/api/internal/outreach/send-email',
    methods: ['POST'],
    required_fields: ['org_id', 'message_id'],
    provider: 'resend',
    notes: 'Requires RESEND_API_KEY and OUTREACH_FROM_EMAIL environment variables',
  });
}

