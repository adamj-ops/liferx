-- ============================================================================
-- Step 2: Tool Schema Updates
-- Adds org_id for multi-tenancy + new columns for refined tools
-- ============================================================================

-- ============================================================================
-- 1. Add org_id to tool-writable tables
-- ============================================================================

-- brain_items: Add org_id
ALTER TABLE brain_items ADD COLUMN IF NOT EXISTS org_id TEXT;
CREATE INDEX IF NOT EXISTS idx_brain_items_org_id ON brain_items(org_id);

-- interview_quotes: Add org_id
ALTER TABLE interview_quotes ADD COLUMN IF NOT EXISTS org_id TEXT;
CREATE INDEX IF NOT EXISTS idx_interview_quotes_org_id ON interview_quotes(org_id);

-- guest_scores: Add org_id
ALTER TABLE guest_scores ADD COLUMN IF NOT EXISTS org_id TEXT;
CREATE INDEX IF NOT EXISTS idx_guest_scores_org_id ON guest_scores(org_id);

-- ============================================================================
-- 2. brain_items: Add confidence_score and tags
-- ============================================================================

-- confidence_score: NUMERIC(4,3) for 0.000-1.000 precision
ALTER TABLE brain_items ADD COLUMN IF NOT EXISTS confidence_score NUMERIC(4,3);

-- Add CHECK constraint (if not exists - Postgres doesn't have IF NOT EXISTS for constraints)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'brain_items_confidence_score_check'
  ) THEN
    ALTER TABLE brain_items ADD CONSTRAINT brain_items_confidence_score_check 
      CHECK (confidence_score >= 0 AND confidence_score <= 1);
  END IF;
END $$;

-- tags array
ALTER TABLE brain_items ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

-- ============================================================================
-- 3. interview_quotes: Add topic and tone
-- ============================================================================

ALTER TABLE interview_quotes ADD COLUMN IF NOT EXISTS topic TEXT;
ALTER TABLE interview_quotes ADD COLUMN IF NOT EXISTS tone TEXT;

-- Add CHECK constraint for tone
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'interview_quotes_tone_check'
  ) THEN
    ALTER TABLE interview_quotes ADD CONSTRAINT interview_quotes_tone_check 
      CHECK (tone IN ('inspiring', 'tactical', 'reflective') OR tone IS NULL);
  END IF;
END $$;

-- ============================================================================
-- 4. guest_scores: Add score_0_1 column for raw score
-- ============================================================================

ALTER TABLE guest_scores ADD COLUMN IF NOT EXISTS score_0_1 NUMERIC(4,3);

-- Add CHECK constraint for score_0_1
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'guest_scores_score_0_1_check'
  ) THEN
    ALTER TABLE guest_scores ADD CONSTRAINT guest_scores_score_0_1_check 
      CHECK (score_0_1 >= 0 AND score_0_1 <= 1);
  END IF;
END $$;

-- ============================================================================
-- Comments
-- ============================================================================
COMMENT ON COLUMN brain_items.org_id IS 'Organization ID for multi-tenancy';
COMMENT ON COLUMN brain_items.confidence_score IS 'Agent confidence 0-1';
COMMENT ON COLUMN brain_items.tags IS 'Categorization tags';
COMMENT ON COLUMN interview_quotes.org_id IS 'Organization ID for multi-tenancy';
COMMENT ON COLUMN interview_quotes.topic IS 'What the quote is about';
COMMENT ON COLUMN interview_quotes.tone IS 'Quote tone: inspiring, tactical, reflective';
COMMENT ON COLUMN guest_scores.org_id IS 'Organization ID for multi-tenancy';
COMMENT ON COLUMN guest_scores.score_0_1 IS 'Raw score 0-1 for precision';

