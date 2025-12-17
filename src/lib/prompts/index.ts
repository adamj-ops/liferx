/**
 * Prompt Library Module
 *
 * Exports all prompt types, data, and state management.
 */

// Types
export type {
  PromptCategory,
  PromptVariable,
  Prompt,
  CategoryInfo,
  PromptCatalog,
} from './types';

// Catalog data
export {
  CATEGORIES,
  PROMPTS,
  PROMPT_CATALOG,
  getPromptsByCategory,
  getPromptById,
  searchPrompts,
  getCategoryInfo,
} from './prompts';

// Store
export {
  usePromptLibraryStore,
  useSidebarOpen,
  useSidebarCollapsed,
  useSearchQuery,
  useExpandedCategories,
  useSelectedPrompt,
  useVariableValues,
  useIsCategoryExpanded,
  usePromptsForCategory,
} from './store';
