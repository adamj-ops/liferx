/**
 * Search Result Post-Processor for RAG
 * 
 * Transforms raw search chunks into structured, usable evidence.
 * Groups by document, collapses overlapping chunks, extracts top quotes.
 */

/** Raw search result from brain.search */
export interface RawSearchResult {
  content: string;
  similarity: number;
  source: {
    id: string | null;
    title: string | null;
    type: string | null;
    url: string | null;
  };
  pillar: string | null;
  tags: string[];
}

/** A source document with its associated chunks */
export interface NormalizedSource {
  /** Document ID */
  document_id: string;
  /** Document title */
  title: string;
  /** Document type (interview, doc, etc.) */
  type: string;
  /** Document URL if available */
  url: string | null;
  /** Pillar if consistent across chunks */
  pillar: string | null;
  /** Combined chunks from this source */
  chunks: Array<{
    content: string;
    similarity: number;
  }>;
  /** Best quote from this source (highest similarity, shortest complete thought) */
  top_quote: string | null;
  /** Average similarity across chunks from this source */
  avg_similarity: number;
  /** All unique tags from chunks */
  tags: string[];
}

/** Summary statistics for the search */
export interface NormalizedSummary {
  /** Number of unique source documents */
  total_sources: number;
  /** Total chunks before collapsing */
  total_chunks: number;
  /** Chunks after collapsing overlaps */
  chunks_after_collapse: number;
  /** Average similarity across all results */
  avg_similarity: number;
  /** Unique pillars found */
  pillars: string[];
  /** Top 3 most common tags */
  top_tags: string[];
}

/** Fully normalized search result */
export interface NormalizedSearchResult {
  /** Sources grouped and processed */
  sources: NormalizedSource[];
  /** Summary statistics */
  summary: NormalizedSummary;
}

/**
 * Check if two chunks overlap significantly.
 * Uses simple substring matching for efficiency.
 */
function chunksOverlap(a: string, b: string, overlapThreshold = 0.3): boolean {
  const shorter = a.length < b.length ? a : b;
  const longer = a.length < b.length ? b : a;
  
  // Check if shorter is substring of longer
  if (longer.includes(shorter)) {
    return true;
  }
  
  // Check for significant word overlap
  const shorterWords = new Set(shorter.toLowerCase().split(/\s+/));
  const longerWords = longer.toLowerCase().split(/\s+/);
  
  let matchCount = 0;
  for (const word of longerWords) {
    if (shorterWords.has(word)) {
      matchCount++;
    }
  }
  
  const overlapRatio = matchCount / shorterWords.size;
  return overlapRatio > overlapThreshold;
}

/**
 * Collapse overlapping chunks into a single representative chunk.
 * Keeps the one with highest similarity.
 */
function collapseOverlappingChunks(
  chunks: Array<{ content: string; similarity: number }>
): Array<{ content: string; similarity: number }> {
  if (chunks.length <= 1) return chunks;
  
  // Sort by similarity descending
  const sorted = [...chunks].sort((a, b) => b.similarity - a.similarity);
  const result: Array<{ content: string; similarity: number }> = [];
  const used = new Set<number>();
  
  for (let i = 0; i < sorted.length; i++) {
    if (used.has(i)) continue;
    
    const current = sorted[i];
    result.push(current);
    
    // Mark overlapping chunks as used
    for (let j = i + 1; j < sorted.length; j++) {
      if (!used.has(j) && chunksOverlap(current.content, sorted[j].content)) {
        used.add(j);
      }
    }
  }
  
  return result;
}

/**
 * Extract the best quote from chunk content.
 * Looks for complete sentences with good length.
 */
function extractTopQuote(content: string): string | null {
  // Split into sentences
  const sentences = content.match(/[^.!?]+[.!?]+/g) || [];
  
  if (sentences.length === 0) {
    // No clear sentences, return first 150 chars with ellipsis
    if (content.length > 150) {
      return content.slice(0, 147).trim() + '...';
    }
    return content.trim() || null;
  }
  
  // Find the best sentence (not too short, not too long)
  const goodSentences = sentences
    .map(s => s.trim())
    .filter(s => s.length >= 30 && s.length <= 300);
  
  if (goodSentences.length > 0) {
    // Return the first good sentence (usually the most relevant)
    return goodSentences[0];
  }
  
  // Fallback to first sentence
  return sentences[0].trim();
}

/**
 * Normalize raw search results into structured evidence.
 * 
 * @param results - Raw search results from brain.search
 * @returns Normalized results grouped by source with summary
 * 
 * @example
 * ```ts
 * const normalized = normalizeSearchResults(rawResults);
 * console.log(normalized.sources[0].top_quote);
 * console.log(normalized.summary.avg_similarity);
 * ```
 */
export function normalizeSearchResults(results: RawSearchResult[]): NormalizedSearchResult {
  if (results.length === 0) {
    return {
      sources: [],
      summary: {
        total_sources: 0,
        total_chunks: 0,
        chunks_after_collapse: 0,
        avg_similarity: 0,
        pillars: [],
        top_tags: [],
      },
    };
  }

  // Group by source document
  const sourceMap = new Map<string, {
    title: string;
    type: string;
    url: string | null;
    pillar: string | null;
    chunks: Array<{ content: string; similarity: number }>;
    tags: Set<string>;
  }>();

  for (const result of results) {
    const sourceId = result.source.id || 'unknown';
    
    if (!sourceMap.has(sourceId)) {
      sourceMap.set(sourceId, {
        title: result.source.title || 'Untitled',
        type: result.source.type || 'unknown',
        url: result.source.url,
        pillar: result.pillar,
        chunks: [],
        tags: new Set(),
      });
    }
    
    const source = sourceMap.get(sourceId)!;
    source.chunks.push({
      content: result.content,
      similarity: result.similarity,
    });
    
    // Collect unique tags
    for (const tag of result.tags) {
      source.tags.add(tag);
    }
    
    // Update pillar if different (mark as mixed)
    if (source.pillar !== result.pillar && result.pillar) {
      source.pillar = null; // Mixed pillars
    }
  }

  // Process each source
  const sources: NormalizedSource[] = [];
  const allPillars = new Set<string>();
  const tagCounts = new Map<string, number>();
  let totalChunksAfterCollapse = 0;

  for (const [docId, source] of sourceMap) {
    // Collapse overlapping chunks
    const collapsedChunks = collapseOverlappingChunks(source.chunks);
    totalChunksAfterCollapse += collapsedChunks.length;
    
    // Calculate average similarity
    const avgSimilarity = collapsedChunks.reduce((sum, c) => sum + c.similarity, 0) / collapsedChunks.length;
    
    // Extract top quote from highest similarity chunk
    const topChunk = collapsedChunks[0]; // Already sorted by similarity
    const topQuote = topChunk ? extractTopQuote(topChunk.content) : null;
    
    // Track pillars
    if (source.pillar) {
      allPillars.add(source.pillar);
    }
    
    // Track tag counts
    for (const tag of source.tags) {
      tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
    }
    
    sources.push({
      document_id: docId,
      title: source.title,
      type: source.type,
      url: source.url,
      pillar: source.pillar,
      chunks: collapsedChunks,
      top_quote: topQuote,
      avg_similarity: Math.round(avgSimilarity * 100) / 100,
      tags: Array.from(source.tags),
    });
  }

  // Sort sources by average similarity
  sources.sort((a, b) => b.avg_similarity - a.avg_similarity);

  // Calculate overall stats
  const allSimilarities = results.map(r => r.similarity);
  const overallAvgSimilarity = allSimilarities.reduce((sum, s) => sum + s, 0) / allSimilarities.length;

  // Get top 3 tags by frequency
  const topTags = Array.from(tagCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([tag]) => tag);

  return {
    sources,
    summary: {
      total_sources: sources.length,
      total_chunks: results.length,
      chunks_after_collapse: totalChunksAfterCollapse,
      avg_similarity: Math.round(overallAvgSimilarity * 100) / 100,
      pillars: Array.from(allPillars),
      top_tags: topTags,
    },
  };
}

