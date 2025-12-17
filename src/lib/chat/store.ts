/**
 * Chat Store
 * 
 * Zustand-based state management for the LifeRX Brain chat.
 * Provides global access to chat state without prop drilling.
 */

import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type { HubEvent, ChatMessage } from '@/lib/agno/types';
import type { ToolUIPart } from 'ai';

// ============================================================================
// Types
// ============================================================================

interface ToolEvent {
  id: string;
  type: 'tool_start' | 'tool_result';
  tool: string;
  args?: unknown;
  data?: unknown;
  explainability?: unknown;
  timestamp: Date;
  duration?: number;
  status: 'pending' | 'success' | 'error';
}

interface ChatState {
  // Core state
  messages: ChatMessage[];
  isLoading: boolean;
  sessionId: string;

  // Search options
  webSearchEnabled: boolean;
  firecrawlEnabled: boolean;

  // Tool activity
  toolParts: ToolUIPart[];
  toolEvents: ToolEvent[];
  showToolPanel: boolean;

  // Error state
  error: string | null;

  // Actions
  addMessage: (message: ChatMessage) => void;
  updateMessage: (id: string, updates: Partial<ChatMessage>) => void;
  appendToMessage: (id: string, content: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearMessages: () => void;

  // Search actions
  toggleWebSearch: () => void;
  toggleFirecrawl: () => void;

  // Tool actions
  addToolStart: (tool: string, args?: unknown) => string;
  updateToolResult: (toolCallId: string, tool: string, data?: unknown, explainability?: unknown) => void;
  setToolError: (toolCallId: string, tool: string, errorMessage: string) => void;
  toggleToolPanel: () => void;
  clearToolEvents: () => void;

  // Streaming handler
  handleHubEvent: (event: HubEvent, messageId: string) => void;
}

// ============================================================================
// Store
// ============================================================================

export const useChatStore = create<ChatState>((set, get) => ({
  // Initial state
  messages: [],
  isLoading: false,
  sessionId: uuidv4(),
  webSearchEnabled: false,
  firecrawlEnabled: false,
  toolParts: [],
  toolEvents: [],
  showToolPanel: false,
  error: null,
  
  // Message actions
  addMessage: (message) => {
    set((state) => ({
      messages: [...state.messages, message],
    }));
  },
  
  updateMessage: (id, updates) => {
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === id ? { ...m, ...updates } : m
      ),
    }));
  },
  
  appendToMessage: (id, content) => {
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === id ? { ...m, content: m.content + content } : m
      ),
    }));
  },
  
  setLoading: (loading) => {
    set({ isLoading: loading });
  },
  
  setError: (error) => {
    set({ error });
  },
  
  clearMessages: () => {
    set({
      messages: [],
      toolParts: [],
      toolEvents: [],
      error: null,
    });
  },

  // Search actions
  toggleWebSearch: () => {
    set((state) => ({ webSearchEnabled: !state.webSearchEnabled }));
  },

  toggleFirecrawl: () => {
    set((state) => ({ firecrawlEnabled: !state.firecrawlEnabled }));
  },

  // Tool actions
  setToolError: (toolCallId: string, tool: string, errorMessage: string) => {
    set((state) => {
      // Update tool parts to show error
      const toolType = `tool-${tool}` as ToolUIPart['type'];
      const updatedParts = state.toolParts.map((part) => {
        if (part.toolCallId === toolCallId || 
            (part.type === toolType && part.state === 'input-available')) {
          return {
            ...part,
            state: 'output-error' as const,
            output: undefined,
            errorText: errorMessage,
          };
        }
        return part;
      });
      
      // Update tool events
      const updatedEvents = state.toolEvents.map((event) => {
        if (event.id === toolCallId) {
          return {
            ...event,
            type: 'tool_result' as const,
            data: { error: errorMessage },
            duration: Date.now() - event.timestamp.getTime(),
            status: 'error' as const,
          };
        }
        return event;
      });
      
      return {
        toolParts: updatedParts,
        toolEvents: updatedEvents,
      };
    });
  },
  
  addToolStart: (tool, args) => {
    const toolCallId = uuidv4();
    const event: ToolEvent = {
      id: toolCallId,
      type: 'tool_start',
      tool,
      args,
      timestamp: new Date(),
      status: 'pending',
    };
    
    const toolPart: ToolUIPart = {
      type: `tool-${tool}` as ToolUIPart['type'],
      toolCallId,
      state: 'input-available',
      input: args ?? {},
      output: undefined,
      errorText: undefined,
    };
    
    set((state) => ({
      toolParts: [...state.toolParts, toolPart],
      toolEvents: [...state.toolEvents, event],
      showToolPanel: true,
    }));
    
    return toolCallId;
  },
  
  updateToolResult: (toolCallId, tool, data, explainability) => {
    set((state) => {
      // Update tool parts
      const toolType = `tool-${tool}` as ToolUIPart['type'];
      const updatedParts = state.toolParts.map((part) => {
        if (part.toolCallId === toolCallId || 
            (part.type === toolType && part.state === 'input-available')) {
          return {
            ...part,
            state: 'output-available' as const,
            output: { tool, data, explainability },
            errorText: undefined,
          };
        }
        return part;
      });
      
      // Update tool events
      const updatedEvents = state.toolEvents.map((event) => {
        if (event.id === toolCallId) {
          return {
            ...event,
            type: 'tool_result' as const,
            data,
            explainability,
            duration: Date.now() - event.timestamp.getTime(),
            status: 'success' as const,
          };
        }
        return event;
      });
      
      return {
        toolParts: updatedParts,
        toolEvents: updatedEvents,
      };
    });
  },
  
  toggleToolPanel: () => {
    set((state) => ({ showToolPanel: !state.showToolPanel }));
  },
  
  clearToolEvents: () => {
    set({ toolParts: [], toolEvents: [] });
  },
  
  // Hub event handler
  handleHubEvent: (event, messageId) => {
    const state = get();
    
    switch (event.type) {
      case 'delta':
        state.appendToMessage(messageId, event.content);
        break;
        
      case 'tool_start':
        state.addToolStart(event.tool, event.args);
        break;
        
      case 'tool_result':
        // Find the most recent pending tool of this type
        const pendingTool = [...state.toolParts]
          .reverse()
          .find((p) => p.type === `tool-${event.tool}` && p.state === 'input-available');
        
        if (pendingTool) {
          // Check if this is an error result
          const eventData = event.data as { success?: boolean; error?: { message?: string }; errorMessage?: string } | undefined;
          if (eventData && eventData.success === false && (eventData.error || eventData.errorMessage)) {
            const errorMsg = eventData.error?.message || eventData.errorMessage || 'Tool execution failed';
            state.setToolError(pendingTool.toolCallId, event.tool, errorMsg);
          } else {
            state.updateToolResult(
              pendingTool.toolCallId,
              event.tool,
              event.data,
              event.explainability
            );
          }
        }
        break;

      case 'final':
        if ('next_actions' in event && event.next_actions?.length) {
          state.updateMessage(messageId, {
            nextActions: event.next_actions,
            assumptions: event.assumptions,
          });
        }
        break;
    }
  },
}));

// ============================================================================
// Selectors (for optimized re-renders)
// ============================================================================

export const useMessages = () => useChatStore((state) => state.messages);
export const useIsLoading = () => useChatStore((state) => state.isLoading);
export const useToolParts = () => useChatStore((state) => state.toolParts);
export const useToolEvents = () => useChatStore((state) => state.toolEvents);
export const useShowToolPanel = () => useChatStore((state) => state.showToolPanel);
export const useError = () => useChatStore((state) => state.error);
export const useWebSearchEnabled = () => useChatStore((state) => state.webSearchEnabled);
export const useFirecrawlEnabled = () => useChatStore((state) => state.firecrawlEnabled);

