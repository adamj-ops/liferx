/**
 * Pipeline 4: Outreach & Contributor Automation
 * 
 * Orchestrator for outreach workflows:
 * - Post-release follow-up
 * - Contributor invite
 * 
 * Each flow:
 * 1. Computes eligibility (explainable)
 * 2. Composes personalized message
 * 3. Returns draft for review/queueing
 */

import { executeTool } from '../lib/tools/executeTool';
import { createServiceClient } from '../lib/supabase/server';

// ============================================================================
// Types
// ============================================================================

export interface OutreachFlowInput {
  org_id: string;
  guest_id: string;
  channel: 'email' | 'linkedin' | 'instagram' | 'x';
  session_id?: string;
  user_id?: string;
  /** Skip eligibility checks and force compose */
  force?: boolean;
}

export interface EligibilityResult {
  eligible: boolean;
  reasons: string[];
  hard_gates: {
    score_threshold: { passed: boolean; value: number | null; threshold: number };
    has_persona_pov: { passed: boolean; count: number };
    has_usable_quote: { passed: boolean; count: number };
  };
  soft_signals: {
    has_podcast: boolean;
    social_presence_strength: number | null;
    strong_social_presence: boolean;
  };
}

export interface OutreachFlowResult {
  success: boolean;
  flow: 'post_release' | 'contributor_invite';
  guest_id: string;
  eligibility: EligibilityResult;
  thread_id?: string;
  message_id?: string;
  format_fit?: string;
  error?: { code: string; message: string };
  duration_ms: number;
}

// ============================================================================
// Constants
// ============================================================================

const SCORE_THRESHOLD = 75;
const MIN_POV_COUNT = 1;
const MIN_QUOTE_COUNT = 1;
const SOCIAL_PRESENCE_THRESHOLD = 0.5;

// ============================================================================
// Eligibility Computation
// ============================================================================

async function computeEligibility(
  orgId: string,
  guestId: string
): Promise<EligibilityResult> {
  const supabase = createServiceClient();

  // Initialize result
  const result: EligibilityResult = {
    eligible: false,
    reasons: [],
    hard_gates: {
      score_threshold: { passed: false, value: null, threshold: SCORE_THRESHOLD },
      has_persona_pov: { passed: false, count: 0 },
      has_usable_quote: { passed: false, count: 0 },
    },
    soft_signals: {
      has_podcast: false,
      social_presence_strength: null,
      strong_social_presence: false,
    },
  };

  // 1. Check guest score
  const { data: guestScore } = await supabase
    .from('guest_scores')
    .select('final_score')
    .eq('guest_id', guestId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (guestScore?.final_score !== undefined) {
    result.hard_gates.score_threshold.value = guestScore.final_score;
    result.hard_gates.score_threshold.passed = guestScore.final_score >= SCORE_THRESHOLD;
    
    if (result.hard_gates.score_threshold.passed) {
      result.reasons.push(`Guest score (${guestScore.final_score}) meets threshold (${SCORE_THRESHOLD})`);
    } else {
      result.reasons.push(`Guest score (${guestScore.final_score}) below threshold (${SCORE_THRESHOLD})`);
    }
  } else {
    result.reasons.push('No guest score found');
  }

  // 2. Check guest persona for unique POVs
  const { data: persona } = await supabase
    .from('guest_personas')
    .select('unique_povs')
    .eq('guest_id', guestId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (persona?.unique_povs && Array.isArray(persona.unique_povs)) {
    result.hard_gates.has_persona_pov.count = persona.unique_povs.length;
    result.hard_gates.has_persona_pov.passed = persona.unique_povs.length >= MIN_POV_COUNT;
    
    if (result.hard_gates.has_persona_pov.passed) {
      result.reasons.push(`Guest has ${persona.unique_povs.length} unique POV(s)`);
    } else {
      result.reasons.push('Guest persona lacks unique POVs');
    }
  } else {
    result.reasons.push('No guest persona found');
  }

  // 3. Check for usable quotes
  const { count: quoteCount } = await supabase
    .from('interview_quotes')
    .select('id', { count: 'exact', head: true })
    .eq('guest_id', guestId);

  result.hard_gates.has_usable_quote.count = quoteCount || 0;
  result.hard_gates.has_usable_quote.passed = (quoteCount || 0) >= MIN_QUOTE_COUNT;

  if (result.hard_gates.has_usable_quote.passed) {
    result.reasons.push(`Guest has ${quoteCount} usable quote(s)`);
  } else {
    result.reasons.push('No usable quotes found for guest');
  }

  // 4. Check soft signals (guest record)
  const { data: guest } = await supabase
    .from('guests')
    .select('has_podcast, metadata')
    .eq('id', guestId)
    .single();

  if (guest) {
    result.soft_signals.has_podcast = guest.has_podcast === true;
    
    const metadata = guest.metadata as Record<string, unknown> | null;
    if (metadata?.enrichment) {
      const enrichment = metadata.enrichment as Record<string, unknown>;
      if (typeof enrichment.social_presence_strength === 'number') {
        result.soft_signals.social_presence_strength = enrichment.social_presence_strength;
        result.soft_signals.strong_social_presence = enrichment.social_presence_strength >= SOCIAL_PRESENCE_THRESHOLD;
      }
    }

    if (result.soft_signals.has_podcast) {
      result.reasons.push('Guest has a podcast (bonus signal)');
    }
    if (result.soft_signals.strong_social_presence) {
      result.reasons.push(`Strong social presence (${result.soft_signals.social_presence_strength?.toFixed(2)})`);
    }
  }

  // 5. Compute overall eligibility
  const allHardGatesPassed = 
    result.hard_gates.score_threshold.passed &&
    result.hard_gates.has_persona_pov.passed &&
    result.hard_gates.has_usable_quote.passed;

  result.eligible = allHardGatesPassed;

  if (allHardGatesPassed) {
    result.reasons.unshift('All eligibility criteria met');
  } else {
    result.reasons.unshift('One or more eligibility criteria not met');
  }

  return result;
}

// ============================================================================
// Flow: Post-Release Follow-up
// ============================================================================

/**
 * Generate a post-release follow-up message for a guest.
 * 
 * Use case: After a podcast/article is published, thank the guest
 * and invite them to share + propose follow-on content.
 */
export async function runPostReleaseFollowup(
  input: OutreachFlowInput
): Promise<OutreachFlowResult> {
  const startTime = Date.now();

  console.log(`[OutreachAutomation] Starting post_release flow for guest ${input.guest_id}`);

  // 1. Compute eligibility
  const eligibility = await computeEligibility(input.org_id, input.guest_id);

  // 2. Check eligibility (unless forced)
  if (!eligibility.eligible && !input.force) {
    console.log(`[OutreachAutomation] Guest ${input.guest_id} not eligible for post_release`);
    
    return {
      success: false,
      flow: 'post_release',
      guest_id: input.guest_id,
      eligibility,
      error: {
        code: 'NOT_ELIGIBLE',
        message: 'Guest does not meet eligibility criteria for post-release outreach',
      },
      duration_ms: Date.now() - startTime,
    };
  }

  // 3. Compose message
  const composeResult = await executeTool('outreach.compose_message', {
    guest_id: input.guest_id,
    campaign_type: 'post_release',
    channel: input.channel,
  }, {
    org_id: input.org_id,
    allowWrites: true,
    session_id: input.session_id,
    user_id: input.user_id,
    metadata: {
      source: 'orchestrator',
      flow: 'post_release',
    },
  });

  if (!composeResult.success) {
    console.error(`[OutreachAutomation] Compose failed for guest ${input.guest_id}:`, composeResult.error);
    
    return {
      success: false,
      flow: 'post_release',
      guest_id: input.guest_id,
      eligibility,
      error: composeResult.error,
      duration_ms: Date.now() - startTime,
    };
  }

  const data = composeResult.data as { thread_id: string; message_id: string; format_fit: string };

  console.log(`[OutreachAutomation] Post-release message composed for guest ${input.guest_id}`);

  return {
    success: true,
    flow: 'post_release',
    guest_id: input.guest_id,
    eligibility,
    thread_id: data.thread_id,
    message_id: data.message_id,
    format_fit: data.format_fit,
    duration_ms: Date.now() - startTime,
  };
}

// ============================================================================
// Flow: Contributor Invite
// ============================================================================

/**
 * Generate a contributor invite message for a high-potential guest.
 * 
 * Use case: Invite guests with strong scores and unique POVs to become
 * recurring contributors (IG series, newsletter column, etc.).
 */
export async function runContributorInvite(
  input: OutreachFlowInput
): Promise<OutreachFlowResult> {
  const startTime = Date.now();

  console.log(`[OutreachAutomation] Starting contributor_invite flow for guest ${input.guest_id}`);

  // 1. Compute eligibility
  const eligibility = await computeEligibility(input.org_id, input.guest_id);

  // 2. Check eligibility (unless forced)
  // For contributor invite, we also prefer soft signals
  const hasSoftBonus = eligibility.soft_signals.has_podcast || eligibility.soft_signals.strong_social_presence;
  
  if (!eligibility.eligible && !input.force) {
    console.log(`[OutreachAutomation] Guest ${input.guest_id} not eligible for contributor_invite`);
    
    return {
      success: false,
      flow: 'contributor_invite',
      guest_id: input.guest_id,
      eligibility,
      error: {
        code: 'NOT_ELIGIBLE',
        message: 'Guest does not meet eligibility criteria for contributor invite',
      },
      duration_ms: Date.now() - startTime,
    };
  }

  // Log if eligible without soft signals (lower confidence)
  if (eligibility.eligible && !hasSoftBonus) {
    console.log(`[OutreachAutomation] Guest ${input.guest_id} eligible but lacks soft signals (podcast/social presence)`);
  }

  // 3. Compose message
  const composeResult = await executeTool('outreach.compose_message', {
    guest_id: input.guest_id,
    campaign_type: 'contributor_invite',
    channel: input.channel,
  }, {
    org_id: input.org_id,
    allowWrites: true,
    session_id: input.session_id,
    user_id: input.user_id,
    metadata: {
      source: 'orchestrator',
      flow: 'contributor_invite',
      has_soft_bonus: hasSoftBonus,
    },
  });

  if (!composeResult.success) {
    console.error(`[OutreachAutomation] Compose failed for guest ${input.guest_id}:`, composeResult.error);
    
    return {
      success: false,
      flow: 'contributor_invite',
      guest_id: input.guest_id,
      eligibility,
      error: composeResult.error,
      duration_ms: Date.now() - startTime,
    };
  }

  const data = composeResult.data as { thread_id: string; message_id: string; format_fit: string };

  console.log(`[OutreachAutomation] Contributor invite composed for guest ${input.guest_id}`);

  return {
    success: true,
    flow: 'contributor_invite',
    guest_id: input.guest_id,
    eligibility,
    thread_id: data.thread_id,
    message_id: data.message_id,
    format_fit: data.format_fit,
    duration_ms: Date.now() - startTime,
  };
}

// ============================================================================
// Batch Processing
// ============================================================================

/**
 * Find all eligible guests for contributor invites.
 */
export async function findEligibleContributors(
  orgId: string,
  options?: { limit?: number }
): Promise<Array<{ guest_id: string; eligibility: EligibilityResult }>> {
  const supabase = createServiceClient();
  const limit = options?.limit || 50;

  // Get guests with scores above threshold
  const { data: scores } = await supabase
    .from('guest_scores')
    .select('guest_id, final_score')
    .gte('final_score', SCORE_THRESHOLD)
    .order('final_score', { ascending: false })
    .limit(limit);

  if (!scores || scores.length === 0) {
    return [];
  }

  // Compute eligibility for each
  const results: Array<{ guest_id: string; eligibility: EligibilityResult }> = [];

  for (const score of scores) {
    const eligibility = await computeEligibility(orgId, score.guest_id);
    if (eligibility.eligible) {
      results.push({ guest_id: score.guest_id, eligibility });
    }
  }

  return results;
}

