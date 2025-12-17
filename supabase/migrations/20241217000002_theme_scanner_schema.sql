-- ============================================================================
-- Step 3: Theme Scanner Schema
-- Extends themes and interview_themes for background scanning
-- ============================================================================

-- ============================================================================
-- 1. Extend themes table
-- ============================================================================

-- org_id as UUID (not TEXT with empty default)
ALTER TABLE themes ADD COLUMN IF NOT EXISTS org_id UUID;

-- slug for normalized name lookup
ALTER TABLE themes ADD COLUMN IF NOT EXISTS slug TEXT;

-- tone constraint
ALTER TABLE themes ADD COLUMN IF NOT EXISTS tone TEXT;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'themes_tone_check'
  ) THEN
    ALTER TABLE themes ADD CONSTRAINT themes_tone_check 
      CHECK (tone IN ('inspiring', 'tactical', 'reflective') OR tone IS NULL);
  END IF;
END $$;

-- confidence_score with 0-1 constraint
ALTER TABLE themes ADD COLUMN IF NOT EXISTS confidence_score NUMERIC(4,3);
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'themes_confidence_score_check'
  ) THEN
    ALTER TABLE themes ADD CONSTRAINT themes_confidence_score_check 
      CHECK (confidence_score >= 0 AND confidence_score <= 1);
  END IF;
END $$;

-- evidence as structured JSONB
ALTER TABLE themes ADD COLUMN IF NOT EXISTS evidence JSONB DEFAULT '{}';

-- rules_version for tracking prompt/logic evolution
ALTER TABLE themes ADD COLUMN IF NOT EXISTS rules_version TEXT DEFAULT '1.0.0';

-- Index for org_id
CREATE INDEX IF NOT EXISTS idx_themes_org_id ON themes(org_id);

-- Unique constraint on org_id + slug (not name, to handle normalization)
CREATE UNIQUE INDEX IF NOT EXISTS idx_themes_org_slug 
  ON themes(org_id, slug) WHERE org_id IS NOT NULL AND slug IS NOT NULL;

-- ============================================================================
-- 2. Extend interview_themes table
-- ============================================================================

-- org_id as UUID
ALTER TABLE interview_themes ADD COLUMN IF NOT EXISTS org_id UUID;

-- quote_id for optional quote-level linking
ALTER TABLE interview_themes ADD COLUMN IF NOT EXISTS quote_id UUID 
  REFERENCES interview_quotes(id) ON DELETE SET NULL;

-- Index for org_id
CREATE INDEX IF NOT EXISTS idx_interview_themes_org_id ON interview_themes(org_id);

-- Partial unique indexes (not COALESCE hack)
-- For links WITHOUT quote_id
CREATE UNIQUE INDEX IF NOT EXISTS uniq_theme_interview
  ON interview_themes(theme_id, interview_id)
  WHERE quote_id IS NULL;

-- For links WITH quote_id
CREATE UNIQUE INDEX IF NOT EXISTS uniq_theme_interview_quote
  ON interview_themes(theme_id, interview_id, quote_id)
  WHERE quote_id IS NOT NULL;

-- ============================================================================
-- Comments
-- ============================================================================
COMMENT ON COLUMN themes.org_id IS 'Organization ID (UUID) for multi-tenancy';
COMMENT ON COLUMN themes.slug IS 'Normalized theme name for deduplication';
COMMENT ON COLUMN themes.tone IS 'Theme tone: inspiring, tactical, reflective';
COMMENT ON COLUMN themes.confidence_score IS 'AI confidence 0-1';
COMMENT ON COLUMN themes.evidence IS 'Supporting quote_ids, interview_ids, occurrences, rationale';
COMMENT ON COLUMN themes.rules_version IS 'Version of extraction rules/prompts used';
COMMENT ON COLUMN interview_themes.org_id IS 'Organization ID (UUID) for multi-tenancy';
COMMENT ON COLUMN interview_themes.quote_id IS 'Optional quote-level theme link';

