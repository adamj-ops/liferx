/**
 * Tool: interviews.build_semantic_index
 * Ensure interviews are discoverable via RAG.
 * 
 * Chunks transcript, generates embeddings, and ingests into ai_chunks
 * with interview_id, guest_id, and org_id metadata.
 */

import type { ToolDefinition, ToolContext, ToolResponse } from '../types';
import { createServiceClient } from '../../supabase/server';
import { chunkText } from '../../rag/chunker';
import { embedTexts, formatEmbeddingForStorage } from '../../rag/embedder';

interface BuildSemanticIndexArgs {
  interview_id: string;
}

export const interviewsBuildSemanticIndex: ToolDefinition<BuildSemanticIndexArgs> = {
  name: 'interviews.build_semantic_index',
  description: 'Build a semantic index for an interview to make it discoverable via RAG search',
  version: '1.0.0',

  async execute(args: BuildSemanticIndexArgs, context: ToolContext): Promise<ToolResponse> {
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

    // 2. Fetch the interview
    const { data: interview, error: fetchError } = await supabase
      .from('interviews')
      .select('id, title, transcript, raw_transcript, guest_id, org_id, pillars, industries, expertise')
      .eq('id', args.interview_id)
      .single();

    if (fetchError || !interview) {
      return {
        success: false,
        error: {
          code: 'INTERVIEW_NOT_FOUND',
          message: `Interview with id ${args.interview_id} not found`,
        },
      };
    }

    // Use transcript or fall back to raw_transcript
    const transcript = interview.transcript || interview.raw_transcript;
    if (!transcript || transcript.trim().length < 50) {
      return {
        success: false,
        error: {
          code: 'INSUFFICIENT_CONTENT',
          message: 'Interview transcript is too short for indexing (minimum 50 characters)',
        },
      };
    }

    // 3. Create or get the source document in ai_docs
    const docTitle = interview.title || `Interview ${args.interview_id}`;
    
    // Check if doc already exists for this interview
    const { data: existingDoc } = await supabase
      .from('ai_docs')
      .select('id')
      .eq('source_id', args.interview_id)
      .eq('source_type', 'interview')
      .single();

    let docId: string;

    if (existingDoc) {
      // Update existing doc
      docId = existingDoc.id;
      await supabase
        .from('ai_docs')
        .update({
          title: docTitle,
          content: transcript,
          processing_status: 'processing',
          org_id: context.org_id,
        })
        .eq('id', docId);

      // Delete existing chunks for re-indexing
      await supabase
        .from('ai_chunks')
        .delete()
        .eq('source_id', docId);
    } else {
      // Create new doc
      const { data: newDoc, error: docError } = await supabase
        .from('ai_docs')
        .insert({
          title: docTitle,
          source_type: 'interview',
          source_id: args.interview_id,
          content: transcript,
          processing_status: 'processing',
          org_id: context.org_id,
        })
        .select('id')
        .single();

      if (docError || !newDoc) {
        return {
          success: false,
          error: {
            code: 'DB_ERROR',
            message: `Failed to create document: ${docError?.message}`,
          },
        };
      }
      docId = newDoc.id;
    }

    // 4. Chunk the transcript
    const chunks = chunkText(transcript, {
      chunkSize: 1000,
      chunkOverlap: 100,
    });

    if (chunks.length === 0) {
      await supabase
        .from('ai_docs')
        .update({ 
          processing_status: 'completed',
          chunk_count: 0,
        })
        .eq('id', docId);

      return {
        success: true,
        data: { chunks_created: 0 },
        explainability: {
          action: 'indexed',
          reason: 'Transcript too short to produce chunks',
        },
      };
    }

    // 5. Generate embeddings
    const chunkContents = chunks.map(c => c.content);
    let embeddingResult;
    try {
      embeddingResult = await embedTexts(chunkContents);
    } catch (embedError) {
      await supabase
        .from('ai_docs')
        .update({ processing_status: 'failed' })
        .eq('id', docId);

      return {
        success: false,
        error: {
          code: 'EMBEDDING_ERROR',
          message: embedError instanceof Error ? embedError.message : 'Failed to generate embeddings',
        },
      };
    }

    // 6. Build tags from interview metadata
    const tags: string[] = [];
    
    // Add interview_id as tag for filtering
    tags.push(`interview:${args.interview_id}`);
    
    // Add guest_id if available
    if (interview.guest_id) {
      tags.push(`guest:${interview.guest_id}`);
    }

    // Add pillars as tags
    if (interview.pillars && Array.isArray(interview.pillars)) {
      for (const pillar of interview.pillars) {
        tags.push(`pillar:${pillar.toLowerCase()}`);
      }
    }

    // Add industries as tags
    if (interview.industries && Array.isArray(interview.industries)) {
      for (const industry of interview.industries.slice(0, 5)) {
        tags.push(`industry:${industry}`);
      }
    }

    // 7. Prepare chunk records for insertion
    const chunkRecords = chunks.map((chunk, index) => ({
      source_id: docId,
      content: chunk.content,
      chunk_index: chunk.index,
      embedding: formatEmbeddingForStorage(embeddingResult.embeddings[index]),
      org_id: context.org_id,
      interview_id: args.interview_id,
      guest_id: interview.guest_id || null,
      tags,
      pillar: interview.pillars?.[0]?.toLowerCase() || null,
      metadata: {
        title: docTitle,
        source_type: 'interview',
        interview_id: args.interview_id,
        guest_id: interview.guest_id,
        chunk_index: chunk.index,
        total_chunks: chunks.length,
        start_offset: chunk.startOffset,
        end_offset: chunk.endOffset,
      },
    }));

    // 8. Insert chunks
    const { error: insertError } = await supabase
      .from('ai_chunks')
      .insert(chunkRecords);

    if (insertError) {
      await supabase
        .from('ai_docs')
        .update({ processing_status: 'failed' })
        .eq('id', docId);

      return {
        success: false,
        error: {
          code: 'DB_ERROR',
          message: `Failed to insert chunks: ${insertError.message}`,
        },
      };
    }

    // 9. Update document status
    await supabase
      .from('ai_docs')
      .update({ 
        processing_status: 'completed',
        chunk_count: chunks.length,
      })
      .eq('id', docId);

    return {
      success: true,
      data: {
        chunks_created: chunks.length,
      },
      explainability: {
        action: 'indexed',
        doc_id: docId,
        interview_id: args.interview_id,
        guest_id: interview.guest_id,
        chunks_created: chunks.length,
        tokens_used: embeddingResult.totalTokens,
        tags_applied: tags,
      },
      writes: [
        {
          table: 'ai_docs',
          operation: existingDoc ? 'update' : 'insert',
          id: docId,
        },
        ...chunkRecords.map((_, i) => ({
          table: 'ai_chunks' as const,
          operation: 'insert' as const,
          id: `chunk-${i}`,
        })),
      ],
    };
  },
};

