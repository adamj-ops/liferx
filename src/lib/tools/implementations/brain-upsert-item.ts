/**
 * Tool: brain.upsert_item
 * Creates or updates a brain item (decision, SOP, principle, playbook)
 * 
 * Stores durable intelligence with org-scoping, confidence scoring, and tags.
 */

import { ToolDefinition, ToolContext, ToolResponse } from '../types';
import { createServiceClient } from '../../supabase/server';

interface BrainUpsertArgs {
  type: 'decision' | 'sop' | 'principle' | 'playbook';
  title: string;
  content_md: string;
  confidence_score: number;  // 0-1
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export const brainUpsertItem: ToolDefinition<BrainUpsertArgs> = {
  name: 'brain.upsert_item',
  description: 'Create or update a brain item (decision, SOP, principle, playbook) with confidence scoring',
  version: '2.0.0',
  
  async execute(args: BrainUpsertArgs, context: ToolContext): Promise<ToolResponse> {
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
    
    // Validate confidence_score is 0-1
    if (args.confidence_score < 0 || args.confidence_score > 1) {
      return {
        success: false,
        error: {
          code: 'INVALID_CONFIDENCE_SCORE',
          message: 'confidence_score must be between 0 and 1',
        },
      };
    }
    
    // Check if item with same title + type + org_id exists
    const { data: existing } = await supabase
      .from('brain_items')
      .select('id, version')
      .eq('title', args.title)
      .eq('type', args.type)
      .eq('org_id', context.org_id)
      .single();
    
    let result;
    let action: 'created' | 'updated';
    
    if (existing) {
      // Update existing - increment version
      const { data, error } = await supabase
        .from('brain_items')
        .update({
          content: args.content_md,
          confidence_score: args.confidence_score,
          tags: args.tags ?? [],
          metadata: args.metadata ?? null,
          version: (existing.version || 1) + 1,
          updated_by: context.user_id,
        })
        .eq('id', existing.id)
        .select('id, version')
        .single();
      
      if (error) {
        return {
          success: false,
          error: { code: 'DB_ERROR', message: error.message },
        };
      }
      result = data;
      action = 'updated';
    } else {
      // Create new
      const { data, error } = await supabase
        .from('brain_items')
        .insert({
          type: args.type,
          title: args.title,
          content: args.content_md,
          confidence_score: args.confidence_score,
          tags: args.tags ?? [],
          metadata: args.metadata ?? null,
          org_id: context.org_id,
          created_by: context.user_id,
          updated_by: context.user_id,
        })
        .select('id, version')
        .single();
      
      if (error) {
        return {
          success: false,
          error: { code: 'DB_ERROR', message: error.message },
        };
      }
      result = data;
      action = 'created';
    }
    
    return {
      success: true,
      data: {
        id: result.id,
        version: result.version,
      },
      explainability: {
        action,
        confidence_score: args.confidence_score,
        tags: args.tags ?? [],
        reason: 'Persisted because agent determined this should be durable intelligence',
      },
      writes: [
        {
          table: 'brain_items',
          operation: action === 'created' ? 'insert' : 'update',
          id: result.id,
        },
      ],
    };
  },
};
