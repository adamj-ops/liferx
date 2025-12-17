/**
 * Tool: themes.upsert_theme
 * Creates or updates a theme with evidence for explainability.
 * 
 * Normalizes theme names to slugs for deduplication.
 */

import { ToolDefinition, ToolContext, ToolResponse } from '../types';
import { createServiceClient } from '../../supabase/server';

const RULES_VERSION = '1.0.0';

interface ThemeEvidence {
  quote_ids: string[];
  interview_ids: string[];
  occurrences: number;
  rationale: string;
}

interface UpsertThemeArgs {
  name: string;
  description?: string;
  pillar?: 'Health' | 'Wealth' | 'Connection';
  tone?: 'inspiring' | 'tactical' | 'reflective';
  confidence_score: number;
  evidence: ThemeEvidence;
}

/**
 * Normalize theme name to slug for deduplication
 */
function nameToSlug(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

export const themesUpsertTheme: ToolDefinition<UpsertThemeArgs> = {
  name: 'themes.upsert_theme',
  description: 'Create or update a theme with evidence for explainability',
  version: '1.0.0',

  async execute(args: UpsertThemeArgs, context: ToolContext): Promise<ToolResponse> {
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

    // Validate confidence_score
    if (args.confidence_score < 0 || args.confidence_score > 1) {
      return {
        success: false,
        error: {
          code: 'INVALID_CONFIDENCE_SCORE',
          message: 'confidence_score must be between 0 and 1',
        },
      };
    }

    // Normalize name to slug
    const slug = nameToSlug(args.name);
    if (!slug) {
      return {
        success: false,
        error: {
          code: 'INVALID_NAME',
          message: 'Theme name cannot be empty after normalization',
        },
      };
    }

    // Check if theme with same slug + org_id exists
    const { data: existing } = await supabase
      .from('themes')
      .select('id')
      .eq('slug', slug)
      .eq('org_id', context.org_id)
      .single();

    let result;
    let action: 'created' | 'updated';

    if (existing) {
      // Update existing theme
      const { data, error } = await supabase
        .from('themes')
        .update({
          name: args.name.trim(),
          description: args.description ?? null,
          pillar: args.pillar?.toLowerCase() ?? null,
          tone: args.tone ?? null,
          confidence_score: args.confidence_score,
          evidence: args.evidence,
          rules_version: RULES_VERSION,
          updated_by: context.user_id,
        })
        .eq('id', existing.id)
        .select('id')
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
      // Create new theme
      const { data, error } = await supabase
        .from('themes')
        .insert({
          name: args.name.trim(),
          slug,
          description: args.description ?? null,
          pillar: args.pillar?.toLowerCase() ?? null,
          tone: args.tone ?? null,
          confidence_score: args.confidence_score,
          evidence: args.evidence,
          rules_version: RULES_VERSION,
          org_id: context.org_id,
          created_by: context.user_id,
          updated_by: context.user_id,
        })
        .select('id')
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
        theme_id: result.id,
        action,
      },
      explainability: {
        action,
        slug,
        confidence_score: args.confidence_score,
        occurrences: args.evidence.occurrences,
        rules_version: RULES_VERSION,
        reason: args.evidence.rationale,
      },
      writes: [
        {
          table: 'themes',
          operation: action === 'created' ? 'insert' : 'update',
          id: result.id,
        },
      ],
    };
  },
};

