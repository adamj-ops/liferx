/**
 * Pipeline 3: Content Repurposing Engine
 * 
 * Coordinator function that orchestrates content generation workflow:
 * 1. guest_id → content.generate_post_ideas
 * 2. theme_id → content.generate_carousel_outline
 * 3. interview_id → content.generate_quote_card (top quotes) + content.generate_shortform_script
 * 
 * Each step:
 * - Logs results
 * - Respects allowWrites
 * - Fails gracefully (partial success allowed)
 */

import { executeTool } from '../lib/tools/executeTool';
import type { ToolContext, ToolResponse } from '../lib/tools/types';
import { createServiceClient } from '../lib/supabase/server';

export interface ContentRepurposingInput {
  /** Organization ID (UUID) */
  org_id: string;
  /** Session ID for audit trail */
  session_id?: string;
  /** User ID for audit trail */
  user_id?: string;
  /** Whether to allow write operations */
  allowWrites: boolean;
  /** Guest ID to generate post ideas from */
  guest_id?: string;
  /** Interview ID to generate quote cards and scripts from */
  interview_id?: string;
  /** Theme ID to generate carousel outline from */
  theme_id?: string;
  /** Maximum quote cards to generate from interview (default: 3) */
  max_quote_cards?: number;
}

export interface PipelineStepResult {
  step: string;
  tool: string;
  success: boolean;
  data?: unknown;
  error?: { code: string; message: string };
  explainability?: unknown;
  duration_ms: number;
}

export interface ContentRepurposingResult {
  success: boolean;
  steps: PipelineStepResult[];
  summary: {
    total_steps: number;
    successful_steps: number;
    failed_steps: number;
    quote_cards_created?: number;
    carousels_created?: number;
    scripts_created?: number;
    post_ideas_created?: number;
    assets_created: string[];
  };
  total_duration_ms: number;
}

/**
 * Run the Content Repurposing pipeline.
 * 
 * @param input Pipeline input configuration
 * @returns Pipeline result with per-step details and summary
 */
export async function runContentRepurposingPipeline(
  input: ContentRepurposingInput
): Promise<ContentRepurposingResult> {
  const startTime = Date.now();
  const steps: PipelineStepResult[] = [];
  const assetsCreated: string[] = [];
  
  const context: ToolContext = {
    org_id: input.org_id,
    session_id: input.session_id,
    user_id: input.user_id,
    allowWrites: input.allowWrites,
  };

  console.log(`[ContentRepurposing] Starting pipeline`);
  console.log(`[ContentRepurposing] allowWrites=${input.allowWrites}, guest_id=${input.guest_id || 'none'}, interview_id=${input.interview_id || 'none'}, theme_id=${input.theme_id || 'none'}`);

  // Summary tracking
  let quoteCardsCreated = 0;
  let carouselsCreated = 0;
  let scriptsCreated = 0;
  let postIdeasCreated = 0;

  // =========================================================================
  // STEP: Generate post ideas from guest
  // =========================================================================
  if (input.guest_id) {
    const stepStart = Date.now();
    let stepResult: ToolResponse;

    try {
      console.log('[ContentRepurposing] Running content.generate_post_ideas for guest');
      stepResult = await executeTool('content.generate_post_ideas', {
        guest_id: input.guest_id,
        max_ideas: 5,
      }, context);

      if (stepResult.success && stepResult.data) {
        const data = stepResult.data as { asset_ids?: string[]; ideas_created?: number };
        postIdeasCreated = data.ideas_created ?? data.asset_ids?.length ?? 0;
        if (data.asset_ids) {
          assetsCreated.push(...data.asset_ids);
        }
        console.log('[ContentRepurposing] Post ideas success:', data);
      } else {
        console.error('[ContentRepurposing] Post ideas failed:', stepResult.error);
      }
    } catch (err) {
      stepResult = {
        success: false,
        error: {
          code: 'EXCEPTION',
          message: err instanceof Error ? err.message : 'Unknown error',
        },
      };
      console.error('[ContentRepurposing] Post ideas exception:', err);
    }

    steps.push({
      step: 'generate_post_ideas',
      tool: 'content.generate_post_ideas',
      success: stepResult.success,
      data: stepResult.data,
      error: stepResult.error,
      explainability: stepResult.explainability,
      duration_ms: Date.now() - stepStart,
    });
  }

  // =========================================================================
  // STEP: Generate carousel outline from theme
  // =========================================================================
  if (input.theme_id) {
    const stepStart = Date.now();
    let stepResult: ToolResponse;

    try {
      console.log('[ContentRepurposing] Running content.generate_carousel_outline for theme');
      stepResult = await executeTool('content.generate_carousel_outline', {
        theme_id: input.theme_id,
      }, context);

      if (stepResult.success && stepResult.data) {
        const data = stepResult.data as { asset_id?: string };
        carouselsCreated = 1;
        if (data.asset_id) {
          assetsCreated.push(data.asset_id);
        }
        console.log('[ContentRepurposing] Carousel success:', data);
      } else {
        console.error('[ContentRepurposing] Carousel failed:', stepResult.error);
      }
    } catch (err) {
      stepResult = {
        success: false,
        error: {
          code: 'EXCEPTION',
          message: err instanceof Error ? err.message : 'Unknown error',
        },
      };
      console.error('[ContentRepurposing] Carousel exception:', err);
    }

    steps.push({
      step: 'generate_carousel_outline',
      tool: 'content.generate_carousel_outline',
      success: stepResult.success,
      data: stepResult.data,
      error: stepResult.error,
      explainability: stepResult.explainability,
      duration_ms: Date.now() - stepStart,
    });
  }

  // =========================================================================
  // STEP: Generate quote cards and shortform script from interview
  // =========================================================================
  if (input.interview_id) {
    const supabase = createServiceClient();
    const maxQuoteCards = input.max_quote_cards ?? 3;

    // Fetch top quotes for this interview
    const { data: topQuotes } = await supabase
      .from('interview_quotes')
      .select('id, quote, pillar, tone')
      .eq('interview_id', input.interview_id)
      .order('created_at', { ascending: false })
      .limit(maxQuoteCards);

    if (topQuotes && topQuotes.length > 0) {
      // Generate quote cards for each quote
      for (let i = 0; i < topQuotes.length; i++) {
        const quote = topQuotes[i];
        const stepStart = Date.now();
        let stepResult: ToolResponse;

        try {
          console.log(`[ContentRepurposing] Running content.generate_quote_card for quote ${i + 1}/${topQuotes.length}`);
          stepResult = await executeTool('content.generate_quote_card', {
            quote_id: quote.id,
          }, context);

          if (stepResult.success && stepResult.data) {
            const data = stepResult.data as { asset_id?: string };
            quoteCardsCreated++;
            if (data.asset_id) {
              assetsCreated.push(data.asset_id);
            }
            console.log('[ContentRepurposing] Quote card success:', data);
          } else {
            console.error('[ContentRepurposing] Quote card failed:', stepResult.error);
          }
        } catch (err) {
          stepResult = {
            success: false,
            error: {
              code: 'EXCEPTION',
              message: err instanceof Error ? err.message : 'Unknown error',
            },
          };
          console.error('[ContentRepurposing] Quote card exception:', err);
        }

        steps.push({
          step: `generate_quote_card_${i + 1}`,
          tool: 'content.generate_quote_card',
          success: stepResult.success,
          data: stepResult.data,
          error: stepResult.error,
          explainability: stepResult.explainability,
          duration_ms: Date.now() - stepStart,
        });
      }

      // Generate shortform script from the best quote
      const bestQuote = topQuotes[0];
      const scriptStepStart = Date.now();
      let scriptStepResult: ToolResponse;

      try {
        console.log('[ContentRepurposing] Running content.generate_shortform_script');
        scriptStepResult = await executeTool('content.generate_shortform_script', {
          quote_id: bestQuote.id,
          // Also pass theme if available
          theme_id: input.theme_id,
        }, context);

        if (scriptStepResult.success && scriptStepResult.data) {
          const data = scriptStepResult.data as { asset_id?: string };
          scriptsCreated = 1;
          if (data.asset_id) {
            assetsCreated.push(data.asset_id);
          }
          console.log('[ContentRepurposing] Shortform script success:', data);
        } else {
          console.error('[ContentRepurposing] Shortform script failed:', scriptStepResult.error);
        }
      } catch (err) {
        scriptStepResult = {
          success: false,
          error: {
            code: 'EXCEPTION',
            message: err instanceof Error ? err.message : 'Unknown error',
          },
        };
        console.error('[ContentRepurposing] Shortform script exception:', err);
      }

      steps.push({
        step: 'generate_shortform_script',
        tool: 'content.generate_shortform_script',
        success: scriptStepResult.success,
        data: scriptStepResult.data,
        error: scriptStepResult.error,
        explainability: scriptStepResult.explainability,
        duration_ms: Date.now() - scriptStepStart,
      });
    } else {
      console.log('[ContentRepurposing] No quotes found for interview, skipping quote-based content');
    }
  }

  // =========================================================================
  // Build result summary
  // =========================================================================
  const successfulSteps = steps.filter(s => s.success).length;
  const failedSteps = steps.filter(s => !s.success).length;
  const totalDuration = Date.now() - startTime;

  console.log(`[ContentRepurposing] Pipeline complete: ${successfulSteps}/${steps.length} steps succeeded in ${totalDuration}ms`);
  console.log(`[ContentRepurposing] Assets created: ${assetsCreated.length} (${quoteCardsCreated} quote cards, ${carouselsCreated} carousels, ${scriptsCreated} scripts, ${postIdeasCreated} post ideas)`);

  return {
    success: failedSteps === 0 || successfulSteps > 0, // Partial success is OK
    steps,
    summary: {
      total_steps: steps.length,
      successful_steps: successfulSteps,
      failed_steps: failedSteps,
      quote_cards_created: quoteCardsCreated,
      carousels_created: carouselsCreated,
      scripts_created: scriptsCreated,
      post_ideas_created: postIdeasCreated,
      assets_created: assetsCreated,
    },
    total_duration_ms: totalDuration,
  };
}

/**
 * Run the Content Repurposing pipeline on multiple sources.
 * 
 * @param sources Array of source configurations
 * @param orgId Organization UUID
 * @param options Additional options
 * @returns Array of pipeline results
 */
export async function runBatchContentRepurposing(
  sources: Array<{ guest_id?: string; interview_id?: string; theme_id?: string }>,
  orgId: string,
  options: {
    allowWrites: boolean;
    max_quote_cards?: number;
    session_id?: string;
    user_id?: string;
  }
): Promise<ContentRepurposingResult[]> {
  const results: ContentRepurposingResult[] = [];

  console.log(`[ContentRepurposing] Starting batch processing for ${sources.length} sources`);

  for (const source of sources) {
    const result = await runContentRepurposingPipeline({
      org_id: orgId,
      allowWrites: options.allowWrites,
      max_quote_cards: options.max_quote_cards,
      session_id: options.session_id,
      user_id: options.user_id,
      ...source,
    });
    results.push(result);
  }

  const totalSuccessful = results.filter(r => r.success).length;
  console.log(`[ContentRepurposing] Batch complete: ${totalSuccessful}/${results.length} sources processed successfully`);

  return results;
}

