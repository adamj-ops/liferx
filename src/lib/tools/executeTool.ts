/**
 * Central Tool Executor
 * 
 * Executes tools with proper context, validation, and audit logging.
 */

import { getTool } from './registry';
import { ToolContext, ToolResponse } from './types';
import { logToolEvent } from '../audit/logToolEvent';

/**
 * Execute a tool by name with given args and context
 */
export async function executeTool(
  toolName: string,
  args: unknown,
  context: ToolContext
): Promise<ToolResponse> {
  // Enforce org_id at executor boundary
  if (!context.org_id) {
    return {
      success: false,
      error: {
        code: 'MISSING_ORG_ID',
        message: 'org_id is required for all tool executions',
      },
    };
  }
  
  const tool = getTool(toolName);
  
  if (!tool) {
    return {
      success: false,
      error: {
        code: 'TOOL_NOT_FOUND',
        message: `Tool "${toolName}" not found in registry`,
      },
    };
  }
  
  const startTime = Date.now();
  
  // Log start
  await logToolEvent({
    toolName,
    toolVersion: tool.version,
    args,
    context,
    status: 'started',
  });
  
  try {
    // Execute the tool
    const result = await tool.execute(args, context);
    const durationMs = Date.now() - startTime;
    
    // Log completion
    await logToolEvent({
      toolName,
      toolVersion: tool.version,
      args,
      context,
      status: result.success ? 'completed' : 'error',
      durationMs,
      result,
    });
    
    return result;
  } catch (error) {
    const durationMs = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    const result: ToolResponse = {
      success: false,
      error: {
        code: 'EXECUTION_ERROR',
        message: errorMessage,
      },
    };
    
    // Log error
    await logToolEvent({
      toolName,
      toolVersion: tool.version,
      args,
      context,
      status: 'error',
      durationMs,
      result,
    });
    
    return result;
  }
}
