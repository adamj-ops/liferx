-- ============================================================================
-- LifeRX Brain v1: Audience & Prospects (EXTENDS EXISTING SCHEMA)
-- ============================================================================
-- Your existing tables: prospects, audience_segments
-- This migration ADDS new columns to existing tables and creates missing tables.
-- ============================================================================

-- ============================================================================
-- EXTEND existing prospects table with new columns
-- Existing: id, name, email, company, role, hubspot_id, interest_tags, score, last_contacted, created_at
-- ============================================================================
DO $$ 
BEGIN
  -- Add pillar if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'prospects' AND column_name = 'pillar') THEN
    ALTER TABLE prospects ADD COLUMN pillar TEXT CHECK (pillar IN ('health', 'wealth', 'connection') OR pillar IS NULL);
  END IF;

  -- Add source if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'prospects' AND column_name = 'source') THEN
    ALTER TABLE prospects ADD COLUMN source TEXT;
  END IF;

  -- Add source_url if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'prospects' AND column_name = 'source_url') THEN
    ALTER TABLE prospects ADD COLUMN source_url TEXT;
  END IF;

  -- Add industry if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'prospects' AND column_name = 'industry') THEN
    ALTER TABLE prospects ADD COLUMN industry TEXT;
  END IF;

  -- Add expertise if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'prospects' AND column_name = 'expertise') THEN
    ALTER TABLE prospects ADD COLUMN expertise TEXT[] DEFAULT '{}';
  END IF;

  -- Add notes if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'prospects' AND column_name = 'notes') THEN
    ALTER TABLE prospects ADD COLUMN notes TEXT;
  END IF;

  -- Add status if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'prospects' AND column_name = 'status') THEN
    ALTER TABLE prospects ADD COLUMN status TEXT DEFAULT 'identified' CHECK (status IN ('identified', 'researched', 'contacted', 'responded', 'converted', 'declined', 'archived'));
  END IF;

  -- Add format_fit if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'prospects' AND column_name = 'format_fit') THEN
    ALTER TABLE prospects ADD COLUMN format_fit TEXT[] DEFAULT '{}';
  END IF;

  -- Add social_links if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'prospects' AND column_name = 'social_links') THEN
    ALTER TABLE prospects ADD COLUMN social_links JSONB;
  END IF;

  -- Add metadata if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'prospects' AND column_name = 'metadata') THEN
    ALTER TABLE prospects ADD COLUMN metadata JSONB;
  END IF;

  -- Add updated_at if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'prospects' AND column_name = 'updated_at') THEN
    ALTER TABLE prospects ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
  END IF;

  -- Rename 'role' to 'title' if it exists (align with other tables)
  -- Keeping role as-is since it exists, but adding title too
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'prospects' AND column_name = 'title') THEN
    ALTER TABLE prospects ADD COLUMN title TEXT;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_prospects_pillar ON prospects(pillar) WHERE pillar IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_prospects_status ON prospects(status) WHERE status IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_prospects_source ON prospects(source) WHERE source IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_prospects_expertise ON prospects USING GIN(expertise) WHERE expertise IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_prospects_format_fit ON prospects USING GIN(format_fit) WHERE format_fit IS NOT NULL;

-- ============================================================================
-- EXTEND existing audience_segments table with new columns
-- Existing: id, user_id, segment, attributes, created_at
-- ============================================================================
DO $$ 
BEGIN
  -- Add name if not exists (the existing 'segment' column is the name)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'audience_segments' AND column_name = 'name') THEN
    ALTER TABLE audience_segments ADD COLUMN name TEXT;
    -- Populate from existing segment column if it exists
  END IF;

  -- Add description if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'audience_segments' AND column_name = 'description') THEN
    ALTER TABLE audience_segments ADD COLUMN description TEXT;
  END IF;

  -- Add criteria if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'audience_segments' AND column_name = 'criteria') THEN
    ALTER TABLE audience_segments ADD COLUMN criteria JSONB DEFAULT '{}';
  END IF;

  -- Add pillar if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'audience_segments' AND column_name = 'pillar') THEN
    ALTER TABLE audience_segments ADD COLUMN pillar TEXT CHECK (pillar IN ('health', 'wealth', 'connection') OR pillar IS NULL);
  END IF;

  -- Add estimated_size if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'audience_segments' AND column_name = 'estimated_size') THEN
    ALTER TABLE audience_segments ADD COLUMN estimated_size INTEGER;
  END IF;

  -- Add is_active if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'audience_segments' AND column_name = 'is_active') THEN
    ALTER TABLE audience_segments ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
  END IF;

  -- Add metadata if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'audience_segments' AND column_name = 'metadata') THEN
    ALTER TABLE audience_segments ADD COLUMN metadata JSONB;
  END IF;

  -- Add updated_at if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'audience_segments' AND column_name = 'updated_at') THEN
    ALTER TABLE audience_segments ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_audience_segments_pillar ON audience_segments(pillar) WHERE pillar IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_audience_segments_is_active ON audience_segments(is_active) WHERE is_active = TRUE;

-- ============================================================================
-- engagement_scores: Track engagement metrics (NEW TABLE)
-- ============================================================================
CREATE TABLE IF NOT EXISTS engagement_scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('guest', 'prospect', 'audience_member', 'content')),
  entity_id UUID NOT NULL,
  score_type TEXT NOT NULL, -- 'open_rate', 'click_rate', 'response_rate', 'share_rate'
  score NUMERIC(5,2) NOT NULL CHECK (score >= 0),
  sample_size INTEGER,
  time_period TEXT, -- '7d', '30d', 'all_time'
  factors JSONB,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_engagement_scores_entity ON engagement_scores(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_engagement_scores_score_type ON engagement_scores(score_type);
CREATE INDEX IF NOT EXISTS idx_engagement_scores_computed_at ON engagement_scores(computed_at DESC);

DROP TRIGGER IF EXISTS update_engagement_scores_updated_at ON engagement_scores;
CREATE TRIGGER update_engagement_scores_updated_at
  BEFORE UPDATE ON engagement_scores
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Comments
-- ============================================================================
COMMENT ON TABLE engagement_scores IS 'Engagement metrics for various entity types.';
