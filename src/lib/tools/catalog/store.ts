/**
 * Tool Library Store
 *
 * Zustand store for managing the tool library UI state.
 */

import { create } from 'zustand';
import type {
  CatalogTool,
  ToolCategory,
  ToolExecutionState,
  ToolExecutionStatus,
} from './types';
import { getToolById, getToolsByCategory, searchTools, TOOLS } from './tools';

interface ToolLibraryState {
  // Sidebar state
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;

  // Category state
  expandedCategories: Set<ToolCategory>;

  // Search/filter state
  searchQuery: string;
  filteredTools: CatalogTool[];

  // Selection state
  selectedTool: CatalogTool | null;
  configPanelOpen: boolean;

  // Execution state
  executionState: ToolExecutionState;
  parameterValues: Record<string, unknown>;

  // Actions - Sidebar
  openSidebar: () => void;
  closeSidebar: () => void;
  toggleSidebar: () => void;
  collapseSidebar: () => void;
  expandSidebar: () => void;
  toggleSidebarCollapse: () => void;

  // Actions - Categories
  expandCategory: (category: ToolCategory) => void;
  collapseCategory: (category: ToolCategory) => void;
  toggleCategory: (category: ToolCategory) => void;
  expandAllCategories: () => void;
  collapseAllCategories: () => void;

  // Actions - Search/Filter
  setSearchQuery: (query: string) => void;
  clearSearch: () => void;
  filterByCategory: (category: ToolCategory | null) => void;

  // Actions - Selection
  selectTool: (toolId: string) => void;
  clearSelection: () => void;
  openConfigPanel: () => void;
  closeConfigPanel: () => void;

  // Actions - Parameters
  setParameterValue: (name: string, value: unknown) => void;
  setParameterValues: (values: Record<string, unknown>) => void;
  resetParameters: () => void;

  // Actions - Execution
  startExecution: () => void;
  setExecutionProgress: (progress: number) => void;
  completeExecution: (result: unknown) => void;
  failExecution: (error: string) => void;
  resetExecution: () => void;
}

const ALL_CATEGORIES: ToolCategory[] = [
  'research',
  'scoring',
  'content',
  'communication',
  'analytics',
];

export const useToolLibraryStore = create<ToolLibraryState>((set, get) => ({
  // Initial state
  sidebarOpen: false,
  sidebarCollapsed: false,
  expandedCategories: new Set<ToolCategory>(['research']),
  searchQuery: '',
  filteredTools: TOOLS,
  selectedTool: null,
  configPanelOpen: false,
  executionState: { status: 'idle' },
  parameterValues: {},

  // Sidebar actions
  openSidebar: () => set({ sidebarOpen: true }),
  closeSidebar: () => set({ sidebarOpen: false, configPanelOpen: false }),
  toggleSidebar: () =>
    set((state) => ({
      sidebarOpen: !state.sidebarOpen,
      configPanelOpen: state.sidebarOpen ? false : state.configPanelOpen,
    })),
  collapseSidebar: () => set({ sidebarCollapsed: true }),
  expandSidebar: () => set({ sidebarCollapsed: false }),
  toggleSidebarCollapse: () =>
    set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

  // Category actions
  expandCategory: (category) =>
    set((state) => ({
      expandedCategories: new Set([...state.expandedCategories, category]),
    })),
  collapseCategory: (category) =>
    set((state) => {
      const newExpanded = new Set(state.expandedCategories);
      newExpanded.delete(category);
      return { expandedCategories: newExpanded };
    }),
  toggleCategory: (category) =>
    set((state) => {
      const newExpanded = new Set(state.expandedCategories);
      if (newExpanded.has(category)) {
        newExpanded.delete(category);
      } else {
        newExpanded.add(category);
      }
      return { expandedCategories: newExpanded };
    }),
  expandAllCategories: () =>
    set({ expandedCategories: new Set(ALL_CATEGORIES) }),
  collapseAllCategories: () => set({ expandedCategories: new Set() }),

  // Search/Filter actions
  setSearchQuery: (query) =>
    set({
      searchQuery: query,
      filteredTools: query.trim() ? searchTools(query) : TOOLS,
    }),
  clearSearch: () => set({ searchQuery: '', filteredTools: TOOLS }),
  filterByCategory: (category) =>
    set({
      filteredTools: category ? getToolsByCategory(category) : TOOLS,
      searchQuery: '',
    }),

  // Selection actions
  selectTool: (toolId) => {
    const tool = getToolById(toolId);
    if (tool) {
      // Initialize parameter values with defaults
      const defaultValues: Record<string, unknown> = {};
      tool.parameters.forEach((param) => {
        if (param.default !== undefined) {
          defaultValues[param.name] = param.default;
        }
      });

      set({
        selectedTool: tool,
        configPanelOpen: true,
        parameterValues: defaultValues,
        executionState: { status: 'idle' },
      });
    }
  },
  clearSelection: () =>
    set({
      selectedTool: null,
      configPanelOpen: false,
      parameterValues: {},
      executionState: { status: 'idle' },
    }),
  openConfigPanel: () => set({ configPanelOpen: true }),
  closeConfigPanel: () => set({ configPanelOpen: false }),

  // Parameter actions
  setParameterValue: (name, value) =>
    set((state) => ({
      parameterValues: { ...state.parameterValues, [name]: value },
    })),
  setParameterValues: (values) =>
    set((state) => ({
      parameterValues: { ...state.parameterValues, ...values },
    })),
  resetParameters: () => {
    const { selectedTool } = get();
    if (selectedTool) {
      const defaultValues: Record<string, unknown> = {};
      selectedTool.parameters.forEach((param) => {
        if (param.default !== undefined) {
          defaultValues[param.name] = param.default;
        }
      });
      set({ parameterValues: defaultValues });
    } else {
      set({ parameterValues: {} });
    }
  },

  // Execution actions
  startExecution: () =>
    set({
      executionState: {
        status: 'running',
        progress: 0,
        startedAt: new Date(),
      },
    }),
  setExecutionProgress: (progress) =>
    set((state) => ({
      executionState: { ...state.executionState, progress },
    })),
  completeExecution: (result) =>
    set((state) => ({
      executionState: {
        ...state.executionState,
        status: 'success',
        result,
        completedAt: new Date(),
      },
    })),
  failExecution: (error) =>
    set((state) => ({
      executionState: {
        ...state.executionState,
        status: 'error',
        error,
        completedAt: new Date(),
      },
    })),
  resetExecution: () => set({ executionState: { status: 'idle' } }),
}));

// Selector hooks for common derived state
export const useSidebarOpen = () =>
  useToolLibraryStore((state) => state.sidebarOpen);
export const useSidebarCollapsed = () =>
  useToolLibraryStore((state) => state.sidebarCollapsed);
export const useSelectedTool = () =>
  useToolLibraryStore((state) => state.selectedTool);
export const useConfigPanelOpen = () =>
  useToolLibraryStore((state) => state.configPanelOpen);
export const useFilteredTools = () =>
  useToolLibraryStore((state) => state.filteredTools);
export const useSearchQuery = () =>
  useToolLibraryStore((state) => state.searchQuery);
export const useExpandedCategories = () =>
  useToolLibraryStore((state) => state.expandedCategories);
export const useExecutionState = () =>
  useToolLibraryStore((state) => state.executionState);
export const useParameterValues = () =>
  useToolLibraryStore((state) => state.parameterValues);

// Helper to check if a category is expanded
export const useIsCategoryExpanded = (category: ToolCategory) =>
  useToolLibraryStore((state) => state.expandedCategories.has(category));

// Helper to get tools for a specific category from filtered results
export const useToolsForCategory = (category: ToolCategory) =>
  useToolLibraryStore((state) =>
    state.filteredTools.filter((tool) => tool.category === category)
  );
