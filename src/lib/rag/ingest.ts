/**
 * Document Ingestion Pipeline for RAG
 * 
 * Orchestrates the process of ingesting documents:
 * 1. Fetch document content
 * 2. Chunk the text
 * 3. Generate embeddings
 * 4. Store in ai_chunks table
 */

import { createServiceClient } from '@/lib/supabase/server';
import { chunkText, type TextChunk } from './chunker';
import { embedTexts, formatEmbeddingForStorage } from './embedder';

export interface IngestOptions {
  /** Chunk size in characters */
  chunkSize?: number;
  /** Overlap between chunks */
  chunkOverlap?: number;
  /** Tags to apply to all chunks */
  tags?: string[];
  /** Pillar classification (health, wealth, connection) */
  pillar?: 'health' | 'wealth' | 'connection' | null;
}

export interface IngestResult {
  /** Document ID that was ingested */
  documentId: string;
  /** Number of chunks created */
  chunksCreated: number;
  /** Total tokens used for embeddings */
  tokensUsed: number;
  /** Whether ingestion succeeded */
  success: boolean;
  /** Error message if failed */
  error?: string;
}

/**
 * Ingest a document from ai_docs by ID.
 * Chunks the content, generates embeddings, and stores in ai_chunks.
 * 
 * @param documentId - UUID of the document in ai_docs
 * @param options - Ingestion configuration
 * @returns Ingestion result with stats
 */
export async function ingestDocument(
  documentId: string,
  options: IngestOptions = {}
): Promise<IngestResult> {
  const supabase = createServiceClient();
  
  try {
    // 1. Fetch the document
    const { data: doc, error: fetchError } = await supabase
      .from('ai_docs')
      .select('id, title, content, source_type, source_url, metadata')
      .eq('id', documentId)
      .single();

    if (fetchError || !doc) {
      return {
        documentId,
        chunksCreated: 0,
        tokensUsed: 0,
        success: false,
        error: fetchError?.message || 'Document not found',
      };
    }

    if (!doc.content || !doc.content.trim()) {
      // Update document status
      await supabase
        .from('ai_docs')
        .update({ processing_status: 'failed' })
        .eq('id', documentId);

      return {
        documentId,
        chunksCreated: 0,
        tokensUsed: 0,
        success: false,
        error: 'Document has no content',
      };
    }

    // 2. Delete existing chunks for this document (re-ingestion)
    await supabase
      .from('ai_chunks')
      .delete()
      .eq('source_id', documentId);

    // 3. Chunk the content
    const chunks = chunkText(doc.content, {
      chunkSize: options.chunkSize,
      chunkOverlap: options.chunkOverlap,
    });

    if (chunks.length === 0) {
      await supabase
        .from('ai_docs')
        .update({ 
          processing_status: 'completed',
          chunk_count: 0,
        })
        .eq('id', documentId);

      return {
        documentId,
        chunksCreated: 0,
        tokensUsed: 0,
        success: true,
      };
    }

    // 4. Generate embeddings for all chunks
    const chunkContents = chunks.map(c => c.content);
    const embeddingResult = await embedTexts(chunkContents);

    // 5. Prepare chunk records for insertion
    const chunkRecords = chunks.map((chunk, index) => ({
      source_id: documentId,
      content: chunk.content,
      chunk_index: chunk.index,
      embedding: formatEmbeddingForStorage(embeddingResult.embeddings[index]),
      pillar: options.pillar || null,
      tags: options.tags || [],
      metadata: {
        title: doc.title,
        source_type: doc.source_type,
        source_url: doc.source_url,
        chunk_index: chunk.index,
        total_chunks: chunks.length,
        start_offset: chunk.startOffset,
        end_offset: chunk.endOffset,
        ...chunk.metadata,
      },
    }));

    // 6. Insert chunks
    const { error: insertError } = await supabase
      .from('ai_chunks')
      .insert(chunkRecords);

    if (insertError) {
      await supabase
        .from('ai_docs')
        .update({ processing_status: 'failed' })
        .eq('id', documentId);

      return {
        documentId,
        chunksCreated: 0,
        tokensUsed: embeddingResult.totalTokens,
        success: false,
        error: `Failed to insert chunks: ${insertError.message}`,
      };
    }

    // 7. Update document status
    await supabase
      .from('ai_docs')
      .update({ 
        processing_status: 'completed',
        chunk_count: chunks.length,
      })
      .eq('id', documentId);

    return {
      documentId,
      chunksCreated: chunks.length,
      tokensUsed: embeddingResult.totalTokens,
      success: true,
    };

  } catch (error) {
    // Update document status to failed
    await supabase
      .from('ai_docs')
      .update({ processing_status: 'failed' })
      .eq('id', documentId)
      .catch(() => {}); // Ignore errors here

    return {
      documentId,
      chunksCreated: 0,
      tokensUsed: 0,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Ingest raw text directly (without ai_docs record).
 * Useful for ad-hoc content like interview transcripts.
 * 
 * @param content - The text content to ingest
 * @param metadata - Metadata for the chunks
 * @param options - Ingestion configuration
 * @returns Number of chunks created
 */
export async function ingestRawText(
  content: string,
  metadata: {
    title?: string;
    sourceType?: string;
    sourceId?: string;
    sourceUrl?: string;
  },
  options: IngestOptions = {}
): Promise<{ chunksCreated: number; tokensUsed: number }> {
  const supabase = createServiceClient();

  // Create a source document record first
  const { data: doc, error: docError } = await supabase
    .from('ai_docs')
    .insert({
      title: metadata.title || 'Untitled',
      source_type: metadata.sourceType || 'text',
      source_id: metadata.sourceId ? metadata.sourceId as unknown as string : null,
      source_url: metadata.sourceUrl,
      content,
      processing_status: 'processing',
    })
    .select('id')
    .single();

  if (docError || !doc) {
    throw new Error(`Failed to create document: ${docError?.message}`);
  }

  // Ingest the document
  const result = await ingestDocument(doc.id, options);
  
  if (!result.success) {
    throw new Error(result.error || 'Ingestion failed');
  }

  return {
    chunksCreated: result.chunksCreated,
    tokensUsed: result.tokensUsed,
  };
}

/**
 * Ingest all failed documents in ai_docs.
 * Useful for batch recovery.
 */
export async function ingestFailedDocuments(
  options: IngestOptions = {}
): Promise<{ processed: number; succeeded: number; failed: number }> {
  const supabase = createServiceClient();

  // Get all failed documents
  const { data: docs, error } = await supabase
    .from('ai_docs')
    .select('id')
    .eq('processing_status', 'failed')
    .limit(50); // Process in batches

  if (error || !docs) {
    throw new Error(`Failed to fetch documents: ${error?.message}`);
  }

  let succeeded = 0;
  let failed = 0;

  for (const doc of docs) {
    const result = await ingestDocument(doc.id, options);
    if (result.success) {
      succeeded++;
    } else {
      failed++;
    }
  }

  return {
    processed: docs.length,
    succeeded,
    failed,
  };
}

