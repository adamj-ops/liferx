'use client';

import { useCallback } from 'react';
import { useToolLibraryStore } from './store';
import type { ToolResponse } from '../types';

interface ExecuteOptions {
  allowWrites?: boolean;
}

/**
 * Hook for executing tools via the /api/tools/execute endpoint.
 * Handles API calls, state updates, and error handling.
 */
export function useToolExecution() {
  const { startExecution, completeExecution, failExecution } =
    useToolLibraryStore();

  const execute = useCallback(
    async (
      toolName: string,
      args: Record<string, unknown>,
      options: ExecuteOptions = {}
    ): Promise<ToolResponse> => {
      const { allowWrites = false } = options;

      // Build context with hardcoded org_id for development
      const context = {
        org_id: process.env.NEXT_PUBLIC_DEFAULT_ORG_ID || 'operator',
        allowWrites,
        user_id: 'tool-library-user',
      };

      try {
        const response = await fetch('/api/tools/execute', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            toolName,
            args,
            context,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          return {
            success: false,
            error: {
              code: `HTTP_${response.status}`,
              message: `Request failed: ${response.statusText}`,
              details: errorText,
            },
          };
        }

        const result: ToolResponse = await response.json();
        return result;
      } catch (err) {
        return {
          success: false,
          error: {
            code: 'NETWORK_ERROR',
            message: err instanceof Error ? err.message : 'Network request failed',
          },
        };
      }
    },
    []
  );

  /**
   * Execute a tool and update store state automatically.
   * Use this for the standard flow in ToolConfigPanel.
   */
  const executeWithState = useCallback(
    async (
      toolName: string,
      args: Record<string, unknown>,
      options: ExecuteOptions = {}
    ): Promise<ToolResponse> => {
      console.log('[useToolExecution] Starting execution for:', toolName);
      startExecution();

      const result = await execute(toolName, args, options);
      console.log('[useToolExecution] Result:', result);

      if (result.success) {
        completeExecution(result);
      } else {
        console.error('[useToolExecution] Tool failed:', result.error);
        failExecution(result.error?.message || 'Tool execution failed');
      }

      return result;
    },
    [execute, startExecution, completeExecution, failExecution]
  );

  return {
    /** Execute without automatic state management */
    execute,
    /** Execute with automatic store state updates */
    executeWithState,
  };
}

export default useToolExecution;
