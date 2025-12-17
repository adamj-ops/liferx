/**
 * Tool Catalog Types
 *
 * Defines the types for the visual tool library system.
 */

export type ToolCategory =
  | 'research'
  | 'scoring'
  | 'content'
  | 'communication'
  | 'analytics';

export type ToolStatus = 'available' | 'coming_soon' | 'beta';

export type ParameterType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'select'
  | 'multiselect'
  | 'date'
  | 'json'
  | 'textarea';

export interface ToolParameter {
  /** Parameter key name */
  name: string;
  /** Human-readable label */
  label: string;
  /** Input type */
  type: ParameterType;
  /** Whether this parameter is required */
  required: boolean;
  /** Default value */
  default?: unknown;
  /** Options for select/multiselect types */
  options?: { value: string; label: string }[];
  /** Placeholder text */
  placeholder?: string;
  /** Help text description */
  description?: string;
  /** Validation rules */
  validation?: {
    min?: number;
    max?: number;
    minLength?: number;
    maxLength?: number;
    pattern?: string;
  };
}

export interface CatalogTool {
  /** Unique tool identifier (e.g., "research.scrape_profile") */
  id: string;
  /** Human-readable name */
  name: string;
  /** What the tool does */
  description: string;
  /** Tool category */
  category: ToolCategory;
  /** Lucide icon name */
  icon: string;
  /** Availability status */
  status: ToolStatus;
  /** Input parameters */
  parameters: ToolParameter[];
  /** Output description */
  outputs: {
    description: string;
    example?: unknown;
  };
  /** Links to actual tool in registry (if implemented) */
  toolName?: string;
  /** Whether this tool performs write operations */
  requiresWrites: boolean;
  /** Estimated execution time */
  estimatedDuration?: string;
  /** Tags for search/filtering */
  tags?: string[];
}

export interface CategoryInfo {
  id: ToolCategory;
  name: string;
  icon: string;
  description: string;
}

export interface ToolCatalog {
  categories: CategoryInfo[];
  tools: CatalogTool[];
}

/** Tool execution state */
export type ToolExecutionStatus =
  | 'idle'
  | 'validating'
  | 'running'
  | 'success'
  | 'error';

export interface ToolExecutionState {
  status: ToolExecutionStatus;
  progress?: number;
  result?: unknown;
  error?: string;
  startedAt?: Date;
  completedAt?: Date;
}
