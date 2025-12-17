/**
 * Tool: guests.upsert_guest
 * Creates or updates a guest profile with org-scoping and name normalization.
 * 
 * Version 2.0: Added org-scoping, canonical full_name, has_podcast detection.
 */

import { ToolDefinition, ToolContext, ToolResponse } from '../types';
import { createServiceClient } from '../../supabase/server';

interface SocialsInput {
  twitter?: string;
  linkedin?: string;
  instagram?: string;
  youtube?: string;
  podcast?: string;
  website?: string;
}

interface UpsertGuestArgs {
  /** Canonical guest name (required) */
  full_name: string;
  /** Primary job title/role */
  primary_role?: string;
  /** Company name */
  company_name?: string;
  /** Guest bio/description */
  bio?: string;
  /** Personal/company website */
  website?: string;
  /** Social media links */
  socials?: SocialsInput;
  /** Email address (optional) */
  email?: string;
  /** Primary pillar alignment */
  pillar?: 'health' | 'wealth' | 'connection';
  /** Unique perspective/angle */
  unique_pov?: string;
  /** Industry/sector */
  industry?: string;
  /** Areas of expertise */
  expertise?: string[];
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Normalize a name: trim whitespace, collapse multiple spaces.
 */
function normalizeName(name: string): string {
  return name
    .trim()
    .replace(/\s+/g, ' '); // Collapse multiple spaces to single space
}

/**
 * Detect if guest has a podcast based on socials.
 */
function detectHasPodcast(socials?: SocialsInput): boolean {
  if (!socials) return false;
  
  // Check for podcast or youtube links
  if (socials.podcast && socials.podcast.trim().length > 0) return true;
  if (socials.youtube && socials.youtube.trim().length > 0) return true;
  
  return false;
}

export const guestsUpsertGuest: ToolDefinition<UpsertGuestArgs> = {
  name: 'guests.upsert_guest',
  description: 'Create or update a guest profile. Uses (org_id, full_name) for upsert matching.',
  version: '2.0.0',
  
  async execute(args: UpsertGuestArgs, context: ToolContext): Promise<ToolResponse> {
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
    
    // Validate required fields
    if (!args.full_name || !args.full_name.trim()) {
      return {
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'full_name is required',
        },
      };
    }
    
    // Normalize name
    const normalizedName = normalizeName(args.full_name);
    
    // Detect has_podcast from socials
    const hasPodcast = detectHasPodcast(args.socials);
    
    // Prepare guest data
    const guestData = {
      org_id: context.org_id,
      full_name: normalizedName,
      name: normalizedName, // Keep legacy name field in sync
      primary_role: args.primary_role || null,
      company: args.company_name || null,
      bio: args.bio || null,
      website: args.website || args.socials?.website || null,
      email: args.email || null,
      pillar: args.pillar || null,
      unique_pov: args.unique_pov || null,
      industry: args.industry || null,
      expertise: args.expertise || null,
      socials: args.socials || null,
      has_podcast: hasPodcast,
      metadata: args.metadata || null,
      updated_at: new Date().toISOString(),
    };
    
    // Check for existing guest by (org_id, full_name)
    let existing = null;
    if (context.org_id) {
      const { data } = await supabase
        .from('guests')
        .select('id')
        .eq('org_id', context.org_id)
        .eq('full_name', normalizedName)
        .single();
      existing = data;
    }
    
    // Fallback: check by email if provided
    if (!existing && args.email) {
      const { data } = await supabase
        .from('guests')
        .select('id')
        .eq('email', args.email)
        .single();
      existing = data;
    }
    
    // Fallback: check by name (for backwards compatibility)
    if (!existing) {
      const { data } = await supabase
        .from('guests')
        .select('id')
        .eq('name', normalizedName)
        .single();
      existing = data;
    }
    
    let result;
    let action: 'created' | 'updated';
    let reason: string;
    
    if (existing) {
      // Update existing guest
      const { data, error } = await supabase
        .from('guests')
        .update(guestData)
        .eq('id', existing.id)
        .select('id, full_name')
        .single();
      
      if (error) {
        return {
          success: false,
          error: { code: 'DB_ERROR', message: error.message },
        };
      }
      result = data;
      action = 'updated';
      reason = context.org_id 
        ? `Matched existing guest by (org_id, full_name)` 
        : `Matched existing guest by name or email`;
    } else {
      // Create new guest
      const { data, error } = await supabase
        .from('guests')
        .insert(guestData)
        .select('id, full_name')
        .single();
      
      if (error) {
        return {
          success: false,
          error: { code: 'DB_ERROR', message: error.message },
        };
      }
      result = data;
      action = 'created';
      reason = 'No existing guest found with matching name or email';
    }
    
    return {
      success: true,
      data: {
        guest_id: result.id,
        full_name: result.full_name,
        action,
      },
      explainability: {
        action,
        reason,
        name_normalized: normalizedName !== args.full_name,
        has_podcast: hasPodcast,
        pillar: args.pillar || null,
        has_unique_pov: !!args.unique_pov,
        org_scoped: !!context.org_id,
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
