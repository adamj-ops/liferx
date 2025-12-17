import { NextRequest, NextResponse } from 'next/server';
import { executeTool } from '@/lib/tools/executeTool';
import type { ToolContext } from '@/lib/tools/types';

const INTERNAL_SHARED_SECRET = process.env.INTERNAL_SHARED_SECRET;

interface ToolExecuteRequestBody {
  toolName: string;
  args?: unknown;
  context?: {
    org_id?: string;
    session_id?: string;
    user_id?: string;
    allowWrites?: boolean;
  };
}

/**
 * POST /api/tools/execute
 * 
 * Central tool execution endpoint called by the Agno Hub.
 * Authenticates via shared secret and executes registered tools.
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate the request
    const authResult = authenticateRequest(request);
    if (!authResult.authenticated) {
      return NextResponse.json(
        { error: authResult.error || 'Unauthorized' },
        { status: 401 }
      );
    }

    // 2. Parse request body
    const body: ToolExecuteRequestBody = await request.json();

    if (!body.toolName) {
      return NextResponse.json(
        { error: 'toolName is required' },
        { status: 400 }
      );
    }

    // 3. Build context
    const context: ToolContext = {
      org_id: body.context?.org_id ?? process.env.DEFAULT_ORG_ID ?? 'operator',
      session_id: body.context?.session_id,
      user_id: body.context?.user_id,
      allowWrites: body.context?.allowWrites ?? false,
    };

    // 4. Execute the tool
    const result = await executeTool(body.toolName, body.args ?? {}, context);

    // 5. Return result
    return NextResponse.json({
      success: result.success,
      data: result.data,
      error: result.error,
      explainability: result.explainability,
      writes: result.writes,
    });
  } catch (error) {
    console.error('[tools/execute] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      },
      { status: 500 }
    );
  }
}

/**
 * Authenticate the request using the shared internal secret.
 */
function authenticateRequest(
  request: NextRequest
): { authenticated: boolean; error?: string } {
  // Check for internal secret header
  const secretHeader = request.headers.get('x-internal-secret');

  if (!INTERNAL_SHARED_SECRET) {
    // If no secret is configured, allow in development only
    if (process.env.NODE_ENV === 'development') {
      console.warn('[tools/execute] No INTERNAL_SHARED_SECRET configured, allowing in development');
      return { authenticated: true };
    }
    return {
      authenticated: false,
      error: 'INTERNAL_SHARED_SECRET not configured',
    };
  }

  if (secretHeader !== INTERNAL_SHARED_SECRET) {
    return {
      authenticated: false,
      error: 'Invalid X-Internal-Secret header',
    };
  }

  return { authenticated: true };
}

/**
 * GET /api/tools/execute
 * 
 * Health check and tool list endpoint.
 */
export async function GET(request: NextRequest) {
  // Require auth for tool listing
  const authResult = authenticateRequest(request);
  if (!authResult.authenticated) {
    return NextResponse.json(
      { error: authResult.error || 'Unauthorized' },
      { status: 401 }
    );
  }

  // Import registry to get tool names
  const { getAllToolNames } = await import('@/lib/tools/registry');
  const tools = getAllToolNames();

  return NextResponse.json({
    status: 'ok',
    tools,
    count: tools.length,
  });
}
