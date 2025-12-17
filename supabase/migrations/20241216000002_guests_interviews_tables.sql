-- ============================================================================
-- LifeRX Brain v1: Guests & Interviews (EXTENDS EXISTING SCHEMA)
-- ============================================================================
-- Your existing tables: guests, interviews, interview_quotes, interview_tags
-- This migration ADDS new columns to existing tables and creates missing tables.
-- ============================================================================

-- ============================================================================
-- EXTEND existing guests table with new columns
-- Existing: id, name, company, podcast_url, website, instagram, linkedin, youtube, bio, created_at
-- ============================================================================
DO $$ 
BEGIN
  -- Add pillar if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'guests' AND column_name = 'pillar') THEN
    ALTER TABLE guests ADD COLUMN pillar TEXT CHECK (pillar IN ('health', 'wealth', 'connection') OR pillar IS NULL);
  END IF;

  -- Add unique_pov if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'guests' AND column_name = 'unique_pov') THEN
    ALTER TABLE guests ADD COLUMN unique_pov TEXT;
  END IF;

  -- Add email if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'guests' AND column_name = 'email') THEN
    ALTER TABLE guests ADD COLUMN email TEXT;
  END IF;

  -- Add title if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'guests' AND column_name = 'title') THEN
    ALTER TABLE guests ADD COLUMN title TEXT;
  END IF;

  -- Add industry if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'guests' AND column_name = 'industry') THEN
    ALTER TABLE guests ADD COLUMN industry TEXT;
  END IF;

  -- Add expertise if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'guests' AND column_name = 'expertise') THEN
    ALTER TABLE guests ADD COLUMN expertise TEXT[] DEFAULT '{}';
  END IF;

  -- Add social_links JSONB if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'guests' AND column_name = 'social_links') THEN
    ALTER TABLE guests ADD COLUMN social_links JSONB;
  END IF;

  -- Add metadata if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'guests' AND column_name = 'metadata') THEN
    ALTER TABLE guests ADD COLUMN metadata JSONB;
  END IF;

  -- Add updated_at if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'guests' AND column_name = 'updated_at') THEN
    ALTER TABLE guests ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

-- Add indexes on new columns
CREATE INDEX IF NOT EXISTS idx_guests_pillar ON guests(pillar) WHERE pillar IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_guests_industry ON guests(industry) WHERE industry IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_guests_expertise ON guests USING GIN(expertise) WHERE expertise IS NOT NULL;

-- ============================================================================
-- EXTEND existing interviews table with new columns
-- Existing: id, guest_id, raw_transcript, processed_transcript, published_at, created_at
-- ============================================================================
DO $$ 
BEGIN
  -- Add title if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'interviews' AND column_name = 'title') THEN
    ALTER TABLE interviews ADD COLUMN title TEXT;
  END IF;

  -- Add status if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'interviews' AND column_name = 'status') THEN
    ALTER TABLE interviews ADD COLUMN status TEXT DEFAULT 'recorded' CHECK (status IN ('scheduled', 'recorded', 'published', 'archived'));
  END IF;

  -- Add recorded_at if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'interviews' AND column_name = 'recorded_at') THEN
    ALTER TABLE interviews ADD COLUMN recorded_at TIMESTAMPTZ;
  END IF;

  -- Add summary if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'interviews' AND column_name = 'summary') THEN
    ALTER TABLE interviews ADD COLUMN summary TEXT;
  END IF;

  -- Add transcript_url if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'interviews' AND column_name = 'transcript_url') THEN
    ALTER TABLE interviews ADD COLUMN transcript_url TEXT;
  END IF;

  -- Add audio_url if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'interviews' AND column_name = 'audio_url') THEN
    ALTER TABLE interviews ADD COLUMN audio_url TEXT;
  END IF;

  -- Add video_url if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'interviews' AND column_name = 'video_url') THEN
    ALTER TABLE interviews ADD COLUMN video_url TEXT;
  END IF;

  -- Add metadata if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'interviews' AND column_name = 'metadata') THEN
    ALTER TABLE interviews ADD COLUMN metadata JSONB;
  END IF;

  -- Add updated_at if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'interviews' AND column_name = 'updated_at') THEN
    ALTER TABLE interviews ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_interviews_status ON interviews(status) WHERE status IS NOT NULL;

-- ============================================================================
-- EXTEND existing interview_quotes table with new columns
-- Existing: id, interview_id, quote, context, sentiment, theme, created_at
-- ============================================================================
DO $$ 
BEGIN
  -- Add guest_id if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'interview_quotes' AND column_name = 'guest_id') THEN
    ALTER TABLE interview_quotes ADD COLUMN guest_id UUID REFERENCES guests(id) ON DELETE SET NULL;
  END IF;

  -- Add pillar if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'interview_quotes' AND column_name = 'pillar') THEN
    ALTER TABLE interview_quotes ADD COLUMN pillar TEXT CHECK (pillar IN ('health', 'wealth', 'connection') OR pillar IS NULL);
  END IF;

  -- Add emotional_insight if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'interview_quotes' AND column_name = 'emotional_insight') THEN
    ALTER TABLE interview_quotes ADD COLUMN emotional_insight TEXT;
  END IF;

  -- Add is_highlight if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'interview_quotes' AND column_name = 'is_highlight') THEN
    ALTER TABLE interview_quotes ADD COLUMN is_highlight BOOLEAN DEFAULT FALSE;
  END IF;

  -- Add tags if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'interview_quotes' AND column_name = 'tags') THEN
    ALTER TABLE interview_quotes ADD COLUMN tags TEXT[] DEFAULT '{}';
  END IF;

  -- Add timestamp_start if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'interview_quotes' AND column_name = 'timestamp_start') THEN
    ALTER TABLE interview_quotes ADD COLUMN timestamp_start INTEGER;
  END IF;

  -- Add timestamp_end if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'interview_quotes' AND column_name = 'timestamp_end') THEN
    ALTER TABLE interview_quotes ADD COLUMN timestamp_end INTEGER;
  END IF;

  -- Add metadata if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'interview_quotes' AND column_name = 'metadata') THEN
    ALTER TABLE interview_quotes ADD COLUMN metadata JSONB;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_interview_quotes_pillar ON interview_quotes(pillar) WHERE pillar IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_interview_quotes_is_highlight ON interview_quotes(is_highlight) WHERE is_highlight = TRUE;
CREATE INDEX IF NOT EXISTS idx_interview_quotes_guest_id ON interview_quotes(guest_id) WHERE guest_id IS NOT NULL;

-- ============================================================================
-- interview_themes: Theme tagging for interviews (NEW TABLE)
-- ============================================================================
CREATE TABLE IF NOT EXISTS interview_themes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  interview_id UUID NOT NULL REFERENCES interviews(id) ON DELETE CASCADE,
  theme_id UUID NOT NULL REFERENCES themes(id) ON DELETE CASCADE,
  confidence NUMERIC(3,2) DEFAULT 0.80 CHECK (confidence >= 0 AND confidence <= 1),
  notes TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(interview_id, theme_id)
);

CREATE INDEX IF NOT EXISTS idx_interview_themes_interview_id ON interview_themes(interview_id);
CREATE INDEX IF NOT EXISTS idx_interview_themes_theme_id ON interview_themes(theme_id);

-- ============================================================================
-- guest_personas: Generated personas for guests (NEW TABLE)
-- ============================================================================
CREATE TABLE IF NOT EXISTS guest_personas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  guest_id UUID NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
  persona_type TEXT NOT NULL, -- 'audience_fit', 'content_style', 'expertise_map'
  content JSONB NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  model_version TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_guest_personas_guest_id ON guest_personas(guest_id);
CREATE INDEX IF NOT EXISTS idx_guest_personas_type ON guest_personas(persona_type);

DROP TRIGGER IF EXISTS update_guest_personas_updated_at ON guest_personas;
CREATE TRIGGER update_guest_personas_updated_at
  BEFORE UPDATE ON guest_personas
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- guest_scores: Explainable scoring for guests (NEW TABLE)
-- ============================================================================
CREATE TABLE IF NOT EXISTS guest_scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  guest_id UUID NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
  score_type TEXT NOT NULL CHECK (score_type IN ('overall', 'engagement', 'collaboration', 'reach', 'expertise')),
  score NUMERIC(5,2) NOT NULL CHECK (score >= 0 AND score <= 100),
  factors JSONB NOT NULL DEFAULT '{}',
  rules_version TEXT NOT NULL DEFAULT '1.0.0',
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(guest_id, score_type)
);

CREATE INDEX IF NOT EXISTS idx_guest_scores_guest_id ON guest_scores(guest_id);
CREATE INDEX IF NOT EXISTS idx_guest_scores_score_type ON guest_scores(score_type);
CREATE INDEX IF NOT EXISTS idx_guest_scores_score ON guest_scores(score DESC);

DROP TRIGGER IF EXISTS update_guest_scores_updated_at ON guest_scores;
CREATE TRIGGER update_guest_scores_updated_at
  BEFORE UPDATE ON guest_scores
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Comments
-- ============================================================================
COMMENT ON TABLE interview_themes IS 'Theme associations for interviews with confidence scores.';
COMMENT ON TABLE guest_personas IS 'Generated personas and analysis for guests.';
COMMENT ON TABLE guest_scores IS 'Explainable scores with factors and rules version tracking.';
