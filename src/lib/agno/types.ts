/**
 * Canonical Hub event schema for SSE streaming.
 * This contract is locked in to prevent UI assumptions and event drift.
 */
export type HubEvent =
  | { type: 'delta'; content: string }
  | { type: 'tool_start'; tool: string; args?: unknown }
  | { type: 'tool_result'; tool: string; explainability?: unknown; writes?: unknown; data?: unknown }
  | { type: 'final'; next_actions?: string[]; assumptions?: string[]; active_agent?: string };

/**
 * Chat message structure for UI state.
 */
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  nextActions?: string[];
  assumptions?: string[];
}

/**
 * Request payload sent to the Hub.
 */
export interface HubRequest {
  session_id: string;
  messages: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
  org_id: string;
  user?: {
    id?: string;
    email?: string;
  };
}

/**
 * Context passed to tools.
 */
export interface ToolContext {
  org_id: string;
  session_id: string;
  user_id?: string;
  allowWrites: boolean;
  runtime_version: string;
}

/**
 * Standard tool response structure.
 */
export interface ToolResponse<T = unknown> {
  data: T;
  explainability: {
    factors?: Record<string, unknown>;
    tags?: string[];
    reasoning?: string;
  };
  writes: Array<{
    table: string;
    operation: 'insert' | 'update' | 'upsert';
    row_id?: string;
  }>;
  dryRun?: boolean;
}

