/**
 * Pipeline 2: Interview Intelligence & Theme Mining
 * 
 * Coordinator function that orchestrates the interview intelligence workflow:
 * 1. interviews.auto_tag - Automatically tag interview with industries, expertise, pillars, tones
 * 2. interviews.extract_defining_quotes - Extract reusable quotes from transcript
 * 3. interviews.build_semantic_index - Make interview searchable via RAG
 * 4. (Optional) Theme Scanner - Identify themes across interviews
 * 
 * Each step:
 * - Logs results
 * - Respects allowWrites
 * - Fails gracefully (partial success allowed)
 */

import { executeTool } from '../lib/tools/executeTool';
import type { ToolContext, ToolResponse } from '../lib/tools/types';
import { runThemeScanner } from '../jobs/themeScanner';

export interface InterviewIntelligenceInput {
  /** UUID of the interview to process */
  interview_id: string;
  /** Organization ID (UUID) */
  org_id: string;
  /** Session ID for audit trail */
  session_id?: string;
  /** User ID for audit trail */
  user_id?: string;
  /** Whether to allow write operations */
  allowWrites: boolean;
  /** Whether to trigger Theme Scanner after processing (default: false) */
  runThemeScanner?: boolean;
  /** Maximum quotes to extract (default: 5) */
  max_quotes?: number;
}

export interface PipelineStepResult {
  step: string;
  success: boolean;
  data?: unknown;
  error?: { code: string; message: string };
  explainability?: unknown;
  duration_ms: number;
}

export interface InterviewIntelligenceResult {
  success: boolean;
  interview_id: string;
  steps: PipelineStepResult[];
  summary: {
    total_steps: number;
    successful_steps: number;
    failed_steps: number;
    tags_applied?: boolean;
    quotes_created?: number;
    chunks_created?: number;
    themes_scanned?: boolean;
  };
  total_duration_ms: number;
}

/**
 * Run the Interview Intelligence pipeline on a single interview.
 * 
 * @param input Pipeline input configuration
 * @returns Pipeline result with per-step details and summary
 */
export async function runInterviewIntelligencePipeline(
  input: InterviewIntelligenceInput
): Promise<InterviewIntelligenceResult> {
  const startTime = Date.now();
  const steps: PipelineStepResult[] = [];
  
  const context: ToolContext = {
    org_id: input.org_id,
    session_id: input.session_id,
    user_id: input.user_id,
    allowWrites: input.allowWrites,
  };

  console.log(`[InterviewIntelligence] Starting pipeline for interview ${input.interview_id}`);
  console.log(`[InterviewIntelligence] allowWrites=${input.allowWrites}, runThemeScanner=${input.runThemeScanner ?? false}`);

  // Summary tracking
  let tagsApplied = false;
  let quotesCreated = 0;
  let chunksCreated = 0;
  let themesScanned = false;

  // =========================================================================
  // STEP 1: Auto-tag interview
  // =========================================================================
  const step1Start = Date.now();
  let step1Result: ToolResponse;
  
  try {
    console.log('[InterviewIntelligence] Step 1: Running interviews.auto_tag');
    step1Result = await executeTool('interviews.auto_tag', {
      interview_id: input.interview_id,
    }, context);
    
    if (step1Result.success) {
      tagsApplied = input.allowWrites;
      console.log('[InterviewIntelligence] Step 1: Success', step1Result.data);
    } else {
      console.error('[InterviewIntelligence] Step 1: Failed', step1Result.error);
    }
  } catch (err) {
    step1Result = {
      success: false,
      error: {
        code: 'EXCEPTION',
        message: err instanceof Error ? err.message : 'Unknown error',
      },
    };
    console.error('[InterviewIntelligence] Step 1: Exception', err);
  }
  
  steps.push({
    step: 'auto_tag',
    success: step1Result.success,
    data: step1Result.data,
    error: step1Result.error,
    explainability: step1Result.explainability,
    duration_ms: Date.now() - step1Start,
  });

  // =========================================================================
  // STEP 2: Extract defining quotes
  // =========================================================================
  const step2Start = Date.now();
  let step2Result: ToolResponse;
  
  try {
    console.log('[InterviewIntelligence] Step 2: Running interviews.extract_defining_quotes');
    step2Result = await executeTool('interviews.extract_defining_quotes', {
      interview_id: input.interview_id,
      max_quotes: input.max_quotes ?? 5,
    }, context);
    
    if (step2Result.success) {
      const data = step2Result.data as { quotes_created?: number } | undefined;
      quotesCreated = data?.quotes_created ?? 0;
      console.log('[InterviewIntelligence] Step 2: Success', step2Result.data);
    } else {
      console.error('[InterviewIntelligence] Step 2: Failed', step2Result.error);
    }
  } catch (err) {
    step2Result = {
      success: false,
      error: {
        code: 'EXCEPTION',
        message: err instanceof Error ? err.message : 'Unknown error',
      },
    };
    console.error('[InterviewIntelligence] Step 2: Exception', err);
  }
  
  steps.push({
    step: 'extract_defining_quotes',
    success: step2Result.success,
    data: step2Result.data,
    error: step2Result.error,
    explainability: step2Result.explainability,
    duration_ms: Date.now() - step2Start,
  });

  // =========================================================================
  // STEP 3: Build semantic index
  // =========================================================================
  const step3Start = Date.now();
  let step3Result: ToolResponse;
  
  try {
    console.log('[InterviewIntelligence] Step 3: Running interviews.build_semantic_index');
    step3Result = await executeTool('interviews.build_semantic_index', {
      interview_id: input.interview_id,
    }, context);
    
    if (step3Result.success) {
      const data = step3Result.data as { chunks_created?: number } | undefined;
      chunksCreated = data?.chunks_created ?? 0;
      console.log('[InterviewIntelligence] Step 3: Success', step3Result.data);
    } else {
      console.error('[InterviewIntelligence] Step 3: Failed', step3Result.error);
    }
  } catch (err) {
    step3Result = {
      success: false,
      error: {
        code: 'EXCEPTION',
        message: err instanceof Error ? err.message : 'Unknown error',
      },
    };
    console.error('[InterviewIntelligence] Step 3: Exception', err);
  }
  
  steps.push({
    step: 'build_semantic_index',
    success: step3Result.success,
    data: step3Result.data,
    error: step3Result.error,
    explainability: step3Result.explainability,
    duration_ms: Date.now() - step3Start,
  });

  // =========================================================================
  // STEP 4 (Optional): Theme Scanner
  // =========================================================================
  if (input.runThemeScanner && input.allowWrites) {
    const step4Start = Date.now();
    let step4Success = false;
    let step4Error: { code: string; message: string } | undefined;
    let step4Data: unknown;
    
    try {
      console.log('[InterviewIntelligence] Step 4: Running Theme Scanner');
      const scanResult = await runThemeScanner({
        org_id: input.org_id,
        dry_run: !input.allowWrites,
        interview_ids: [input.interview_id],
      });
      
      step4Success = true;
      step4Data = {
        themes_found: scanResult.themes.length,
        themes_created: scanResult.themes_created,
        themes_updated: scanResult.themes_updated,
      };
      themesScanned = true;
      console.log('[InterviewIntelligence] Step 4: Success', step4Data);
    } catch (err) {
      step4Error = {
        code: 'EXCEPTION',
        message: err instanceof Error ? err.message : 'Unknown error',
      };
      console.error('[InterviewIntelligence] Step 4: Exception', err);
    }
    
    steps.push({
      step: 'theme_scanner',
      success: step4Success,
      data: step4Data,
      error: step4Error,
      duration_ms: Date.now() - step4Start,
    });
  }

  // =========================================================================
  // Build result summary
  // =========================================================================
  const successfulSteps = steps.filter(s => s.success).length;
  const failedSteps = steps.filter(s => !s.success).length;
  const totalDuration = Date.now() - startTime;

  console.log(`[InterviewIntelligence] Pipeline complete: ${successfulSteps}/${steps.length} steps succeeded in ${totalDuration}ms`);

  return {
    success: failedSteps === 0,
    interview_id: input.interview_id,
    steps,
    summary: {
      total_steps: steps.length,
      successful_steps: successfulSteps,
      failed_steps: failedSteps,
      tags_applied: tagsApplied,
      quotes_created: quotesCreated,
      chunks_created: chunksCreated,
      themes_scanned: themesScanned,
    },
    total_duration_ms: totalDuration,
  };
}

/**
 * Run the Interview Intelligence pipeline on multiple interviews.
 * 
 * @param interviewIds Array of interview UUIDs to process
 * @param orgId Organization UUID
 * @param options Additional options
 * @returns Array of pipeline results (one per interview)
 */
export async function runBatchInterviewIntelligence(
  interviewIds: string[],
  orgId: string,
  options: {
    allowWrites: boolean;
    runThemeScanner?: boolean;
    max_quotes?: number;
    session_id?: string;
    user_id?: string;
  }
): Promise<InterviewIntelligenceResult[]> {
  const results: InterviewIntelligenceResult[] = [];

  console.log(`[InterviewIntelligence] Starting batch processing for ${interviewIds.length} interviews`);

  for (const interviewId of interviewIds) {
    const result = await runInterviewIntelligencePipeline({
      interview_id: interviewId,
      org_id: orgId,
      allowWrites: options.allowWrites,
      runThemeScanner: options.runThemeScanner,
      max_quotes: options.max_quotes,
      session_id: options.session_id,
      user_id: options.user_id,
    });
    results.push(result);
  }

  const totalSuccessful = results.filter(r => r.success).length;
  console.log(`[InterviewIntelligence] Batch complete: ${totalSuccessful}/${results.length} interviews processed successfully`);

  return results;
}

