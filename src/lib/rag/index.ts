/**
 * RAG (Retrieval-Augmented Generation) Module
 * 
 * Provides utilities for document ingestion, chunking, embedding, and semantic search.
 */

// Chunking utilities
export {
  chunkText,
  chunkTextByTokens,
  estimateTokens,
  type ChunkOptions,
  type TextChunk,
} from './chunker';

// Embedding utilities
export {
  embedText,
  embedTexts,
  formatEmbeddingForStorage,
  validateEmbedding,
  getEmbeddingConfig,
  type EmbeddingResult,
  type BatchEmbeddingResult,
} from './embedder';

// Ingestion pipeline
export {
  ingestDocument,
  ingestRawText,
  ingestFailedDocuments,
  type IngestOptions,
  type IngestResult,
} from './ingest';

// Result post-processing
export {
  normalizeSearchResults,
  type RawSearchResult,
  type NormalizedSource,
  type NormalizedSummary,
  type NormalizedSearchResult,
} from './normalizer';

