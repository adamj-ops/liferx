/**
 * Internal API: Theme Scanner Job Trigger
 * 
 * POST /api/internal/jobs/theme-scan
 * 
 * Protected by X-Internal-Secret header.
 * Runs the theme scanner background job.
 */

import { NextRequest, NextResponse } from 'next/server';
import { runThemeScanner, ThemeScannerInput, ThemeScannerResult } from '@/jobs/themeScanner';

const INTERNAL_SECRET = process.env.INTERNAL_SHARED_SECRET;

// UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(req: NextRequest): Promise<NextResponse> {
  // Validate internal secret
  const providedSecret = req.headers.get('X-Internal-Secret');
  if (!INTERNAL_SECRET || providedSecret !== INTERNAL_SECRET) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  let body: Partial<ThemeScannerInput>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400 }
    );
  }

  // Validate org_id
  if (!body.org_id) {
    return NextResponse.json(
      { error: 'org_id is required' },
      { status: 400 }
    );
  }

  if (!UUID_REGEX.test(body.org_id)) {
    return NextResponse.json(
      { error: 'org_id must be a valid UUID' },
      { status: 400 }
    );
  }

  // Build input with defaults
  const input: ThemeScannerInput = {
    org_id: body.org_id,
    lookback_days: body.lookback_days ?? 30,
    max_interviews: body.max_interviews ?? 50,
    dry_run: body.dry_run ?? false,
  };

  try {
    const result: ThemeScannerResult = await runThemeScanner(input);
    
    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error) {
    console.error('[theme-scan] Job failed:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * Health check / info endpoint
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  // Validate internal secret
  const providedSecret = req.headers.get('X-Internal-Secret');
  if (!INTERNAL_SECRET || providedSecret !== INTERNAL_SECRET) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  return NextResponse.json({
    job: 'theme-scanner',
    version: '1.0.0',
    description: 'Scans recent interviews for recurring themes',
    parameters: {
      org_id: { type: 'uuid', required: true },
      lookback_days: { type: 'number', default: 30 },
      max_interviews: { type: 'number', default: 50 },
      dry_run: { type: 'boolean', default: false },
    },
    caps: {
      max_themes_per_run: 20,
      max_links_per_theme: 20,
    },
  });
}

