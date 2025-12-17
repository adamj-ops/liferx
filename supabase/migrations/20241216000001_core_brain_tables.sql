-- ============================================================================
-- LifeRX Brain v1: Core Brain Tables (EXTENDS EXISTING SCHEMA)
-- ============================================================================
-- This migration ADDS new tables that don't exist yet.
-- It does NOT recreate existing tables like ai_tool_logs.
-- ============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- brain_items: Typed brain entries (NEW TABLE)
-- ============================================================================
CREATE TABLE IF NOT EXISTS brain_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL CHECK (type IN ('decision', 'sop', 'principle', 'playbook', 'note', 'insight')),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by TEXT, -- matches ai_users.id (text-based)
  updated_by TEXT
);

-- Indexes for brain_items
CREATE INDEX IF NOT EXISTS idx_brain_items_type ON brain_items(type);
CREATE INDEX IF NOT EXISTS idx_brain_items_created_at ON brain_items(created_at DESC);

-- Updated_at trigger function (if not exists)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_brain_items_updated_at ON brain_items;
CREATE TRIGGER update_brain_items_updated_at
  BEFORE UPDATE ON brain_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- themes: Cross-cutting themes (NEW TABLE)
-- ============================================================================
CREATE TABLE IF NOT EXISTS themes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  pillar TEXT CHECK (pillar IN ('health', 'wealth', 'connection') OR pillar IS NULL),
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by TEXT,
  updated_by TEXT
);

CREATE INDEX IF NOT EXISTS idx_themes_pillar ON themes(pillar);
CREATE INDEX IF NOT EXISTS idx_themes_name ON themes(name);

DROP TRIGGER IF EXISTS update_themes_updated_at ON themes;
CREATE TRIGGER update_themes_updated_at
  BEFORE UPDATE ON themes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- agent_sessions: Track agent conversation sessions (NEW TABLE)
-- Separate from existing chat_threads / ai_chat_sessions
-- ============================================================================
CREATE TABLE IF NOT EXISTS agent_sessions (
  id UUID PRIMARY KEY,
  user_id TEXT, -- matches ai_users.id
  runtime_version TEXT NOT NULL DEFAULT '1.0.0',
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_sessions_user_id ON agent_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_sessions_started_at ON agent_sessions(started_at DESC);

DROP TRIGGER IF EXISTS update_agent_sessions_updated_at ON agent_sessions;
CREATE TRIGGER update_agent_sessions_updated_at
  BEFORE UPDATE ON agent_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- agent_messages: Messages within agent sessions (NEW TABLE)
-- ============================================================================
CREATE TABLE IF NOT EXISTS agent_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES agent_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_messages_session_id ON agent_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_agent_messages_created_at ON agent_messages(created_at DESC);

-- ============================================================================
-- agent_memory: Agent memory storage (NEW TABLE)
-- Extends existing brain_memories with structure
-- ============================================================================
CREATE TABLE IF NOT EXISTS agent_memory (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES agent_sessions(id) ON DELETE SET NULL,
  key TEXT NOT NULL,
  value JSONB NOT NULL,
  memory_type TEXT NOT NULL DEFAULT 'short_term' CHECK (memory_type IN ('short_term', 'long_term', 'episodic')),
  expires_at TIMESTAMPTZ,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_memory_session_id ON agent_memory(session_id);
CREATE INDEX IF NOT EXISTS idx_agent_memory_key ON agent_memory(key);
CREATE INDEX IF NOT EXISTS idx_agent_memory_expires_at ON agent_memory(expires_at) WHERE expires_at IS NOT NULL;

DROP TRIGGER IF EXISTS update_agent_memory_updated_at ON agent_memory;
CREATE TRIGGER update_agent_memory_updated_at
  BEFORE UPDATE ON agent_memory
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- EXTEND existing ai_tool_logs with new columns (ADD COLUMNS)
-- Existing columns: id, session_id, user_id, tool_name, input, output, created_at
-- ============================================================================
DO $$ 
BEGIN
  -- Add tool_version if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'ai_tool_logs' AND column_name = 'tool_version') THEN
    ALTER TABLE ai_tool_logs ADD COLUMN tool_version TEXT DEFAULT '1.0.0';
  END IF;

  -- Add status if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'ai_tool_logs' AND column_name = 'status') THEN
    ALTER TABLE ai_tool_logs ADD COLUMN status TEXT DEFAULT 'completed' CHECK (status IN ('started', 'completed', 'error'));
  END IF;

  -- Add duration_ms if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'ai_tool_logs' AND column_name = 'duration_ms') THEN
    ALTER TABLE ai_tool_logs ADD COLUMN duration_ms INTEGER;
  END IF;

  -- Add error_message if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'ai_tool_logs' AND column_name = 'error_message') THEN
    ALTER TABLE ai_tool_logs ADD COLUMN error_message TEXT;
  END IF;

  -- Add writes if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'ai_tool_logs' AND column_name = 'writes') THEN
    ALTER TABLE ai_tool_logs ADD COLUMN writes JSONB;
  END IF;
END $$;

-- ============================================================================
-- Comments for documentation
-- ============================================================================
COMMENT ON TABLE brain_items IS 'Typed brain entries: decisions, SOPs, principles, playbooks, notes, insights. Version tracked.';
COMMENT ON TABLE themes IS 'Cross-cutting themes with optional Health/Wealth/Connection pillar alignment.';
COMMENT ON TABLE agent_sessions IS 'Agent conversation sessions with runtime version tracking.';
COMMENT ON TABLE agent_messages IS 'Individual messages within agent sessions.';
COMMENT ON TABLE agent_memory IS 'Agent memory storage with TTL support.';
