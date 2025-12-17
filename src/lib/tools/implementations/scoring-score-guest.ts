/**
 * Tool: scoring.score_guest
 * Calculates an explainable score for a guest
 */

import { ToolDefinition, ToolContext, ToolResponse } from '../types';
import { createServerClient } from '../../supabase/server';

interface ScoreGuestArgs {
  guest_id: string;
  score_type?: 'overall' | 'engagement' | 'collaboration' | 'reach' | 'expertise';
}

const RULES_VERSION = '1.0.0';

export const scoringScoreGuest: ToolDefinition<ScoreGuestArgs> = {
  name: 'scoring.score_guest',
  description: 'Calculate an explainable score for a guest',
  version: '1.0.0',
  
  async execute(args: ScoreGuestArgs, context: ToolContext): Promise<ToolResponse> {
    const supabase = createServerClient();
    
    const scoreType = args.score_type ?? 'overall';
    
    // Fetch guest data
    const { data: guest, error: guestError } = await supabase
      .from('guests')
      .select('*')
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
    
    // Fetch related data for scoring
    const interviewsResult = await supabase
      .from('interviews')
      .select('id, status, published_at')
      .eq('guest_id', args.guest_id);
    const interviews = interviewsResult.data ?? [];
    
    const quotesResult = await supabase
      .from('interview_quotes')
      .select('id, is_highlight, pillar')
      .eq('guest_id', args.guest_id);
    const quotes = quotesResult.data ?? [];
    
    const outreachResult = await supabase
      .from('outreach_events')
      .select('id, status, event_type')
      .eq('guest_id', args.guest_id);
    const outreach = outreachResult.data ?? [];
    
    // Calculate score factors
    const factors: Record<string, { value: number; weight: number; notes: string }> = {};
    
    // Profile completeness (0-20 points)
    const profileFields = ['name', 'bio', 'company', 'pillar', 'unique_pov', 'email'] as const;
    const guestRecord = guest as Record<string, unknown>;
    const filledFields = profileFields.filter(f => guestRecord[f]);
    const completenessScore = (filledFields.length / profileFields.length) * 20;
    factors['profile_completeness'] = {
      value: completenessScore,
      weight: 1,
      notes: `${filledFields.length}/${profileFields.length} fields complete`,
    };
    
    // Interview engagement (0-30 points)
    const interviewCount = interviews.length;
    const publishedCount = interviews.filter((i: { status?: string | null }) => i.status === 'published').length;
    const interviewScore = Math.min(interviewCount * 10 + publishedCount * 5, 30);
    factors['interview_engagement'] = {
      value: interviewScore,
      weight: 1.2,
      notes: `${interviewCount} interviews, ${publishedCount} published`,
    };
    
    // Quote highlights (0-20 points)
    const quoteCount = quotes.length;
    const highlightCount = quotes.filter((q: { is_highlight?: boolean | null }) => q.is_highlight).length;
    const quoteScore = Math.min(quoteCount * 2 + highlightCount * 5, 20);
    factors['quote_quality'] = {
      value: quoteScore,
      weight: 0.8,
      notes: `${quoteCount} quotes, ${highlightCount} highlights`,
    };
    
    // Outreach responsiveness (0-15 points)
    const outreachCount = outreach.length;
    const repliedCount = outreach.filter((o: { status?: string }) => o.status === 'replied').length;
    const responseRate = outreachCount > 0 ? repliedCount / outreachCount : 0;
    const outreachScore = responseRate * 15;
    factors['responsiveness'] = {
      value: outreachScore,
      weight: 1,
      notes: `${Math.round(responseRate * 100)}% response rate (${repliedCount}/${outreachCount})`,
    };
    
    // Pillar alignment (0-15 points)
    const hasPillar = !!guestRecord.pillar;
    const hasUniquePov = !!guestRecord.unique_pov;
    const alignmentScore = (hasPillar ? 10 : 0) + (hasUniquePov ? 5 : 0);
    factors['pillar_alignment'] = {
      value: alignmentScore,
      weight: 1,
      notes: hasPillar ? `Aligned to ${guestRecord.pillar}` : 'No pillar assigned',
    };
    
    // Calculate weighted total
    let totalWeightedScore = 0;
    let totalWeight = 0;
    for (const factor of Object.values(factors)) {
      totalWeightedScore += factor.value * factor.weight;
      totalWeight += factor.weight;
    }
    const finalScore = Math.round((totalWeightedScore / totalWeight) * 100) / 100;
    
    // Store the score if we have write permission
    if (context.allowWrites) {
      await supabase
        .from('guest_scores')
        .upsert({
          guest_id: args.guest_id,
          score_type: scoreType,
          score: finalScore,
          factors: factors as unknown as Record<string, unknown>,
          rules_version: RULES_VERSION,
        }, {
          onConflict: 'guest_id,score_type',
        });
    }
    
    return {
      success: true,
      data: {
        guest_id: args.guest_id,
        guest_name: guestRecord.name as string,
        score_type: scoreType,
        score: finalScore,
        factors,
        rules_version: RULES_VERSION,
      },
      explainability: {
        action: 'calculated_score',
        score_type: scoreType,
        rules_version: RULES_VERSION,
        factor_count: Object.keys(factors).length,
        top_factor: Object.entries(factors).sort((a, b) => b[1].value - a[1].value)[0][0],
      },
      writes: context.allowWrites ? [
        {
          table: 'guest_scores',
          operation: 'upsert',
          id: args.guest_id,
        },
      ] : undefined,
    };
  },
};
