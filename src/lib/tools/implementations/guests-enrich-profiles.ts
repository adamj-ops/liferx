/**
 * Tool: guests.enrich_profiles
 * Enriches guest profiles with external intelligence.
 * 
 * Currently uses stubbed external calls. Ready for integration with:
 * - LinkedIn API
 * - Website metadata extraction
 * - Podcast directory APIs
 */

import { ToolDefinition, ToolContext, ToolResponse } from '../types';
import { createServiceClient } from '../../supabase/server';

interface EnrichProfilesArgs {
  /** Guest ID to enrich */
  guest_id: string;
}

interface EnrichmentSource {
  name: string;
  checked: boolean;
  signals_found: string[];
}

interface SocialsData {
  twitter?: string;
  linkedin?: string;
  instagram?: string;
  youtube?: string;
  podcast?: string;
  website?: string;
}

/**
 * Stub: Check LinkedIn for company and role info.
 * In production, this would call LinkedIn API or a data enrichment service.
 */
async function checkLinkedIn(linkedinUrl: string | null): Promise<{
  company_name?: string;
  primary_role?: string;
  signals: string[];
}> {
  if (!linkedinUrl) {
    return { signals: [] };
  }
  
  // Stub: Extract username from URL for demonstration
  const signals: string[] = ['linkedin_profile_exists'];
  
  // In production: Call LinkedIn API or enrichment service
  // const profile = await linkedinApi.getProfile(linkedinUrl);
  // return {
  //   company_name: profile.company,
  //   primary_role: profile.headline,
  //   signals: ['linkedin_profile_exists', 'company_verified', 'role_verified'],
  // };
  
  return { signals };
}

/**
 * Stub: Check website for metadata.
 * In production, this would scrape meta tags or use a metadata API.
 */
async function checkWebsite(websiteUrl: string | null): Promise<{
  detected_company?: string;
  detected_bio?: string;
  signals: string[];
}> {
  if (!websiteUrl) {
    return { signals: [] };
  }
  
  // Stub: Website exists
  const signals: string[] = ['website_exists'];
  
  // In production: Scrape meta tags
  // const meta = await fetchWebsiteMeta(websiteUrl);
  // return {
  //   detected_company: meta.ogSiteName,
  //   detected_bio: meta.description,
  //   signals: ['website_exists', 'meta_extracted'],
  // };
  
  return { signals };
}

/**
 * Stub: Check for podcast presence.
 * In production, this would query podcast directories (Apple, Spotify, etc.)
 */
async function checkPodcastPresence(
  name: string,
  existingPodcastUrl: string | null
): Promise<{
  has_podcast: boolean;
  podcast_url?: string;
  signals: string[];
}> {
  if (existingPodcastUrl) {
    return {
      has_podcast: true,
      podcast_url: existingPodcastUrl,
      signals: ['podcast_url_provided'],
    };
  }
  
  // Stub: In production, search podcast directories
  // const results = await podcastApi.search(name);
  // if (results.length > 0) {
  //   return {
  //     has_podcast: true,
  //     podcast_url: results[0].feedUrl,
  //     signals: ['podcast_discovered'],
  //   };
  // }
  
  return { has_podcast: false, signals: [] };
}

/**
 * Calculate social presence strength (0-1).
 */
function calculateSocialPresenceStrength(socials: SocialsData | null): number {
  if (!socials) return 0;
  
  let score = 0;
  const weights: Record<keyof SocialsData, number> = {
    linkedin: 0.25,
    twitter: 0.20,
    youtube: 0.20,
    instagram: 0.15,
    podcast: 0.15,
    website: 0.05,
  };
  
  for (const [key, weight] of Object.entries(weights)) {
    const value = socials[key as keyof SocialsData];
    if (value && value.trim().length > 0) {
      score += weight;
    }
  }
  
  return Math.min(1, score);
}

export const guestsEnrichProfiles: ToolDefinition<EnrichProfilesArgs> = {
  name: 'guests.enrich_profiles',
  description: 'Enrich a guest profile with external intelligence (company, podcast, social presence)',
  version: '1.0.0',
  
  async execute(args: EnrichProfilesArgs, context: ToolContext): Promise<ToolResponse> {
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
    
    // Validate input
    if (!args.guest_id) {
      return {
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'guest_id is required',
        },
      };
    }
    
    // Fetch existing guest
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
    
    const sources: EnrichmentSource[] = [];
    const enrichedFields: string[] = [];
    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    
    // Extract current socials
    const currentSocials: SocialsData = (guest.socials as SocialsData) || {};
    const newSocials: SocialsData = { ...currentSocials };
    
    // 1. Check LinkedIn
    const linkedinResult = await checkLinkedIn(
      currentSocials.linkedin || guest.linkedin || null
    );
    sources.push({
      name: 'linkedin',
      checked: true,
      signals_found: linkedinResult.signals,
    });
    
    if (linkedinResult.company_name && !guest.company) {
      updates.company = linkedinResult.company_name;
      enrichedFields.push('company');
    }
    if (linkedinResult.primary_role && !guest.primary_role) {
      updates.primary_role = linkedinResult.primary_role;
      enrichedFields.push('primary_role');
    }
    
    // 2. Check Website
    const websiteResult = await checkWebsite(
      currentSocials.website || guest.website || null
    );
    sources.push({
      name: 'website',
      checked: true,
      signals_found: websiteResult.signals,
    });
    
    if (websiteResult.detected_company && !guest.company && !updates.company) {
      updates.company = websiteResult.detected_company;
      enrichedFields.push('company');
    }
    if (websiteResult.detected_bio && !guest.bio) {
      updates.bio = websiteResult.detected_bio;
      enrichedFields.push('bio');
    }
    
    // 3. Check Podcast Presence
    const podcastResult = await checkPodcastPresence(
      guest.full_name || guest.name,
      currentSocials.podcast || guest.podcast_url || null
    );
    sources.push({
      name: 'podcast_directories',
      checked: true,
      signals_found: podcastResult.signals,
    });
    
    if (podcastResult.has_podcast) {
      updates.has_podcast = true;
      if (!enrichedFields.includes('has_podcast')) {
        enrichedFields.push('has_podcast');
      }
      if (podcastResult.podcast_url && !newSocials.podcast) {
        newSocials.podcast = podcastResult.podcast_url;
        enrichedFields.push('socials.podcast');
      }
    }
    
    // 4. Calculate social presence strength
    const socialPresenceStrength = calculateSocialPresenceStrength(newSocials);
    
    // Update metadata with enrichment info
    const currentMetadata = (guest.metadata as Record<string, unknown>) || {};
    const newMetadata = {
      ...currentMetadata,
      enrichment: {
        last_enriched_at: new Date().toISOString(),
        social_presence_strength: socialPresenceStrength,
        sources_checked: sources.map(s => s.name),
        signals_found: sources.flatMap(s => s.signals_found),
      },
    };
    
    // Apply updates
    updates.socials = newSocials;
    updates.metadata = newMetadata;
    
    const { error: updateError } = await supabase
      .from('guests')
      .update(updates)
      .eq('id', args.guest_id);
    
    if (updateError) {
      return {
        success: false,
        error: { code: 'DB_ERROR', message: updateError.message },
      };
    }
    
    return {
      success: true,
      data: {
        enriched_fields: enrichedFields,
        social_presence_strength: socialPresenceStrength,
      },
      explainability: {
        action: 'enriched_guest',
        sources_checked: sources,
        fields_updated: enrichedFields,
        social_presence_strength: socialPresenceStrength,
        signals_detected: sources.flatMap(s => s.signals_found),
      },
      writes: [
        {
          table: 'guests',
          operation: 'update',
          id: args.guest_id,
        },
      ],
    };
  },
};

