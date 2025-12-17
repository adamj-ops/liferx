-- ============================================================================
-- Pipeline 3: Content Repurposing Engine
-- Creates content_assets table for storing generated content assets
-- (quote cards, carousels, shortform scripts, post ideas)
-- ============================================================================

-- ============================================================================
-- 1. Create content_assets table
-- ============================================================================
CREATE TABLE IF NOT EXISTS content_assets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL DEFAULT '3b9d9c2a-6a1c-4f2b-8d6e-0a7e3c2f1b5d'::uuid,
  type TEXT NOT NULL,
  title TEXT,
  body JSONB NOT NULL,
  pillar TEXT,
  tone TEXT,
  theme_id UUID,
  guest_id UUID,
  interview_id UUID,
  source_quote_ids UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Type constraint: only allowed asset types
  CONSTRAINT content_assets_type_check CHECK (
    type IN ('quote_card', 'carousel', 'shortform_script', 'post_idea')
  ),
  
  -- Pillar constraint: lowercase Health/Wealth/Connection
  CONSTRAINT content_assets_pillar_check CHECK (
    pillar IN ('health', 'wealth', 'connection') OR pillar IS NULL
  ),
  
  -- Tone constraint: inspiring/tactical/reflective
  CONSTRAINT content_assets_tone_check CHECK (
    tone IN ('inspiring', 'tactical', 'reflective') OR tone IS NULL
  )
);

-- ============================================================================
-- 2. Add indexes for common query patterns
-- ============================================================================

-- Primary lookup index on org_id (required for multi-tenancy)
CREATE INDEX IF NOT EXISTS idx_content_assets_org_id ON content_assets(org_id);

-- Type-based filtering (e.g., "show all quote cards")
CREATE INDEX IF NOT EXISTS idx_content_assets_type ON content_assets(type);

-- Pillar-based filtering (e.g., "show all Health content")
CREATE INDEX IF NOT EXISTS idx_content_assets_pillar ON content_assets(pillar) WHERE pillar IS NOT NULL;

-- Theme-based lookups (e.g., "content derived from this theme")
CREATE INDEX IF NOT EXISTS idx_content_assets_theme_id ON content_assets(theme_id) WHERE theme_id IS NOT NULL;

-- Guest-based lookups (e.g., "content featuring this guest")
CREATE INDEX IF NOT EXISTS idx_content_assets_guest_id ON content_assets(guest_id) WHERE guest_id IS NOT NULL;

-- Interview-based lookups (e.g., "content derived from this interview")
CREATE INDEX IF NOT EXISTS idx_content_assets_interview_id ON content_assets(interview_id) WHERE interview_id IS NOT NULL;

-- Composite index for common org + type queries
CREATE INDEX IF NOT EXISTS idx_content_assets_org_type ON content_assets(org_id, type);

-- Created_at for time-based queries
CREATE INDEX IF NOT EXISTS idx_content_assets_created_at ON content_assets(created_at DESC);

-- ============================================================================
-- 3. Comments for documentation
-- ============================================================================
COMMENT ON TABLE content_assets IS 'Generated content assets from Pipeline 3: quote cards, carousels, shortform scripts, post ideas. All assets are structured, explainable, and tied to Health/Wealth/Connection pillars.';

COMMENT ON COLUMN content_assets.org_id IS 'Organization ID (UUID) for multi-tenancy';
COMMENT ON COLUMN content_assets.type IS 'Asset type: quote_card, carousel, shortform_script, or post_idea';
COMMENT ON COLUMN content_assets.title IS 'Human-readable title for the asset';
COMMENT ON COLUMN content_assets.body IS 'Structured asset content as JSONB, includes asset data and explainability';
COMMENT ON COLUMN content_assets.pillar IS 'LifeRX pillar: health, wealth, or connection (lowercase)';
COMMENT ON COLUMN content_assets.tone IS 'Content tone: inspiring, tactical, or reflective';
COMMENT ON COLUMN content_assets.theme_id IS 'Reference to source theme (if derived from a theme)';
COMMENT ON COLUMN content_assets.guest_id IS 'Reference to source guest (if derived from a guest)';
COMMENT ON COLUMN content_assets.interview_id IS 'Reference to source interview (if derived from an interview)';
COMMENT ON COLUMN content_assets.source_quote_ids IS 'Array of quote IDs used to generate this asset';

