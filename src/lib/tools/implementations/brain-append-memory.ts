/**
 * Tool: brain.append_memory
 * Stores agent memory with optional TTL
 */

import { ToolDefinition, ToolContext, ToolResponse } from '../types';
import { createServerClient } from '../../supabase/server';

interface AppendMemoryArgs {
  key: string;
  value: unknown;
  memory_type?: 'short_term' | 'long_term' | 'episodic';
  ttl_hours?: number;
}

export const brainAppendMemory: ToolDefinition<AppendMemoryArgs> = {
  name: 'brain.append_memory',
  description: 'Store agent memory with optional TTL',
  version: '1.0.0',
  
  async execute(args: AppendMemoryArgs, context: ToolContext): Promise<ToolResponse> {
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
    
    const memoryType = args.memory_type ?? 'short_term';
    const expiresAt = args.ttl_hours 
      ? new Date(Date.now() + args.ttl_hours * 60 * 60 * 1000).toISOString()
      : null;
    
    // Upsert memory by key
    const { data: existing } = await supabase
      .from('agent_memory')
      .select('id')
      .eq('key', args.key)
      .single();
    
    let result;
    let action: 'created' | 'updated';
    
    if (existing) {
      const { data, error } = await supabase
        .from('agent_memory')
        .update({
          value: args.value as Record<string, unknown>,
          memory_type: memoryType,
          expires_at: expiresAt,
          session_id: context.session_id ?? null,
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
      const { data, error } = await supabase
        .from('agent_memory')
        .insert({
          key: args.key,
          value: args.value as Record<string, unknown>,
          memory_type: memoryType,
          expires_at: expiresAt,
          session_id: context.session_id ?? null,
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
        memory_type: memoryType,
        has_expiration: !!expiresAt,
        expires_at: expiresAt,
      },
      writes: [
        {
          table: 'agent_memory',
          operation: action === 'created' ? 'insert' : 'update',
          id: result.id,
        },
      ],
    };
  },
};
