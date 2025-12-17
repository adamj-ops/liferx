/**
 * Tool System Types
 * 
 * Defines the canonical types for the tool execution system.
 */

/**
 * Context passed to every tool execution
 */
export interface ToolContext {
  /** Organization ID - REQUIRED for all tool executions */
  org_id: string;
  
  /** Current session ID (for agent sessions) */
  session_id?: string;
  
  /** User ID executing the tool */
  user_id?: string;
  
  /** Whether write operations are allowed */
  allowWrites: boolean;
  
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Request payload for tool execution API
 */
export interface ToolExecuteRequest {
  toolName: string;
  args: unknown;
  context: ToolContext;
}

/**
 * Record of a database write performed by a tool
 */
export interface WriteRecord {
  /** Table that was written to */
  table: string;
  
  /** Type of operation */
  operation: 'insert' | 'update' | 'upsert' | 'delete';
  
  /** ID of the affected row */
  id: string;
}

/**
 * Response returned by all tools
 */
export interface ToolResponse {
  /** Whether the tool execution succeeded */
  success: boolean;
  
  /** Result data (if successful) */
  data?: unknown;
  
  /** Error information (if failed) */
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  
  /** Explainability metadata - why/how the tool did what it did */
  explainability?: Record<string, unknown>;
  
  /** Records of database writes performed */
  writes?: WriteRecord[];
}

/**
 * Definition of a tool
 */
export interface ToolDefinition<TArgs = unknown> {
  /** Unique tool name (e.g., "brain.upsert_item") */
  name: string;
  
  /** Human-readable description */
  description: string;
  
  /** Version of the tool (for explainability) */
  version: string;
  
  /** Execute the tool with given args and context */
  execute: (args: TArgs, context: ToolContext) => Promise<ToolResponse>;
}
