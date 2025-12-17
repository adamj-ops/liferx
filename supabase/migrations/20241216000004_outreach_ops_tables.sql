-- ============================================================================
-- LifeRX Brain v1: Outreach & Ops (EXTENDS EXISTING SCHEMA)
-- ============================================================================
-- Your existing tables: outreach_messages, contributor_opportunities
-- This migration creates additional ops tables and extends existing ones.
-- ============================================================================

-- ============================================================================
-- outreach_events: Log of all outreach activities (NEW TABLE)
-- More granular than existing outreach_messages
-- ============================================================================
CREATE TABLE IF NOT EXISTS outreach_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  guest_id UUID REFERENCES guests(id) ON DELETE SET NULL,
  prospect_id UUID, -- Can't FK to prospects easily since it has different schema
  event_type TEXT NOT NULL CHECK (event_type IN ('email_sent', 'email_opened', 'reply_received', 'meeting_scheduled', 'call_completed', 'social_dm')),
  channel TEXT NOT NULL, -- email, twitter, linkedin, instagram
  subject TEXT,
  content TEXT,
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('pending', 'sent', 'delivered', 'opened', 'replied', 'bounced')),
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_outreach_events_guest_id ON outreach_events(guest_id) WHERE guest_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_outreach_events_prospect_id ON outreach_events(prospect_id) WHERE prospect_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_outreach_events_event_type ON outreach_events(event_type);
CREATE INDEX IF NOT EXISTS idx_outreach_events_channel ON outreach_events(channel);
CREATE INDEX IF NOT EXISTS idx_outreach_events_status ON outreach_events(status);
CREATE INDEX IF NOT EXISTS idx_outreach_events_created_at ON outreach_events(created_at DESC);

-- ============================================================================
-- followups: Follow-up tasks and reminders (NEW TABLE)
-- ============================================================================
CREATE TABLE IF NOT EXISTS followups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  related_type TEXT NOT NULL CHECK (related_type IN ('guest', 'prospect', 'interview', 'outreach')),
  related_id UUID NOT NULL,
  action TEXT NOT NULL,
  due_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  notes TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by TEXT
);

CREATE INDEX IF NOT EXISTS idx_followups_related ON followups(related_type, related_id);
CREATE INDEX IF NOT EXISTS idx_followups_due_at ON followups(due_at) WHERE completed_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_followups_priority ON followups(priority);
CREATE INDEX IF NOT EXISTS idx_followups_pending ON followups(due_at) WHERE completed_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_followups_created_at ON followups(created_at DESC);

DROP TRIGGER IF EXISTS update_followups_updated_at ON followups;
CREATE TRIGGER update_followups_updated_at
  BEFORE UPDATE ON followups
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- EXTEND existing contributor_opportunities table
-- Existing: id, guest_id, criteria, reason, status, created_at
-- ============================================================================
DO $$ 
BEGIN
  -- Add prospect_id if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'contributor_opportunities' AND column_name = 'prospect_id') THEN
    ALTER TABLE contributor_opportunities ADD COLUMN prospect_id UUID;
  END IF;

  -- Add invite_type if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'contributor_opportunities' AND column_name = 'invite_type') THEN
    ALTER TABLE contributor_opportunities ADD COLUMN invite_type TEXT;
  END IF;

  -- Add format if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'contributor_opportunities' AND column_name = 'format') THEN
    ALTER TABLE contributor_opportunities ADD COLUMN format TEXT;
  END IF;

  -- Add personalization if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'contributor_opportunities' AND column_name = 'personalization') THEN
    ALTER TABLE contributor_opportunities ADD COLUMN personalization JSONB;
  END IF;

  -- Add sent_at if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'contributor_opportunities' AND column_name = 'sent_at') THEN
    ALTER TABLE contributor_opportunities ADD COLUMN sent_at TIMESTAMPTZ;
  END IF;

  -- Add responded_at if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'contributor_opportunities' AND column_name = 'responded_at') THEN
    ALTER TABLE contributor_opportunities ADD COLUMN responded_at TIMESTAMPTZ;
  END IF;

  -- Add expires_at if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'contributor_opportunities' AND column_name = 'expires_at') THEN
    ALTER TABLE contributor_opportunities ADD COLUMN expires_at TIMESTAMPTZ;
  END IF;

  -- Add response_notes if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'contributor_opportunities' AND column_name = 'response_notes') THEN
    ALTER TABLE contributor_opportunities ADD COLUMN response_notes TEXT;
  END IF;

  -- Add metadata if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'contributor_opportunities' AND column_name = 'metadata') THEN
    ALTER TABLE contributor_opportunities ADD COLUMN metadata JSONB;
  END IF;

  -- Add updated_at if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'contributor_opportunities' AND column_name = 'updated_at') THEN
    ALTER TABLE contributor_opportunities ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_contributor_opportunities_prospect_id ON contributor_opportunities(prospect_id) WHERE prospect_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_contributor_opportunities_invite_type ON contributor_opportunities(invite_type) WHERE invite_type IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_contributor_opportunities_format ON contributor_opportunities(format) WHERE format IS NOT NULL;

-- ============================================================================
-- Comments
-- ============================================================================
COMMENT ON TABLE outreach_events IS 'Log of all outreach activities with status tracking.';
COMMENT ON TABLE followups IS 'Follow-up tasks with priority and due dates.';
