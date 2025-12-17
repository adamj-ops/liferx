/**
 * LifeRX Streaming Event Contract
 * 
 * Defines the canonical SSE event types emitted by the Agno Hub.
 * The UI ONLY consumes these event types - nothing else.
 * 
 * @version v1
 */

import type { AgentResponse } from './contract';
import { AGNO_CONTRACT_VERSION } from './contract';

// Re-export for convenience
export { AGNO_CONTRACT_VERSION };
export type { AgentResponse };

/**
 * Canonical SSE event types.
 * 
 * - delta: Incremental assistant text (streaming)
 * - tool_start: Tool invocation started (minimal, no args)
 * - tool_result: Tool completed with result
 * - final: Response complete with full AgentResponse payload
 */
export type HubEvent =
  | HubEventDelta
  | HubEventToolStart
  | HubEventToolResult
  | HubEventFinal;

/** Incremental text content during streaming */
export interface HubEventDelta {
  type: 'delta';
  content: string;
}

/** Tool invocation started - kept minimal to avoid leaking internals */
export interface HubEventToolStart {
  type: 'tool_start';
  tool: string;
}

/** Tool completed with result and optional explainability */
export interface HubEventToolResult {
  type: 'tool_result';
  tool: string;
  explainability?: Record<string, unknown>;
  data?: unknown;
}

/** Final response wrapping the full AgentResponse contract */
export interface HubEventFinal {
  type: 'final';
  payload: AgentResponse;
}

/**
 * Type guard to check if an object is a valid HubEvent.
 * Does not validate the payload structure - use validateAgentResponse for that.
 */
export function isHubEvent(obj: unknown): obj is HubEvent {
  if (!obj || typeof obj !== 'object') return false;
  
  const event = obj as Record<string, unknown>;
  const type = event.type;
  
  if (typeof type !== 'string') return false;
  
  switch (type) {
    case 'delta':
      return typeof event.content === 'string';
    case 'tool_start':
      return typeof event.tool === 'string';
    case 'tool_result':
      return typeof event.tool === 'string';
    case 'final':
      return event.payload !== undefined && typeof event.payload === 'object';
    default:
      return false;
  }
}

/**
 * Parse an SSE data line into a HubEvent.
 * Returns null if the line is not a valid event.
 */
export function parseSSEEvent(line: string): HubEvent | null {
  if (!line.startsWith('data: ')) return null;
  
  const data = line.slice(6).trim();
  if (data === '[DONE]') return null;
  
  try {
    const parsed = JSON.parse(data);
    if (isHubEvent(parsed)) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

