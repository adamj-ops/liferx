/**
 * Tool: guests.upsert_guest
 * Creates or updates a guest profile
 */

import { ToolDefinition, ToolContext, ToolResponse } from '../types';
import { createServerClient } from '../../supabase/server';

interface UpsertGuestArgs {
  name: string;
  email?: string;
  company?: string;
  title?: string;
  bio?: string;
  pillar?: 'health' | 'wealth' | 'connection';
  unique_pov?: string;
  industry?: string;
  expertise?: string[];
  social_links?: Record<string, string>;
}

export const guestsUpsertGuest: ToolDefinition<UpsertGuestArgs> = {
  name: 'guests.upsert_guest',
  description: 'Create or update a guest profile',
  version: '1.0.0',
  
  async execute(args: UpsertGuestArgs, context: ToolContext): Promise<ToolResponse> {
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
    
    // Check for existing guest by email (if provided) or name
    let existing = null;
    if (args.email) {
      const { data } = await supabase
        .from('guests')
        .select('id')
        .eq('email', args.email)
        .single();
      existing = data;
    }
    
    if (!existing) {
      const { data } = await supabase
        .from('guests')
        .select('id')
        .eq('name', args.name)
        .single();
      existing = data;
    }
    
    let result;
    let action: 'created' | 'updated';
    
    if (existing) {
      const { data, error } = await supabase
        .from('guests')
        .update({
          name: args.name,
          email: args.email,
          company: args.company,
          title: args.title,
          bio: args.bio,
          pillar: args.pillar,
          unique_pov: args.unique_pov,
          industry: args.industry,
          expertise: args.expertise,
          social_links: args.social_links,
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
        .from('guests')
        .insert({
          name: args.name,
          email: args.email,
          company: args.company,
          title: args.title,
          bio: args.bio,
          pillar: args.pillar,
          unique_pov: args.unique_pov,
          industry: args.industry,
          expertise: args.expertise,
          social_links: args.social_links,
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
        pillar: args.pillar,
        has_unique_pov: !!args.unique_pov,
      },
      writes: [
        {
          table: 'guests',
          operation: action === 'created' ? 'insert' : 'update',
          id: result.id,
        },
      ],
    };
  },
};
