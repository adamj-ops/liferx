-- ============================================================================
-- Pipeline 2: Interview Intelligence & Theme Mining
-- Extends interviews, interview_quotes, ai_docs, ai_chunks for org-scoped
-- intelligence and semantic search.
-- ============================================================================

-- Stable org UUID for single-org deployment
-- Used as default for all org_id columns
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'liferx_org_uuid') THEN
    -- Store the stable org UUID as a constant we can reference
    PERFORM set_config('liferx.default_org_id', '3b9d9c2a-6a1c-4f2b-8d6e-0a7e3c2f1b5d', false);
  END IF;
END $$;

-- ============================================================================
-- 1. EXTEND interviews table for intelligence
-- ============================================================================

-- Add org_id (uuid) to interviews
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS org_id UUID 
  DEFAULT '3b9d9c2a-6a1c-4f2b-8d6e-0a7e3c2f1b5d'::uuid;

-- Backfill existing rows with default org_id
UPDATE interviews SET org_id = '3b9d9c2a-6a1c-4f2b-8d6e-0a7e3c2f1b5d'::uuid 
  WHERE org_id IS NULL;

-- Make org_id NOT NULL after backfill
ALTER TABLE interviews ALTER COLUMN org_id SET NOT NULL;

-- Add transcript column (alias for raw_transcript for new API)
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS transcript TEXT;

-- Backfill transcript from raw_transcript
UPDATE interviews SET transcript = raw_transcript WHERE transcript IS NULL AND raw_transcript IS NOT NULL;

-- Add tag arrays for auto-tagging
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS industries TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS expertise TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS pillars TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS tones TEXT[] NOT NULL DEFAULT '{}';

-- Add GIN indexes for array searches
CREATE INDEX IF NOT EXISTS idx_interviews_industries ON interviews USING GIN(industries);
CREATE INDEX IF NOT EXISTS idx_interviews_expertise ON interviews USING GIN(expertise);
CREATE INDEX IF NOT EXISTS idx_interviews_pillars ON interviews USING GIN(pillars);
CREATE INDEX IF NOT EXISTS idx_interviews_tones ON interviews USING GIN(tones);

-- Add btree index on org_id
CREATE INDEX IF NOT EXISTS idx_interviews_org_id ON interviews(org_id);

-- Add CHECK constraints for pillars and tones values
-- pillars must be subset of {Health, Wealth, Connection}
-- tones must be subset of {inspiring, tactical, reflective}
-- Note: Postgres doesn't have native array subset checks, so we use a trigger or leave as soft constraint

-- ============================================================================
-- 2. EXTEND interview_quotes for org-scoped intelligence
-- ============================================================================

-- The table currently has org_id as TEXT. We need to:
-- 1. Rename old column
-- 2. Add new UUID column
-- 3. Migrate data
-- 4. Drop old column

-- Step 1: Check if org_id is TEXT and rename it
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'interview_quotes' 
    AND column_name = 'org_id' 
    AND data_type = 'text'
  ) THEN
    ALTER TABLE interview_quotes RENAME COLUMN org_id TO org_id_legacy;
  END IF;
END $$;

-- Step 2: Add new UUID org_id column
ALTER TABLE interview_quotes ADD COLUMN IF NOT EXISTS org_id UUID 
  DEFAULT '3b9d9c2a-6a1c-4f2b-8d6e-0a7e3c2f1b5d'::uuid;

-- Step 3: Migrate valid UUIDs from legacy column if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'interview_quotes' 
    AND column_name = 'org_id_legacy'
  ) THEN
    UPDATE interview_quotes 
    SET org_id = org_id_legacy::uuid 
    WHERE org_id_legacy IS NOT NULL 
      AND org_id_legacy ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
  END IF;
END $$;

-- Step 4: Backfill any remaining NULLs
UPDATE interview_quotes 
SET org_id = '3b9d9c2a-6a1c-4f2b-8d6e-0a7e3c2f1b5d'::uuid 
WHERE org_id IS NULL;

-- Step 5: Make org_id NOT NULL
ALTER TABLE interview_quotes ALTER COLUMN org_id SET NOT NULL;

-- Step 6: Drop legacy column if exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'interview_quotes' 
    AND column_name = 'org_id_legacy'
  ) THEN
    ALTER TABLE interview_quotes DROP COLUMN org_id_legacy;
  END IF;
END $$;

-- Ensure quote and interview_id are NOT NULL (required model)
-- Only update if they allow nulls
DO $$
BEGIN
  -- Make quote NOT NULL
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'interview_quotes' 
    AND column_name = 'quote' 
    AND is_nullable = 'YES'
  ) THEN
    -- First, delete any rows with NULL quote (shouldn't exist)
    DELETE FROM interview_quotes WHERE quote IS NULL;
    ALTER TABLE interview_quotes ALTER COLUMN quote SET NOT NULL;
  END IF;
  
  -- Make interview_id NOT NULL
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'interview_quotes' 
    AND column_name = 'interview_id' 
    AND is_nullable = 'YES'
  ) THEN
    -- First, delete any rows with NULL interview_id (shouldn't exist)
    DELETE FROM interview_quotes WHERE interview_id IS NULL;
    ALTER TABLE interview_quotes ALTER COLUMN interview_id SET NOT NULL;
  END IF;
END $$;

-- Drop old org_id index if it exists (was on TEXT column)
DROP INDEX IF EXISTS idx_interview_quotes_org_id;

-- Create new index on UUID org_id
CREATE INDEX IF NOT EXISTS idx_interview_quotes_org_id ON interview_quotes(org_id);

-- ============================================================================
-- 3. EXTEND ai_docs for org-scoping
-- ============================================================================

-- Add org_id to ai_docs
ALTER TABLE ai_docs ADD COLUMN IF NOT EXISTS org_id UUID 
  DEFAULT '3b9d9c2a-6a1c-4f2b-8d6e-0a7e3c2f1b5d'::uuid;

-- Backfill existing rows
UPDATE ai_docs SET org_id = '3b9d9c2a-6a1c-4f2b-8d6e-0a7e3c2f1b5d'::uuid 
  WHERE org_id IS NULL;

-- Make NOT NULL
ALTER TABLE ai_docs ALTER COLUMN org_id SET NOT NULL;

-- Add index
CREATE INDEX IF NOT EXISTS idx_ai_docs_org_id ON ai_docs(org_id);

-- ============================================================================
-- 4. EXTEND ai_chunks for org-scoping and interview linking
-- ============================================================================

-- Add org_id to ai_chunks
ALTER TABLE ai_chunks ADD COLUMN IF NOT EXISTS org_id UUID 
  DEFAULT '3b9d9c2a-6a1c-4f2b-8d6e-0a7e3c2f1b5d'::uuid;

-- Backfill existing rows
UPDATE ai_chunks SET org_id = '3b9d9c2a-6a1c-4f2b-8d6e-0a7e3c2f1b5d'::uuid 
  WHERE org_id IS NULL;

-- Make NOT NULL
ALTER TABLE ai_chunks ALTER COLUMN org_id SET NOT NULL;

-- Add interview_id and guest_id columns for interview-specific chunks
ALTER TABLE ai_chunks ADD COLUMN IF NOT EXISTS interview_id UUID;
ALTER TABLE ai_chunks ADD COLUMN IF NOT EXISTS guest_id UUID;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_ai_chunks_org_id ON ai_chunks(org_id);
CREATE INDEX IF NOT EXISTS idx_ai_chunks_interview_id ON ai_chunks(interview_id) WHERE interview_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ai_chunks_guest_id ON ai_chunks(guest_id) WHERE guest_id IS NOT NULL;

-- Add GIN index on tags for tag-based filtering
CREATE INDEX IF NOT EXISTS idx_ai_chunks_tags_gin ON ai_chunks USING GIN(tags);

-- ============================================================================
-- 5. UPDATE match_ai_chunks RPC for org isolation
-- ============================================================================

-- Drop existing function (if exists) and recreate with org filtering
DROP FUNCTION IF EXISTS match_ai_chunks(vector, integer, double precision);

CREATE OR REPLACE FUNCTION match_ai_chunks(
  query_embedding vector,
  match_count integer DEFAULT 5,
  match_threshold double precision DEFAULT 0.5,
  match_org_id uuid DEFAULT NULL
)
RETURNS TABLE(
  id bigint,
  source_id uuid,
  content text,
  metadata jsonb,
  pillar text,
  tags text[],
  similarity double precision,
  interview_id uuid,
  guest_id uuid,
  org_id uuid
)
LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    ac.id,
    ac.source_id,
    ac.content,
    ac.metadata,
    ac.pillar,
    ac.tags,
    1 - (ac.embedding <=> query_embedding) AS similarity,
    ac.interview_id,
    ac.guest_id,
    ac.org_id
  FROM ai_chunks ac
  WHERE ac.embedding IS NOT NULL
    AND 1 - (ac.embedding <=> query_embedding) > match_threshold
    -- Org isolation: match org_id OR include NULL org_id (legacy data)
    AND (match_org_id IS NULL OR ac.org_id = match_org_id OR ac.org_id IS NULL)
  ORDER BY ac.embedding <=> query_embedding
  LIMIT match_count;
END;
$function$;

-- Also update match_ai_chunks_1024 if it exists
DROP FUNCTION IF EXISTS match_ai_chunks_1024(vector, integer, double precision);

CREATE OR REPLACE FUNCTION match_ai_chunks_1024(
  query_embedding vector,
  match_count integer DEFAULT 5,
  match_threshold double precision DEFAULT 0.5,
  match_org_id uuid DEFAULT NULL
)
RETURNS TABLE(
  id bigint,
  source_id uuid,
  content text,
  metadata jsonb,
  pillar text,
  tags text[],
  similarity double precision,
  interview_id uuid,
  guest_id uuid,
  org_id uuid
)
LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    ac.id,
    ac.source_id,
    ac.content,
    ac.metadata,
    ac.pillar,
    ac.tags,
    1 - (ac.embedding_1024 <=> query_embedding) AS similarity,
    ac.interview_id,
    ac.guest_id,
    ac.org_id
  FROM ai_chunks ac
  WHERE ac.embedding_1024 IS NOT NULL
    AND 1 - (ac.embedding_1024 <=> query_embedding) > match_threshold
    -- Org isolation: match org_id OR include NULL org_id (legacy data)
    AND (match_org_id IS NULL OR ac.org_id = match_org_id OR ac.org_id IS NULL)
  ORDER BY ac.embedding_1024 <=> query_embedding
  LIMIT match_count;
END;
$function$;

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON COLUMN interviews.org_id IS 'Organization ID (UUID) for multi-tenancy';
COMMENT ON COLUMN interviews.transcript IS 'Interview transcript text (alias for raw_transcript)';
COMMENT ON COLUMN interviews.industries IS 'Auto-tagged industries from transcript';
COMMENT ON COLUMN interviews.expertise IS 'Auto-tagged expertise areas from transcript';
COMMENT ON COLUMN interviews.pillars IS 'Auto-tagged pillars: Health, Wealth, Connection';
COMMENT ON COLUMN interviews.tones IS 'Auto-tagged tones: inspiring, tactical, reflective';

COMMENT ON COLUMN interview_quotes.org_id IS 'Organization ID (UUID) for multi-tenancy';

COMMENT ON COLUMN ai_docs.org_id IS 'Organization ID (UUID) for multi-tenancy';

COMMENT ON COLUMN ai_chunks.org_id IS 'Organization ID (UUID) for multi-tenancy';
COMMENT ON COLUMN ai_chunks.interview_id IS 'Interview this chunk belongs to (for interview transcripts)';
COMMENT ON COLUMN ai_chunks.guest_id IS 'Guest this chunk belongs to (for interview transcripts)';

COMMENT ON FUNCTION match_ai_chunks IS 'Vector similarity search with optional org_id filtering. Includes NULL org_id for backwards compatibility.';
COMMENT ON FUNCTION match_ai_chunks_1024 IS 'Vector similarity search (1024-dim) with optional org_id filtering.';

