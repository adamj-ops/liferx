/**
 * Text Chunking Utility for RAG
 * 
 * Splits documents into overlapping chunks for embedding and retrieval.
 * Uses character-based chunking with configurable size and overlap.
 */

export interface ChunkOptions {
  /** Target chunk size in characters (default: 1500 ~= 375 tokens) */
  chunkSize?: number;
  /** Overlap between chunks in characters (default: 200) */
  chunkOverlap?: number;
  /** Separator to try splitting on (default: paragraph/sentence boundaries) */
  separators?: string[];
}

export interface TextChunk {
  /** The chunk content */
  content: string;
  /** Zero-based index of this chunk */
  index: number;
  /** Character offset in original document */
  startOffset: number;
  /** Character offset end in original document */
  endOffset: number;
  /** Metadata about the chunk */
  metadata: {
    chunkSize: number;
    chunkOverlap: number;
    totalChunks?: number;
  };
}

const DEFAULT_OPTIONS: Required<ChunkOptions> = {
  chunkSize: 1500,
  chunkOverlap: 200,
  separators: ['\n\n', '\n', '. ', '! ', '? ', '; ', ', ', ' '],
};

/**
 * Split text on the first matching separator, preserving the separator.
 */
function splitOnSeparator(text: string, separators: string[]): string[] {
  for (const sep of separators) {
    if (text.includes(sep)) {
      const parts = text.split(sep);
      // Rejoin with separator attached to previous part (except last)
      return parts.reduce((acc: string[], part, i) => {
        if (i === parts.length - 1) {
          if (part.trim()) acc.push(part);
        } else {
          acc.push(part + sep);
        }
        return acc;
      }, []);
    }
  }
  // No separator found, return as single element
  return [text];
}

/**
 * Recursively split text into chunks respecting separators.
 */
function recursiveSplit(
  text: string,
  chunkSize: number,
  separators: string[]
): string[] {
  // Base case: text fits in chunk
  if (text.length <= chunkSize) {
    return text.trim() ? [text] : [];
  }

  // Try splitting on separators
  const parts = splitOnSeparator(text, separators);
  
  if (parts.length === 1) {
    // No separator worked, hard split at chunkSize
    const chunks: string[] = [];
    for (let i = 0; i < text.length; i += chunkSize) {
      const chunk = text.slice(i, i + chunkSize).trim();
      if (chunk) chunks.push(chunk);
    }
    return chunks;
  }

  // Merge parts into chunks that fit
  const chunks: string[] = [];
  let currentChunk = '';

  for (const part of parts) {
    if (currentChunk.length + part.length <= chunkSize) {
      currentChunk += part;
    } else {
      if (currentChunk.trim()) {
        chunks.push(currentChunk.trim());
      }
      // If part itself is too big, recursively split it
      if (part.length > chunkSize) {
        chunks.push(...recursiveSplit(part, chunkSize, separators.slice(1)));
        currentChunk = '';
      } else {
        currentChunk = part;
      }
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

/**
 * Create overlapping chunks from non-overlapping splits.
 */
function addOverlap(
  chunks: string[],
  chunkOverlap: number,
  originalText: string
): { content: string; startOffset: number; endOffset: number }[] {
  if (chunks.length === 0) return [];
  if (chunks.length === 1) {
    return [{
      content: chunks[0],
      startOffset: 0,
      endOffset: chunks[0].length,
    }];
  }

  const result: { content: string; startOffset: number; endOffset: number }[] = [];
  let currentOffset = 0;

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const startOffset = Math.max(0, currentOffset - (i > 0 ? chunkOverlap : 0));
    
    // Get overlap from previous chunk if not first
    let content = chunk;
    if (i > 0 && chunkOverlap > 0) {
      const prevChunk = chunks[i - 1];
      const overlapText = prevChunk.slice(-chunkOverlap);
      content = overlapText + chunk;
    }

    result.push({
      content,
      startOffset,
      endOffset: currentOffset + chunk.length,
    });

    currentOffset += chunk.length;
  }

  return result;
}

/**
 * Chunk text into overlapping segments for embedding.
 * 
 * @param text - The text to chunk
 * @param options - Chunking configuration
 * @returns Array of text chunks with metadata
 * 
 * @example
 * ```ts
 * const chunks = chunkText(documentContent, { chunkSize: 1000, chunkOverlap: 100 });
 * for (const chunk of chunks) {
 *   await embedAndStore(chunk.content);
 * }
 * ```
 */
export function chunkText(text: string, options: ChunkOptions = {}): TextChunk[] {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  if (!text || !text.trim()) {
    return [];
  }

  // Clean up text
  const cleanedText = text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .trim();

  // Split into non-overlapping chunks
  const rawChunks = recursiveSplit(cleanedText, opts.chunkSize - opts.chunkOverlap, opts.separators);
  
  // Add overlap
  const chunksWithOffsets = addOverlap(rawChunks, opts.chunkOverlap, cleanedText);

  // Build final chunks with metadata
  const totalChunks = chunksWithOffsets.length;
  
  return chunksWithOffsets.map((chunk, index) => ({
    content: chunk.content,
    index,
    startOffset: chunk.startOffset,
    endOffset: chunk.endOffset,
    metadata: {
      chunkSize: opts.chunkSize,
      chunkOverlap: opts.chunkOverlap,
      totalChunks,
    },
  }));
}

/**
 * Estimate token count for text (rough approximation).
 * OpenAI uses ~4 chars per token on average for English text.
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Chunk text with token-based sizing.
 */
export function chunkTextByTokens(
  text: string,
  options: { maxTokens?: number; overlapTokens?: number } = {}
): TextChunk[] {
  const { maxTokens = 500, overlapTokens = 50 } = options;
  
  // Convert tokens to approximate characters
  const chunkSize = maxTokens * 4;
  const chunkOverlap = overlapTokens * 4;
  
  return chunkText(text, { chunkSize, chunkOverlap });
}

