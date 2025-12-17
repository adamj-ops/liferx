/**
 * Tool: brain.search
 * Semantic search across the LifeRX knowledge base using vector similarity.
 * 
 * Uses OpenAI embeddings and pgvector for retrieval-augmented generation.
 */

import { ToolDefinition, ToolContext, ToolResponse } from '../types';
import { createServiceClient } from '../../supabase/server';
import { embedText } from '../../rag/embedder';

interface BrainSearchArgs {
  /** The search query */
  query: string;
  /** Maximum number of results to return (default: 5, max: 20) */
  limit?: number;
  /** Minimum similarity threshold 0-1 (default: 0.5) */
  threshold?: number;
  /** Filter by pillar (optional) */
  pillar?: 'health' | 'wealth' | 'connection';
  /** Filter by tags (optional) */
  tags?: string[];
}

interface SearchResult {
  /** Chunk content */
  content: string;
  /** Similarity score 0-1 */
  similarity: number;
  /** Source document info */
  source: {
    id: string | null;
    title: string | null;
    type: string | null;
    url: string | null;
  };
  /** Associated pillar */
  pillar: string | null;
  /** Tags */
  tags: string[];
}

export const brainSearch: ToolDefinition<BrainSearchArgs> = {
  name: 'brain.search',
  description: 'Search the LifeRX knowledge base using semantic similarity. Returns relevant content from documents, interviews, and stored knowledge.',
  version: '1.0.0',
  
  async execute(args: BrainSearchArgs, context: ToolContext): Promise<ToolResponse> {
    const supabase = createServiceClient();
    
    // Validate query
    if (!args.query || !args.query.trim()) {
      return {
        success: false,
        error: {
          code: 'INVALID_QUERY',
          message: 'Search query is required',
        },
      };
    }

    // Normalize parameters
    const limit = Math.min(Math.max(args.limit || 5, 1), 20);
    const threshold = Math.min(Math.max(args.threshold || 0.5, 0), 1);
    const query = args.query.trim();

    try {
      // 1. Generate embedding for the query
      const queryEmbedding = await embedText(query);
      
      // 2. Call the vector search RPC function
      const { data: matches, error: searchError } = await supabase
        .rpc('match_ai_chunks', {
          query_embedding: queryEmbedding.embedding,
          match_count: limit,
          match_threshold: threshold,
        });

      if (searchError) {
        console.error('[brain.search] Search error:', searchError);
        return {
          success: false,
          error: {
            code: 'SEARCH_FAILED',
            message: `Vector search failed: ${searchError.message}`,
          },
        };
      }

      // 3. Filter by pillar/tags if specified
      let results = matches || [];
      
      if (args.pillar) {
        results = results.filter((r: { pillar: string | null }) => r.pillar === args.pillar);
      }
      
      if (args.tags && args.tags.length > 0) {
        results = results.filter((r: { tags: string[] }) => 
          args.tags!.some(tag => r.tags?.includes(tag))
        );
      }

      // 4. Fetch source document details for context
      const sourceIds = [...new Set(results.map((r: { source_id: string }) => r.source_id).filter(Boolean))];
      let sourceMap: Record<string, { title: string; source_type: string; source_url: string }> = {};
      
      if (sourceIds.length > 0) {
        const { data: docs } = await supabase
          .from('ai_docs')
          .select('id, title, source_type, source_url')
          .in('id', sourceIds);
        
        if (docs) {
          sourceMap = Object.fromEntries(
            docs.map(d => [d.id, { title: d.title, source_type: d.source_type, source_url: d.source_url }])
          );
        }
      }

      // 5. Format results
      const formattedResults: SearchResult[] = results.map((r: {
        content: string;
        similarity: number;
        source_id: string;
        pillar: string | null;
        tags: string[];
        metadata: Record<string, unknown> | null;
      }) => {
        const source = sourceMap[r.source_id] || {};
        const metadata = r.metadata || {};
        
        return {
          content: r.content,
          similarity: Math.round(r.similarity * 100) / 100, // Round to 2 decimals
          source: {
            id: r.source_id || null,
            title: (source.title || metadata.title as string) || null,
            type: source.source_type || null,
            url: source.source_url || null,
          },
          pillar: r.pillar,
          tags: r.tags || [],
        };
      });

      // 6. Build explainability
      const explainability = {
        query_processed: query,
        embedding_model: 'text-embedding-3-small',
        similarity_threshold: threshold,
        results_requested: limit,
        results_returned: formattedResults.length,
        filters_applied: {
          pillar: args.pillar || null,
          tags: args.tags || null,
        },
        tokens_used: queryEmbedding.tokenCount,
      };

      return {
        success: true,
        data: {
          results: formattedResults,
          total: formattedResults.length,
          has_more: matches?.length === limit, // Might be more if we hit limit
        },
        explainability,
      };

    } catch (error) {
      console.error('[brain.search] Error:', error);
      return {
        success: false,
        error: {
          code: 'SEARCH_ERROR',
          message: error instanceof Error ? error.message : 'Unknown search error',
        },
      };
    }
  },
};

