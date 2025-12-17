/**
 * LifeRX Agno Types
 * 
 * Re-exports from contract and events modules for backwards compatibility.
 * New code should import directly from contract.ts or events.ts.
 */

// Re-export contract types
export {
  AGNO_CONTRACT_VERSION,
  AGENT_NAMES,
  type AgentName,
  type AgentResponse,
  type ValidationResult,
  validateAgentResponse,
  createFallbackResponse,
  isAgentName,
} from './contract';

// Re-export event types
export {
  type HubEvent,
  type HubEventDelta,
  type HubEventToolStart,
  type HubEventToolResult,
  type HubEventFinal,
  isHubEvent,
  parseSSEEvent,
} from './events';

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
  agent?: string;
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
