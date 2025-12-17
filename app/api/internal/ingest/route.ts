/**
 * Internal API: Document Ingestion
 * 
 * Triggers document ingestion for RAG.
 * Protected by internal shared secret authentication.
 */

import { NextRequest, NextResponse } from 'next/server';
import { ingestDocument, ingestFailedDocuments } from '@/lib/rag/ingest';

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
 * POST /api/internal/ingest
 * 
 * Body options:
 * - { documentId: string } - Ingest a specific document
 * - { action: "ingest_failed" } - Re-ingest all failed documents
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

    // Handle ingest_failed action
    if (body.action === 'ingest_failed') {
      const result = await ingestFailedDocuments({
        chunkSize: body.chunkSize,
        chunkOverlap: body.chunkOverlap,
        tags: body.tags,
        pillar: body.pillar,
      });

      return NextResponse.json({
        success: true,
        action: 'ingest_failed',
        ...result,
      });
    }

    // Handle single document ingestion
    if (body.documentId) {
      const result = await ingestDocument(body.documentId, {
        chunkSize: body.chunkSize,
        chunkOverlap: body.chunkOverlap,
        tags: body.tags,
        pillar: body.pillar,
      });

      return NextResponse.json(result);
    }

    return NextResponse.json(
      { error: 'Invalid request', message: 'Provide documentId or action: "ingest_failed"' },
      { status: 400 }
    );

  } catch (error) {
    console.error('[ingest] Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Ingestion failed', 
        message: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/internal/ingest - Health check
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    endpoint: '/api/internal/ingest',
    methods: ['POST'],
    actions: ['ingest_failed', 'documentId'],
  });
}

