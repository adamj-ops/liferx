/**
 * Audit logging for tool executions
 * Logs to the existing ai_tool_logs table (extended with new columns)
 */

import { createServerClient } from '../supabase/server';
import type { ToolResponse, ToolContext, WriteRecord } from '../tools/types';

interface ToolLogEntry {
  toolName: string;
  toolVersion: string;
  args: unknown;
  context: ToolContext;
  status: 'started' | 'completed' | 'error';
  durationMs?: number;
  result?: ToolResponse;
}

/**
 * Log a tool execution event to ai_tool_logs
 */
export async function logToolEvent(entry: ToolLogEntry): Promise<void> {
  const supabase = createServerClient();
  
  try {
    await supabase.from('ai_tool_logs').insert({
      tool_name: entry.toolName,
      tool_version: entry.toolVersion,
      input: entry.args as Record<string, unknown>,
      output: entry.result?.data as Record<string, unknown> ?? null,
      status: entry.status,
      duration_ms: entry.durationMs,
      error_message: entry.result?.error?.message,
      writes: entry.result?.writes as WriteRecord[] ?? null,
      session_id: entry.context.session_id ?? null,
      user_id: entry.context.user_id ?? null,
    });
  } catch (error) {
    // Don't let logging failures break tool execution
    console.error('Failed to log tool event:', error);
  }
}

/**
 * Create a hash of tool args for deduplication/caching
 */
export function hashArgs(args: unknown): string {
  const str = JSON.stringify(args);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
}
