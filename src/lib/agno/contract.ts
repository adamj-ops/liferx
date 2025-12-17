/**
 * LifeRX Agent Response Contract
 * 
 * This contract defines the non-negotiable structure for all agent responses.
 * All agents MUST comply with this contract. Violations are logged and replaced
 * with fallback responses to maintain system stability.
 * 
 * @version v1
 */

// Contract version for evolution tracking
export const AGNO_CONTRACT_VERSION = 'v1' as const;

// Valid agent names - Hub routes to these specialists
export const AGENT_NAMES = ['Ops', 'Content', 'Growth', 'Systems'] as const;
export type AgentName = (typeof AGENT_NAMES)[number];

/**
 * Canonical agent response structure.
 * Every agent response MUST match this shape.
 */
export interface AgentResponse {
  /** Contract version for compatibility tracking */
  version: typeof AGNO_CONTRACT_VERSION;
  /** The agent that produced this response */
  agent: AgentName;
  /** The response content (markdown allowed) */
  content: string;
  /** Explicit list of assumptions made (optional but encouraged) */
  assumptions?: string[];
  /** Required list of next actions - MUST be non-empty */
  next_actions: string[];
}

// Allowed keys for strict validation (rejects unknown fields)
const ALLOWED_KEYS = new Set(['version', 'agent', 'content', 'assumptions', 'next_actions']);

/**
 * Validation result type
 */
export type ValidationResult =
  | { valid: true; data: AgentResponse }
  | { valid: false; errors: string[] };

/**
 * Validates an object against the AgentResponse contract.
 * Rejects unknown keys to prevent schema creep.
 * 
 * @param obj - The object to validate
 * @returns Validation result with either the typed data or error messages
 */
export function validateAgentResponse(obj: unknown): ValidationResult {
  const errors: string[] = [];

  if (!obj || typeof obj !== 'object') {
    return { valid: false, errors: ['Response must be an object'] };
  }

  const record = obj as Record<string, unknown>;

  // Reject unknown keys - prevents schema creep
  for (const key of Object.keys(record)) {
    if (!ALLOWED_KEYS.has(key)) {
      errors.push(`Unknown key: ${key}`);
    }
  }

  // Validate version
  if (record.version !== AGNO_CONTRACT_VERSION) {
    errors.push(`Invalid version: expected ${AGNO_CONTRACT_VERSION}, got ${record.version}`);
  }

  // Validate agent name
  if (!AGENT_NAMES.includes(record.agent as AgentName)) {
    errors.push(`Invalid agent: ${record.agent}. Must be one of: ${AGENT_NAMES.join(', ')}`);
  }

  // Validate content
  if (typeof record.content !== 'string') {
    errors.push('content must be a string');
  }

  // Validate next_actions (REQUIRED, non-empty)
  if (!Array.isArray(record.next_actions)) {
    errors.push('next_actions must be an array');
  } else if (record.next_actions.length === 0) {
    errors.push('next_actions must be non-empty');
  } else {
    // Validate each action is a string
    for (let i = 0; i < record.next_actions.length; i++) {
      if (typeof record.next_actions[i] !== 'string') {
        errors.push(`next_actions[${i}] must be a string`);
      }
    }
  }

  // Validate assumptions if present
  if (record.assumptions !== undefined) {
    if (!Array.isArray(record.assumptions)) {
      errors.push('assumptions must be an array if provided');
    } else {
      for (let i = 0; i < record.assumptions.length; i++) {
        if (typeof record.assumptions[i] !== 'string') {
          errors.push(`assumptions[${i}] must be a string`);
        }
      }
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return { valid: true, data: obj as AgentResponse };
}

/**
 * Creates a fallback response for contract violations.
 * Used when an agent produces an invalid response to maintain UX.
 * 
 * @param errors - The validation errors that occurred
 * @returns A valid AgentResponse that informs the user of the issue
 */
export function createFallbackResponse(errors: string[]): AgentResponse {
  return {
    version: AGNO_CONTRACT_VERSION,
    agent: 'Systems',
    content: 'The assistant produced an invalid response format. This has been logged for review.',
    assumptions: [
      'Agent response failed contract validation',
      ...errors.slice(0, 5), // Cap at 5 errors to avoid noise
    ],
    next_actions: [
      'Retry the request',
      'If this persists, check agent instructions',
      'Review contract enforcement logs',
    ],
  };
}

/**
 * Type guard to check if a string is a valid AgentName
 */
export function isAgentName(name: unknown): name is AgentName {
  return typeof name === 'string' && AGENT_NAMES.includes(name as AgentName);
}

