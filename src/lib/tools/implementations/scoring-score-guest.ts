/**
 * Tool: scoring.score_guest
 * Calculates an explainable score for a guest using signal-based inputs.
 * 
 * Version 3.0: Integrates enrichment signals (has_podcast, persona_clarity, social_presence)
 * Uses documented weights and stores both raw (0-1) and human-readable (0-100) scores.
 */

import { ToolDefinition, ToolContext, ToolResponse } from '../types';
import { createServiceClient } from '../../supabase/server';

interface CoreSignalInputs {
  pov_clarity: number;        // 0-1: unique perspective
  alignment: number;          // 0-1: pillar fit
  content_reuse: number;      // 0-1: repurposability
  audience_leverage: number;  // 0-1: reach potential
}

interface EnrichmentSignals {
  /** Guest has a podcast - adds bonus to audience_leverage */
  has_podcast?: boolean;
  /** Persona clarity score (0-1) - derived from persona completeness */
  persona_clarity?: number;
  /** Social presence strength (0-1) - derived from enrichment */
  social_presence?: number;
}

interface SignalInputs extends CoreSignalInputs, EnrichmentSignals {}

interface ScoreGuestArgs {
  guest_id: string;
  signals: SignalInputs;
  /** Auto-fetch enrichment data from guest and persona records */
  auto_enrich?: boolean;
}

// Core weights for base signals
const CORE_WEIGHTS = {
  pov_clarity: 0.30,       // 30% - unique perspective
  alignment: 0.25,         // 25% - pillar fit
  content_reuse: 0.25,     // 25% - repurposability
  audience_leverage: 0.20, // 20% - reach potential
} as const;

// Bonus weights for enrichment signals
const BONUS_WEIGHTS = {
  has_podcast: 0.10,       // 10% bonus to audience_leverage
  persona_clarity: 0.05,   // 5% bonus based on persona completeness
  social_presence: 0.05,   // 5% bonus based on social presence
} as const;

const RULES_VERSION = '3.0.0';

type CoreSignalKey = keyof typeof CORE_WEIGHTS;

interface FactorDetail {
  signal: number;
  weight: number;
  contribution: number;
  source?: 'input' | 'auto' | 'bonus';
}

/**
 * Calculate persona clarity from persona content.
 * Returns 0-1 based on completeness of persona fields.
 */
function calculatePersonaClarity(persona: {
  summary?: string | null;
  beliefs?: string[] | null;
  expertise?: string[] | null;
  unique_povs?: string[] | null;
} | null): number {
  if (!persona) return 0;
  
  let score = 0;
  const weights = {
    summary: 0.3,
    beliefs: 0.25,
    expertise: 0.25,
    unique_povs: 0.2,
  };
  
  if (persona.summary && persona.summary.length > 20) {
    score += weights.summary;
  }
  if (persona.beliefs && persona.beliefs.length >= 2) {
    score += weights.beliefs * Math.min(1, persona.beliefs.length / 4);
  }
  if (persona.expertise && persona.expertise.length >= 2) {
    score += weights.expertise * Math.min(1, persona.expertise.length / 4);
  }
  if (persona.unique_povs && persona.unique_povs.length >= 1) {
    score += weights.unique_povs * Math.min(1, persona.unique_povs.length / 3);
  }
  
  return Math.min(1, score);
}

/**
 * Extract social presence strength from guest metadata.
 */
function extractSocialPresence(metadata: Record<string, unknown> | null): number {
  if (!metadata) return 0;
  
  const enrichment = metadata.enrichment as { social_presence_strength?: number } | undefined;
  return enrichment?.social_presence_strength || 0;
}

export const scoringScoreGuest: ToolDefinition<ScoreGuestArgs> = {
  name: 'scoring.score_guest',
  description: 'Calculate an explainable score for a guest using signal-based inputs with optional enrichment bonuses',
  version: '3.0.0',
  
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
    
    // Validate core signals are all 0-1
    const coreSignalKeys: CoreSignalKey[] = ['pov_clarity', 'alignment', 'content_reuse', 'audience_leverage'];
    for (const key of coreSignalKeys) {
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
    
    // Fetch guest with enrichment data
    const { data: guest, error: guestError } = await supabase
      .from('guests')
      .select('id, full_name, name, has_podcast, metadata')
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
    
    // Fetch persona if auto_enrich is enabled
    let persona = null;
    if (args.auto_enrich) {
      const { data } = await supabase
        .from('guest_personas')
        .select('summary, beliefs, expertise, unique_povs')
        .eq('guest_id', args.guest_id)
        .single();
      persona = data;
    }
    
    // Determine enrichment signals
    const hasPodcast = args.signals.has_podcast ?? guest.has_podcast ?? false;
    const personaClarity = args.signals.persona_clarity ?? 
      (args.auto_enrich ? calculatePersonaClarity(persona) : 0);
    const socialPresence = args.signals.social_presence ?? 
      (args.auto_enrich ? extractSocialPresence(guest.metadata as Record<string, unknown> | null) : 0);
    
    // Compute core factors with contributions
    const factors: Record<string, FactorDetail> = {};
    let score_0_1 = 0;
    
    for (const key of coreSignalKeys) {
      const signal = args.signals[key];
      const weight = CORE_WEIGHTS[key];
      const contribution = signal * weight;
      
      factors[key] = {
        signal,
        weight,
        contribution,
        source: 'input',
      };
      
      score_0_1 += contribution;
    }
    
    // Apply enrichment bonuses
    const bonuses: Record<string, FactorDetail> = {};
    
    // has_podcast bonus: adds to audience_leverage
    if (hasPodcast) {
      const podcastBonus = BONUS_WEIGHTS.has_podcast;
      bonuses['has_podcast_bonus'] = {
        signal: 1,
        weight: podcastBonus,
        contribution: podcastBonus,
        source: 'bonus',
      };
      score_0_1 += podcastBonus;
    }
    
    // persona_clarity bonus: adds based on persona completeness
    if (personaClarity > 0) {
      const personaBonus = personaClarity * BONUS_WEIGHTS.persona_clarity;
      bonuses['persona_clarity_bonus'] = {
        signal: personaClarity,
        weight: BONUS_WEIGHTS.persona_clarity,
        contribution: personaBonus,
        source: args.auto_enrich ? 'auto' : 'input',
      };
      score_0_1 += personaBonus;
    }
    
    // social_presence bonus: adds based on social strength
    if (socialPresence > 0) {
      const socialBonus = socialPresence * BONUS_WEIGHTS.social_presence;
      bonuses['social_presence_bonus'] = {
        signal: socialPresence,
        weight: BONUS_WEIGHTS.social_presence,
        contribution: socialBonus,
        source: args.auto_enrich ? 'auto' : 'input',
      };
      score_0_1 += socialBonus;
    }
    
    // Clamp score to 0-1 (bonuses can push over 1.0)
    score_0_1 = Math.min(1, score_0_1);
    
    // Human-readable 0-100 score
    const score = Math.round(score_0_1 * 100);
    
    // Find top and bottom core factors
    const sortedCoreFactors = [...coreSignalKeys].sort(
      (a, b) => factors[b].contribution - factors[a].contribution
    );
    const topFactor = sortedCoreFactors[0];
    const bottomFactor = sortedCoreFactors[sortedCoreFactors.length - 1];
    
    // Calculate total bonus contribution
    const totalBonus = Object.values(bonuses).reduce(
      (sum, b) => sum + b.contribution, 
      0
    );
    
    // Generate human-readable explanation
    let explanation = 
      `Score: ${score}/100. ` +
      `Strongest signal: ${topFactor} (${Math.round(factors[topFactor].contribution * 100)}% contribution). ` +
      `Weakest signal: ${bottomFactor}.`;
    
    if (totalBonus > 0) {
      const bonusDetails: string[] = [];
      if (hasPodcast) bonusDetails.push('has podcast (+10%)');
      if (personaClarity > 0) bonusDetails.push(`persona clarity (+${Math.round(personaClarity * 5)}%)`);
      if (socialPresence > 0) bonusDetails.push(`social presence (+${Math.round(socialPresence * 5)}%)`);
      explanation += ` Enrichment bonuses: ${bonusDetails.join(', ')}.`;
    }
    
    explanation += ` Computed with rules v${RULES_VERSION}.`;
    
    // Merge all factors for storage
    const allFactors = {
      ...factors,
      ...bonuses,
      core_weights: CORE_WEIGHTS,
      bonus_weights: BONUS_WEIGHTS,
      rules_version: RULES_VERSION,
    };
    
    // Store the score with org_id
    const { error: upsertError } = await supabase
      .from('guest_scores')
      .upsert({
        guest_id: args.guest_id,
        score_type: 'overall',
        score,
        score_0_1,
        factors: allFactors,
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
        factors: allFactors,
        explanation,
      },
      explainability: {
        action: 'calculated_score',
        rules_version: RULES_VERSION,
        top_factor: topFactor,
        top_contribution: factors[topFactor].contribution,
        bottom_factor: bottomFactor,
        bottom_contribution: factors[bottomFactor].contribution,
        has_podcast: hasPodcast,
        persona_clarity: personaClarity,
        social_presence: socialPresence,
        total_bonus: totalBonus,
        auto_enriched: args.auto_enrich ?? false,
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
