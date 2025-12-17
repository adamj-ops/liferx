/**
 * Tool: followups.create
 * Creates a follow-up task
 */

import { ToolDefinition, ToolContext, ToolResponse } from '../types';
import { createServerClient } from '../../supabase/server';

interface CreateFollowupArgs {
  related_type: 'guest' | 'prospect' | 'interview' | 'outreach';
  related_id: string;
  action: string;
  due_at: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  notes?: string;
}

export const followupsCreate: ToolDefinition<CreateFollowupArgs> = {
  name: 'followups.create',
  description: 'Create a follow-up task',
  version: '1.0.0',
  
  async execute(args: CreateFollowupArgs, context: ToolContext): Promise<ToolResponse> {
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
    
    // Parse due_at to ensure it's valid
    const dueDate = new Date(args.due_at);
    if (isNaN(dueDate.getTime())) {
      return {
        success: false,
        error: {
          code: 'INVALID_DATE',
          message: `Invalid due_at date: ${args.due_at}`,
        },
      };
    }
    
    const { data, error } = await supabase
      .from('followups')
      .insert({
        related_type: args.related_type,
        related_id: args.related_id,
        action: args.action,
        due_at: dueDate.toISOString(),
        priority: args.priority ?? 'medium',
        notes: args.notes,
        created_by: context.user_id,
      })
      .select()
      .single();
    
    if (error) {
      return {
        success: false,
        error: { code: 'DB_ERROR', message: error.message },
      };
    }
    
    // Calculate days until due
    const daysUntilDue = Math.ceil((dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    
    return {
      success: true,
      data,
      explainability: {
        action: 'created_followup',
        related_type: args.related_type,
        priority: args.priority ?? 'medium',
        days_until_due: daysUntilDue,
        is_overdue: daysUntilDue < 0,
      },
      writes: [
        {
          table: 'followups',
          operation: 'insert',
          id: data.id,
        },
      ],
    };
  },
};
