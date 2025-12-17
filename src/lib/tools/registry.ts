/**
 * Central Tool Registry
 * 
 * All tools are registered here and can be looked up by name.
 */

import { ToolDefinition } from './types';

// Import tool implementations
import { brainUpsertItem } from './implementations/brain-upsert-item';
import { brainRecordDecision } from './implementations/brain-record-decision';
import { brainAppendMemory } from './implementations/brain-append-memory';
import { guestsUpsertGuest } from './implementations/guests-upsert-guest';
import { interviewsUpsertInterview } from './implementations/interviews-upsert-interview';
import { interviewsAddQuote } from './implementations/interviews-add-quote';
import { interviewsTagTheme } from './implementations/interviews-tag-theme';
import { outreachLogEvent } from './implementations/outreach-log-event';
import { followupsCreate } from './implementations/followups-create';
import { scoringScoreGuest } from './implementations/scoring-score-guest';
import { themesUpsertTheme } from './implementations/themes-upsert-theme';
import { themesLinkToInterview } from './implementations/themes-link-to-interview';

/**
 * Registry of all available tools
 */
const TOOL_REGISTRY: Map<string, ToolDefinition<unknown>> = new Map();

// Register all tools
function registerTool<T>(tool: ToolDefinition<T>): void {
  TOOL_REGISTRY.set(tool.name, tool as ToolDefinition<unknown>);
}

// Brain tools
registerTool(brainUpsertItem);
registerTool(brainRecordDecision);
registerTool(brainAppendMemory);

// Guest tools
registerTool(guestsUpsertGuest);

// Interview tools
registerTool(interviewsUpsertInterview);
registerTool(interviewsAddQuote);
registerTool(interviewsTagTheme);

// Outreach tools
registerTool(outreachLogEvent);

// Followup tools
registerTool(followupsCreate);

// Scoring tools
registerTool(scoringScoreGuest);

// Theme tools
registerTool(themesUpsertTheme);
registerTool(themesLinkToInterview);

/**
 * Get a tool by name
 */
export function getTool(name: string): ToolDefinition<unknown> | undefined {
  return TOOL_REGISTRY.get(name);
}

/**
 * Get all registered tool names
 */
export function getAllToolNames(): string[] {
  return Array.from(TOOL_REGISTRY.keys());
}

/**
 * Get tool metadata (for documentation/help)
 */
export function getToolMetadata(): Array<{ name: string; description: string; version: string }> {
  return Array.from(TOOL_REGISTRY.values()).map(tool => ({
    name: tool.name,
    description: tool.description,
    version: tool.version,
  }));
}
