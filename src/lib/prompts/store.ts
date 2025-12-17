/**
 * Prompt Library Store
 *
 * Zustand store for managing prompt library state.
 */

import { create } from 'zustand';
import type { Prompt, PromptCategory } from './types';
import { PROMPTS, CATEGORIES, searchPrompts, getPromptsByCategory } from './prompts';

interface PromptLibraryState {
  // Sidebar state
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;

  // Search & filtering
  searchQuery: string;
  expandedCategories: PromptCategory[];

  // Selected prompt (for variable input)
  selectedPrompt: Prompt | null;
  variableValues: Record<string, string>;

  // Actions
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebarCollapsed: () => void;

  setSearchQuery: (query: string) => void;
  toggleCategory: (category: PromptCategory) => void;
  expandAllCategories: () => void;
  collapseAllCategories: () => void;

  selectPrompt: (prompt: Prompt) => void;
  clearSelection: () => void;
  setVariableValue: (name: string, value: string) => void;
  resetVariables: () => void;

  // Computed
  getFilteredPrompts: () => Prompt[];
}

export const usePromptLibraryStore = create<PromptLibraryState>((set, get) => ({
  // Initial state
  sidebarOpen: false,
  sidebarCollapsed: false,
  searchQuery: '',
  expandedCategories: ['research', 'content'], // Start with these expanded
  selectedPrompt: null,
  variableValues: {},

  // Actions
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebarCollapsed: () =>
    set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

  setSearchQuery: (query) => set({ searchQuery: query }),

  toggleCategory: (category) =>
    set((state) => ({
      expandedCategories: state.expandedCategories.includes(category)
        ? state.expandedCategories.filter((c) => c !== category)
        : [...state.expandedCategories, category],
    })),

  expandAllCategories: () =>
    set({ expandedCategories: CATEGORIES.map((c) => c.id) }),

  collapseAllCategories: () => set({ expandedCategories: [] }),

  selectPrompt: (prompt) => {
    // Initialize variable values with defaults
    const defaults: Record<string, string> = {};
    prompt.variables?.forEach((v) => {
      defaults[v.name] = v.default || '';
    });
    set({ selectedPrompt: prompt, variableValues: defaults });
  },

  clearSelection: () => set({ selectedPrompt: null, variableValues: {} }),

  setVariableValue: (name, value) =>
    set((state) => ({
      variableValues: { ...state.variableValues, [name]: value },
    })),

  resetVariables: () => {
    const { selectedPrompt } = get();
    if (selectedPrompt) {
      const defaults: Record<string, string> = {};
      selectedPrompt.variables?.forEach((v) => {
        defaults[v.name] = v.default || '';
      });
      set({ variableValues: defaults });
    }
  },

  // Computed
  getFilteredPrompts: () => {
    const { searchQuery } = get();
    if (searchQuery.trim()) {
      return searchPrompts(searchQuery);
    }
    return PROMPTS;
  },
}));

// Selector hooks for optimized re-renders
export const useSidebarOpen = () =>
  usePromptLibraryStore((state) => state.sidebarOpen);

export const useSidebarCollapsed = () =>
  usePromptLibraryStore((state) => state.sidebarCollapsed);

export const useSearchQuery = () =>
  usePromptLibraryStore((state) => state.searchQuery);

export const useExpandedCategories = () =>
  usePromptLibraryStore((state) => state.expandedCategories);

export const useSelectedPrompt = () =>
  usePromptLibraryStore((state) => state.selectedPrompt);

export const useVariableValues = () =>
  usePromptLibraryStore((state) => state.variableValues);

export const useIsCategoryExpanded = (category: PromptCategory) =>
  usePromptLibraryStore((state) => state.expandedCategories.includes(category));

export const usePromptsForCategory = (category: PromptCategory) => {
  const searchQuery = usePromptLibraryStore((state) => state.searchQuery);
  if (searchQuery.trim()) {
    return searchPrompts(searchQuery).filter((p) => p.category === category);
  }
  return getPromptsByCategory(category);
};
