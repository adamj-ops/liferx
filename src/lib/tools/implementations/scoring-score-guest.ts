/**
 * Tool: scoring.score_guest
 * Calculates an explainable score for a guest using signal-based inputs.
 * 
 * Uses documented weights and stores both raw (0-1) and human-readable (0-100) scores.
 */

import { ToolDefinition, ToolContext, ToolResponse } from '../types';
import { createServiceClient } from '../../supabase/server';

interface SignalInputs {
  pov_clarity: number;        // 0-1: unique perspective
  alignment: number;          // 0-1: pillar fit
  content_reuse: number;      // 0-1: repurposability
  audience_leverage: number;  // 0-1: reach potential
}

interface ScoreGuestArgs {
  guest_id: string;
  signals: SignalInputs;
}

// Documented weights for explainability
const WEIGHTS = {
  pov_clarity: 0.30,       // 30% - unique perspective
  alignment: 0.25,         // 25% - pillar fit
  content_reuse: 0.25,     // 25% - repurposability
  audience_leverage: 0.20, // 20% - reach potential
} as const;

const RULES_VERSION = '2.0.0';

type SignalKey = keyof typeof WEIGHTS;

interface FactorDetail {
  signal: number;
  weight: number;
  contribution: number;
}

export const scoringScoreGuest: ToolDefinition<ScoreGuestArgs> = {
  name: 'scoring.score_guest',
  description: 'Calculate an explainable score for a guest using signal-based inputs',
  version: '2.0.0',
  
  async execute(args: ScoreGuestArgs, context: ToolContext): Promise<ToolResponse> {
    const supabase = createServiceClient();
    
    // Check write permission
    if (!context.allowWrites) {
      return {
        success: false,
        error: {
          code: 'WRITE_NOT_ALLOWED',
          message: 'Write operations are not permitted in this context',
        },
      };
    }
    
    // Validate signals are all 0-1
    const signalKeys: SignalKey[] = ['pov_clarity', 'alignment', 'content_reuse', 'audience_leverage'];
    for (const key of signalKeys) {
      const value = args.signals[key];
      if (typeof value !== 'number' || value < 0 || value > 1) {
        return {
          success: false,
          error: {
            code: 'INVALID_SIGNAL',
            message: `Signal "${key}" must be a number between 0 and 1`,
          },
        };
      }
    }
    
    // Verify guest exists
    const { data: guest, error: guestError } = await supabase
      .from('guests')
      .select('id, name')
      .eq('id', args.guest_id)
      .single();
    
    if (guestError || !guest) {
      return {
        success: false,
        error: {
          code: 'GUEST_NOT_FOUND',
          message: `Guest with id ${args.guest_id} not found`,
        },
      };
    }
    
    // Compute factors with contributions
    const factors: Record<SignalKey, FactorDetail> = {} as Record<SignalKey, FactorDetail>;
    let score_0_1 = 0;
    
    for (const key of signalKeys) {
      const signal = args.signals[key];
      const weight = WEIGHTS[key];
      const contribution = signal * weight;
      
      factors[key] = {
        signal,
        weight,
        contribution,
      };
      
      score_0_1 += contribution;
    }
    
    // Human-readable 0-100 score
    const score = Math.round(score_0_1 * 100);
    
    // Find top and bottom factors
    const sortedFactors = signalKeys.sort(
      (a, b) => factors[b].contribution - factors[a].contribution
    );
    const topFactor = sortedFactors[0];
    const bottomFactor = sortedFactors[sortedFactors.length - 1];
    
    // Generate human-readable explanation
    const explanation = 
      `Score: ${score}/100. ` +
      `Strongest signal: ${topFactor} (${Math.round(factors[topFactor].contribution * 100)}% contribution). ` +
      `Weakest signal: ${bottomFactor}. ` +
      `Computed with rules v${RULES_VERSION}.`;
    
    // Store the score with org_id
    const { error: upsertError } = await supabase
      .from('guest_scores')
      .upsert({
        guest_id: args.guest_id,
        score_type: 'overall',
        score,
        score_0_1,
        factors: {
          ...factors,
          weights: WEIGHTS,
          rules_version: RULES_VERSION,
        },
        rules_version: RULES_VERSION,
        org_id: context.org_id,
      }, {
        onConflict: 'guest_id,score_type',
      });
    
    if (upsertError) {
      return {
        success: false,
        error: { code: 'DB_ERROR', message: upsertError.message },
      };
    }
    
    return {
      success: true,
      data: {
        score,
        score_0_1,
        factors,
        explanation,
      },
      explainability: {
        action: 'calculated_score',
        rules_version: RULES_VERSION,
        top_factor: topFactor,
        top_contribution: factors[topFactor].contribution,
        bottom_factor: bottomFactor,
        bottom_contribution: factors[bottomFactor].contribution,
      },
      writes: [
        {
          table: 'guest_scores',
          operation: 'upsert',
          id: args.guest_id,
        },
      ],
    };
  },
};
