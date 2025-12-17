/**
 * Tool: brain.record_decision
 * Records a decision with rationale and alternatives
 */

import { ToolDefinition, ToolContext, ToolResponse } from '../types';
import { createServerClient } from '../../supabase/server';

interface RecordDecisionArgs {
  title: string;
  decision: string;
  rationale?: string;
  alternatives_considered?: string[];
}

export const brainRecordDecision: ToolDefinition<RecordDecisionArgs> = {
  name: 'brain.record_decision',
  description: 'Record a decision with rationale and alternatives considered',
  version: '1.0.0',
  
  async execute(args: RecordDecisionArgs, context: ToolContext): Promise<ToolResponse> {
    const supabase = createServerClient();
    
    if (!context.allowWrites) {
      return {
        success: false,
        error: {
          code: 'WRITE_NOT_ALLOWED',
          message: 'Write operations are not permitted in this context',
        },
      };
    }
    
    // Build content with structured decision format
    const content = [
      `**Decision:** ${args.decision}`,
      args.rationale ? `\n**Rationale:** ${args.rationale}` : '',
      args.alternatives_considered?.length 
        ? `\n**Alternatives Considered:**\n${args.alternatives_considered.map(a => `- ${a}`).join('\n')}` 
        : '',
    ].filter(Boolean).join('');
    
    const metadata = {
      decision: args.decision,
      rationale: args.rationale,
      alternatives_considered: args.alternatives_considered,
      decided_at: new Date().toISOString(),
      decided_by: context.user_id,
    };
    
    const { data, error } = await supabase
      .from('brain_items')
      .insert({
        type: 'decision',
        title: args.title,
        content,
        metadata,
        created_by: context.user_id,
        updated_by: context.user_id,
      })
      .select()
      .single();
    
    if (error) {
      return {
        success: false,
        error: { code: 'DB_ERROR', message: error.message },
      };
    }
    
    return {
      success: true,
      data,
      explainability: {
        action: 'recorded_decision',
        has_rationale: !!args.rationale,
        alternatives_count: args.alternatives_considered?.length ?? 0,
      },
      writes: [
        {
          table: 'brain_items',
          operation: 'insert',
          id: data.id,
        },
      ],
    };
  },
};
