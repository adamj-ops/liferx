/**
 * Tool: brain.upsert_item
 * Creates or updates a brain item (decision, SOP, principle, playbook, note, insight)
 */

import { ToolDefinition, ToolContext, ToolResponse } from '../types';
import { createServerClient } from '../../supabase/server';

interface BrainUpsertArgs {
  type: 'decision' | 'sop' | 'principle' | 'playbook' | 'note' | 'insight';
  title: string;
  content: string;
  metadata?: Record<string, unknown>;
}

export const brainUpsertItem: ToolDefinition<BrainUpsertArgs> = {
  name: 'brain.upsert_item',
  description: 'Create or update a brain item (decision, SOP, principle, playbook, note, insight)',
  version: '1.0.0',
  
  async execute(args: BrainUpsertArgs, context: ToolContext): Promise<ToolResponse> {
    const supabase = createServerClient();
    
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
    
    // Check if item with same title exists
    const { data: existing } = await supabase
      .from('brain_items')
      .select('id, version')
      .eq('title', args.title)
      .eq('type', args.type)
      .single();
    
    let result;
    let action: 'created' | 'updated';
    
    if (existing) {
      // Update existing
      const { data, error } = await supabase
        .from('brain_items')
        .update({
          content: args.content,
          metadata: args.metadata ?? null,
          version: (existing.version || 1) + 1,
          updated_by: context.user_id,
        })
        .eq('id', existing.id)
        .select()
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
          content: args.content,
          metadata: args.metadata ?? null,
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
      result = data;
      action = 'created';
    }
    
    return {
      success: true,
      data: result,
      explainability: {
        action,
        type: args.type,
        version: result.version,
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
