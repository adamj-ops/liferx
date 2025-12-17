import { NextRequest, NextResponse } from 'next/server';
import { executeTool } from '@/lib/tools/executeTool';
import type { ToolContext } from '@/lib/tools/types';
import { getEffectiveOrgId, isValidUUID } from '@/lib/constants';

const INTERNAL_SHARED_SECRET = process.env.INTERNAL_SHARED_SECRET;

// Startup configuration logging
let toolsStartupLogged = false;
function logToolsStartup() {
  if (toolsStartupLogged) return;
  toolsStartupLogged = true;
  
  console.log('[tools/execute] Configuration status:', {
    INTERNAL_SHARED_SECRET: INTERNAL_SHARED_SECRET ? '✓ configured' : '✗ MISSING (allow dev only)',
    SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? '✓ configured' : '✗ MISSING',
    SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? '✓ configured' : '✗ MISSING',
    NODE_ENV: process.env.NODE_ENV,
  });
}

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
  logToolsStartup();
  
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

    // 3. Validate and build context
    const providedOrgId = body.context?.org_id;
    
    // Validate org_id if provided - must be a valid UUID
    if (providedOrgId && !isValidUUID(providedOrgId)) {
      return NextResponse.json(
        { 
          success: false,
          error: {
            code: 'INVALID_ORG_ID',
            message: 'org_id must be a valid UUID',
          },
        },
        { status: 400 }
      );
    }
    
    const context: ToolContext = {
      org_id: getEffectiveOrgId(providedOrgId),
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
