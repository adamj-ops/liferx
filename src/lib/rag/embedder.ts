/**
 * OpenAI Embedding Utilities for RAG
 * 
 * Generates embeddings using OpenAI's text-embedding-3-small model.
 * Supports single and batch embedding with rate limiting.
 */

import OpenAI from 'openai';

// Model configuration
const EMBEDDING_MODEL = 'text-embedding-3-small';
const EMBEDDING_DIMENSIONS = 1536; // Default for text-embedding-3-small
const MAX_BATCH_SIZE = 100; // OpenAI recommends max 2048 inputs, we use conservative limit
const MAX_TOKENS_PER_INPUT = 8191; // Model limit

export interface EmbeddingResult {
  /** The embedding vector */
  embedding: number[];
  /** Token count used */
  tokenCount: number;
  /** Model used */
  model: string;
}

export interface BatchEmbeddingResult {
  /** Array of embeddings in same order as input */
  embeddings: number[][];
  /** Total tokens used */
  totalTokens: number;
  /** Model used */
  model: string;
}

// Lazy-initialized OpenAI client
let openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is required for embeddings');
    }
    openaiClient = new OpenAI({ apiKey });
  }
  return openaiClient;
}

/**
 * Generate an embedding for a single text.
 * 
 * @param text - The text to embed
 * @returns Embedding result with vector and metadata
 * 
 * @example
 * ```ts
 * const result = await embedText("What is machine learning?");
 * console.log(result.embedding.length); // 1536
 * ```
 */
export async function embedText(text: string): Promise<EmbeddingResult> {
  if (!text || !text.trim()) {
    throw new Error('Cannot embed empty text');
  }

  const client = getOpenAIClient();
  
  const response = await client.embeddings.create({
    model: EMBEDDING_MODEL,
    input: text.trim(),
    dimensions: EMBEDDING_DIMENSIONS,
  });

  return {
    embedding: response.data[0].embedding,
    tokenCount: response.usage?.total_tokens ?? 0,
    model: EMBEDDING_MODEL,
  };
}

/**
 * Generate embeddings for multiple texts in a single API call.
 * More efficient than calling embedText multiple times.
 * 
 * @param texts - Array of texts to embed
 * @returns Batch embedding result with all vectors
 * 
 * @example
 * ```ts
 * const result = await embedTexts(["Text 1", "Text 2", "Text 3"]);
 * console.log(result.embeddings.length); // 3
 * ```
 */
export async function embedTexts(texts: string[]): Promise<BatchEmbeddingResult> {
  if (!texts.length) {
    return { embeddings: [], totalTokens: 0, model: EMBEDDING_MODEL };
  }

  const cleanedTexts = texts.map(t => t.trim()).filter(t => t.length > 0);
  
  if (cleanedTexts.length === 0) {
    return { embeddings: [], totalTokens: 0, model: EMBEDDING_MODEL };
  }

  const client = getOpenAIClient();
  
  // Process in batches if needed
  if (cleanedTexts.length <= MAX_BATCH_SIZE) {
    const response = await client.embeddings.create({
      model: EMBEDDING_MODEL,
      input: cleanedTexts,
      dimensions: EMBEDDING_DIMENSIONS,
    });

    // Sort by index to maintain order
    const sortedData = [...response.data].sort((a, b) => a.index - b.index);
    
    return {
      embeddings: sortedData.map(d => d.embedding),
      totalTokens: response.usage?.total_tokens ?? 0,
      model: EMBEDDING_MODEL,
    };
  }

  // Process in batches
  const allEmbeddings: number[][] = [];
  let totalTokens = 0;

  for (let i = 0; i < cleanedTexts.length; i += MAX_BATCH_SIZE) {
    const batch = cleanedTexts.slice(i, i + MAX_BATCH_SIZE);
    
    const response = await client.embeddings.create({
      model: EMBEDDING_MODEL,
      input: batch,
      dimensions: EMBEDDING_DIMENSIONS,
    });

    const sortedData = [...response.data].sort((a, b) => a.index - b.index);
    allEmbeddings.push(...sortedData.map(d => d.embedding));
    totalTokens += response.usage?.total_tokens ?? 0;

    // Small delay between batches to avoid rate limits
    if (i + MAX_BATCH_SIZE < cleanedTexts.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  return {
    embeddings: allEmbeddings,
    totalTokens,
    model: EMBEDDING_MODEL,
  };
}

/**
 * Format embedding vector for Supabase pgvector storage.
 * Converts number array to the format expected by pgvector.
 * 
 * @param embedding - The embedding vector
 * @returns Formatted string for pgvector or the array if your client handles it
 */
export function formatEmbeddingForStorage(embedding: number[]): string {
  // pgvector expects format: [0.1, 0.2, 0.3, ...]
  return `[${embedding.join(',')}]`;
}

/**
 * Validate that an embedding has the expected dimensions.
 */
export function validateEmbedding(embedding: number[]): boolean {
  return Array.isArray(embedding) && embedding.length === EMBEDDING_DIMENSIONS;
}

/**
 * Get embedding configuration info.
 */
export function getEmbeddingConfig() {
  return {
    model: EMBEDDING_MODEL,
    dimensions: EMBEDDING_DIMENSIONS,
    maxTokensPerInput: MAX_TOKENS_PER_INPUT,
    maxBatchSize: MAX_BATCH_SIZE,
  };
}

