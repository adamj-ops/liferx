import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { ingestDocument } from '@/lib/rag/ingest';

const ACCEPTED_TYPES = [
  'application/pdf',
  'text/plain',
  'text/markdown',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * POST /api/knowledge/upload
 *
 * Handles file uploads to the knowledge base.
 * Creates ai_docs record, extracts text content, and triggers ingestion.
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided', message: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!ACCEPTED_TYPES.includes(file.type)) {
      return NextResponse.json(
        {
          error: 'Invalid file type',
          message: `Invalid file type: ${file.type}. Accepted: PDF, TXT, MD, DOCX`,
        },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          error: 'File too large',
          message: `File too large. Maximum size: ${MAX_FILE_SIZE / 1024 / 1024}MB`,
        },
        { status: 400 }
      );
    }

    // Extract text content based on file type
    let content: string;
    const fileName = file.name;
    const fileExtension = fileName.split('.').pop()?.toLowerCase();

    if (fileExtension === 'txt' || fileExtension === 'md') {
      // Plain text files
      content = await file.text();
    } else if (fileExtension === 'pdf') {
      // PDF files - extract text
      content = await extractPdfText(file);
    } else if (fileExtension === 'docx') {
      // DOCX files - extract text
      content = await extractDocxText(file);
    } else {
      return NextResponse.json(
        { error: 'Unsupported file type', message: 'Unsupported file type' },
        { status: 400 }
      );
    }

    if (!content || !content.trim()) {
      return NextResponse.json(
        { error: 'Empty document', message: 'Document has no extractable text content' },
        { status: 400 }
      );
    }

    // Create document record in ai_docs
    const supabase = createServiceClient();

    const { data: doc, error: insertError } = await supabase
      .from('ai_docs')
      .insert({
        title: fileName,
        content,
        source_type: 'upload',
        source_url: null,
        processing_status: 'processing',
        metadata: {
          original_filename: fileName,
          file_type: file.type,
          file_size: file.size,
          uploaded_at: new Date().toISOString(),
        },
      })
      .select('id')
      .single();

    if (insertError || !doc) {
      console.error('[upload] Failed to create document:', insertError);
      return NextResponse.json(
        { error: 'Database error', message: 'Failed to create document record' },
        { status: 500 }
      );
    }

    // Trigger ingestion (async - don't wait for completion)
    ingestDocument(doc.id).catch((error) => {
      console.error('[upload] Ingestion failed for document:', doc.id, error);
    });

    return NextResponse.json({
      success: true,
      documentId: doc.id,
      message: 'Document uploaded and queued for processing',
    });

  } catch (error) {
    console.error('[upload] Error:', error);
    return NextResponse.json(
      {
        error: 'Upload failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * Extract text from PDF file.
 * Note: This is a basic implementation. For production, consider using
 * a library like pdf-parse or a service like Adobe PDF Services.
 */
async function extractPdfText(file: File): Promise<string> {
  // For now, we'll use a simple approach
  // In production, you'd want to use pdf-parse or similar
  try {
    // Try to import pdf-parse if available
    const pdfParseModule = await import('pdf-parse').catch(() => null);

    if (pdfParseModule) {
      const buffer = Buffer.from(await file.arrayBuffer());
      // Handle both ESM and CJS exports - cast through unknown for type safety
      const pdfParse = (typeof pdfParseModule === 'function' 
        ? pdfParseModule 
        : (pdfParseModule as { default?: unknown }).default || pdfParseModule) as unknown as (buffer: Buffer) => Promise<{ text: string }>;
      const data = await pdfParse(buffer);
      return data.text;
    }

    // Fallback: return a message indicating PDF parsing isn't available
    throw new Error('PDF parsing not available. Please install pdf-parse: npm install pdf-parse');
  } catch (error) {
    console.error('[extractPdfText] Error:', error);
    throw new Error('Failed to extract text from PDF');
  }
}

/**
 * Extract text from DOCX file.
 * Note: This is a basic implementation. For production, consider using
 * a library like mammoth or docx-parser.
 */
async function extractDocxText(file: File): Promise<string> {
  try {
    // Try to import mammoth if available
    const mammoth = await import('mammoth').catch(() => null);

    if (mammoth) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const result = await mammoth.extractRawText({ buffer });
      return result.value;
    }

    // Fallback: return a message indicating DOCX parsing isn't available
    throw new Error('DOCX parsing not available. Please install mammoth: npm install mammoth');
  } catch (error) {
    console.error('[extractDocxText] Error:', error);
    throw new Error('Failed to extract text from DOCX');
  }
}
