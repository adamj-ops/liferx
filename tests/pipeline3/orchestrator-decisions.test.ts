/**
 * Tests for Pipeline 3 orchestrator decision logic
 */

import { describe, it, expect } from 'vitest';

/**
 * Represents a tool call that would be made by the orchestrator
 */
interface ToolCall {
  tool: string;
  args: Record<string, unknown>;
}

/**
 * Simulates the orchestrator's decision logic for which tools to invoke
 * based on the provided input. This mirrors the logic in contentRepurposing.ts.
 */
function decideToolsToRun(input: {
  guest_id?: string;
  interview_id?: string;
  theme_id?: string;
  max_quote_cards?: number;
  quoteIdsForInterview?: string[]; // Simulates DB query result
}): ToolCall[] {
  const toolCalls: ToolCall[] = [];

  // guest_id → content.generate_post_ideas
  if (input.guest_id) {
    toolCalls.push({
      tool: 'content.generate_post_ideas',
      args: {
        guest_id: input.guest_id,
        max_ideas: 5,
      },
    });
  }

  // theme_id → content.generate_carousel_outline
  if (input.theme_id) {
    toolCalls.push({
      tool: 'content.generate_carousel_outline',
      args: {
        theme_id: input.theme_id,
      },
    });
  }

  // interview_id → quote cards + shortform script
  if (input.interview_id && input.quoteIdsForInterview && input.quoteIdsForInterview.length > 0) {
    const maxQuoteCards = input.max_quote_cards ?? 3;
    const quotesToProcess = input.quoteIdsForInterview.slice(0, maxQuoteCards);

    // Generate quote cards for each quote
    for (const quoteId of quotesToProcess) {
      toolCalls.push({
        tool: 'content.generate_quote_card',
        args: {
          quote_id: quoteId,
        },
      });
    }

    // Generate shortform script from the best quote
    const bestQuoteId = quotesToProcess[0];
    toolCalls.push({
      tool: 'content.generate_shortform_script',
      args: {
        quote_id: bestQuoteId,
        theme_id: input.theme_id, // Pass along if available
      },
    });
  }

  return toolCalls;
}

describe('Orchestrator Decision Logic', () => {
  describe('guest_id handling', () => {
    it('should invoke post ideas tool for guest_id', () => {
      const toolCalls = decideToolsToRun({ guest_id: 'guest-123' });
      
      expect(toolCalls).toHaveLength(1);
      expect(toolCalls[0].tool).toBe('content.generate_post_ideas');
      expect(toolCalls[0].args.guest_id).toBe('guest-123');
    });
  });

  describe('theme_id handling', () => {
    it('should invoke carousel tool for theme_id', () => {
      const toolCalls = decideToolsToRun({ theme_id: 'theme-123' });
      
      expect(toolCalls).toHaveLength(1);
      expect(toolCalls[0].tool).toBe('content.generate_carousel_outline');
      expect(toolCalls[0].args.theme_id).toBe('theme-123');
    });
  });

  describe('interview_id handling', () => {
    it('should invoke quote card and shortform tools for interview with quotes', () => {
      const toolCalls = decideToolsToRun({
        interview_id: 'interview-123',
        quoteIdsForInterview: ['quote-1', 'quote-2', 'quote-3'],
      });
      
      // 3 quote cards + 1 shortform script
      expect(toolCalls).toHaveLength(4);
      
      // Check quote card calls
      const quoteCardCalls = toolCalls.filter(c => c.tool === 'content.generate_quote_card');
      expect(quoteCardCalls).toHaveLength(3);
      expect(quoteCardCalls[0].args.quote_id).toBe('quote-1');
      expect(quoteCardCalls[1].args.quote_id).toBe('quote-2');
      expect(quoteCardCalls[2].args.quote_id).toBe('quote-3');
      
      // Check shortform script call
      const scriptCalls = toolCalls.filter(c => c.tool === 'content.generate_shortform_script');
      expect(scriptCalls).toHaveLength(1);
      expect(scriptCalls[0].args.quote_id).toBe('quote-1'); // Best quote
    });

    it('should limit quote cards to max_quote_cards', () => {
      const toolCalls = decideToolsToRun({
        interview_id: 'interview-123',
        quoteIdsForInterview: ['quote-1', 'quote-2', 'quote-3', 'quote-4', 'quote-5'],
        max_quote_cards: 2,
      });
      
      // 2 quote cards + 1 shortform script
      expect(toolCalls).toHaveLength(3);
      
      const quoteCardCalls = toolCalls.filter(c => c.tool === 'content.generate_quote_card');
      expect(quoteCardCalls).toHaveLength(2);
    });

    it('should not invoke tools if interview has no quotes', () => {
      const toolCalls = decideToolsToRun({
        interview_id: 'interview-123',
        quoteIdsForInterview: [],
      });
      
      expect(toolCalls).toHaveLength(0);
    });

    it('should pass theme_id to shortform script if available', () => {
      const toolCalls = decideToolsToRun({
        interview_id: 'interview-123',
        theme_id: 'theme-456',
        quoteIdsForInterview: ['quote-1'],
      });
      
      const scriptCall = toolCalls.find(c => c.tool === 'content.generate_shortform_script');
      expect(scriptCall).toBeDefined();
      expect(scriptCall?.args.theme_id).toBe('theme-456');
    });
  });

  describe('combined inputs', () => {
    it('should invoke all appropriate tools for multiple inputs', () => {
      const toolCalls = decideToolsToRun({
        guest_id: 'guest-123',
        theme_id: 'theme-456',
        interview_id: 'interview-789',
        quoteIdsForInterview: ['quote-1', 'quote-2'],
      });
      
      // 1 post ideas + 1 carousel + 2 quote cards + 1 shortform script
      expect(toolCalls).toHaveLength(5);
      
      const tools = toolCalls.map(c => c.tool);
      expect(tools).toContain('content.generate_post_ideas');
      expect(tools).toContain('content.generate_carousel_outline');
      expect(tools.filter(t => t === 'content.generate_quote_card')).toHaveLength(2);
      expect(tools).toContain('content.generate_shortform_script');
    });
  });

  describe('empty input handling', () => {
    it('should return empty array for no inputs', () => {
      const toolCalls = decideToolsToRun({});
      expect(toolCalls).toHaveLength(0);
    });

    it('should return empty array for interview with no quote results', () => {
      const toolCalls = decideToolsToRun({
        interview_id: 'interview-123',
      });
      expect(toolCalls).toHaveLength(0);
    });
  });
});

describe('Partial Success Behavior', () => {
  interface StepResult {
    tool: string;
    success: boolean;
  }

  /**
   * Simulates computing pipeline success based on step results.
   * Pipeline succeeds if at least one step succeeds (partial success allowed).
   */
  function computePipelineSuccess(steps: StepResult[]): {
    success: boolean;
    successfulSteps: number;
    failedSteps: number;
  } {
    const successfulSteps = steps.filter(s => s.success).length;
    const failedSteps = steps.filter(s => !s.success).length;
    
    return {
      success: failedSteps === 0 || successfulSteps > 0,
      successfulSteps,
      failedSteps,
    };
  }

  it('should succeed if all steps succeed', () => {
    const steps: StepResult[] = [
      { tool: 'content.generate_post_ideas', success: true },
      { tool: 'content.generate_carousel_outline', success: true },
    ];
    
    const result = computePipelineSuccess(steps);
    expect(result.success).toBe(true);
    expect(result.successfulSteps).toBe(2);
    expect(result.failedSteps).toBe(0);
  });

  it('should succeed if at least one step succeeds (partial success)', () => {
    const steps: StepResult[] = [
      { tool: 'content.generate_post_ideas', success: true },
      { tool: 'content.generate_carousel_outline', success: false },
    ];
    
    const result = computePipelineSuccess(steps);
    expect(result.success).toBe(true);
    expect(result.successfulSteps).toBe(1);
    expect(result.failedSteps).toBe(1);
  });

  it('should fail if all steps fail', () => {
    const steps: StepResult[] = [
      { tool: 'content.generate_post_ideas', success: false },
      { tool: 'content.generate_carousel_outline', success: false },
    ];
    
    const result = computePipelineSuccess(steps);
    expect(result.success).toBe(false);
    expect(result.successfulSteps).toBe(0);
    expect(result.failedSteps).toBe(2);
  });

  it('should succeed for empty steps (vacuously true)', () => {
    const steps: StepResult[] = [];
    
    const result = computePipelineSuccess(steps);
    expect(result.success).toBe(true);
    expect(result.successfulSteps).toBe(0);
    expect(result.failedSteps).toBe(0);
  });
});

describe('Asset Collection', () => {
  interface StepData {
    asset_id?: string;
    asset_ids?: string[];
  }

  /**
   * Collect all asset IDs from step results
   */
  function collectAssetIds(stepsData: StepData[]): string[] {
    const assetIds: string[] = [];
    
    for (const data of stepsData) {
      if (data.asset_id) {
        assetIds.push(data.asset_id);
      }
      if (data.asset_ids) {
        assetIds.push(...data.asset_ids);
      }
    }
    
    return assetIds;
  }

  it('should collect single asset_id values', () => {
    const stepsData: StepData[] = [
      { asset_id: 'asset-1' },
      { asset_id: 'asset-2' },
    ];
    
    const assetIds = collectAssetIds(stepsData);
    expect(assetIds).toEqual(['asset-1', 'asset-2']);
  });

  it('should collect asset_ids arrays', () => {
    const stepsData: StepData[] = [
      { asset_ids: ['asset-1', 'asset-2', 'asset-3'] },
    ];
    
    const assetIds = collectAssetIds(stepsData);
    expect(assetIds).toEqual(['asset-1', 'asset-2', 'asset-3']);
  });

  it('should collect mixed asset_id and asset_ids', () => {
    const stepsData: StepData[] = [
      { asset_id: 'asset-1' },
      { asset_ids: ['asset-2', 'asset-3'] },
      { asset_id: 'asset-4' },
    ];
    
    const assetIds = collectAssetIds(stepsData);
    expect(assetIds).toEqual(['asset-1', 'asset-2', 'asset-3', 'asset-4']);
  });

  it('should handle empty or missing asset fields', () => {
    const stepsData: StepData[] = [
      {},
      { asset_id: 'asset-1' },
      {},
    ];
    
    const assetIds = collectAssetIds(stepsData);
    expect(assetIds).toEqual(['asset-1']);
  });
});

