/**
 * Prompt Library Types
 *
 * Defines the types for the visual prompt library system.
 */

export type PromptCategory =
  | 'research'
  | 'scoring'
  | 'content'
  | 'communication'
  | 'analytics';

export interface PromptVariable {
  /** Variable key (e.g., "guest_name") */
  name: string;
  /** Human-readable label */
  label: string;
  /** Placeholder text */
  placeholder?: string;
  /** Default value */
  default?: string;
}

export interface Prompt {
  /** Unique identifier (e.g., "research.guest_bio") */
  id: string;
  /** Human-readable name */
  name: string;
  /** Short description of what this prompt does */
  description: string;
  /** Prompt category */
  category: PromptCategory;
  /** Lucide icon name */
  icon: string;
  /** The actual prompt template with {variable} placeholders */
  template: string;
  /** Variables that can be filled in */
  variables?: PromptVariable[];
  /** Tags for search/filtering */
  tags?: string[];
}

export interface CategoryInfo {
  id: PromptCategory;
  name: string;
  icon: string;
  description: string;
}

export interface PromptCatalog {
  categories: CategoryInfo[];
  prompts: Prompt[];
}
