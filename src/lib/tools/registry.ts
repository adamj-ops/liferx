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
import { brainSearch } from './implementations/brain-search';
import { guestsUpsertGuest } from './implementations/guests-upsert-guest';
import { guestsEnrichProfiles } from './implementations/guests-enrich-profiles';
import { guestPersonasUpsert } from './implementations/guest-personas-upsert';
import { interviewsUpsertInterview } from './implementations/interviews-upsert-interview';
import { interviewsAddQuote } from './implementations/interviews-add-quote';
import { interviewsTagTheme } from './implementations/interviews-tag-theme';
import { interviewsAutoTag } from './implementations/interviews-auto-tag';
import { interviewsExtractDefiningQuotes } from './implementations/interviews-extract-defining-quotes';
import { interviewsBuildSemanticIndex } from './implementations/interviews-build-semantic-index';
import { outreachLogEvent } from './implementations/outreach-log-event';
import { outreachCreateCampaign } from './implementations/outreach-create-campaign';
import { outreachUpsertThread } from './implementations/outreach-upsert-thread';
import { outreachComposeMessage } from './implementations/outreach-compose-message';
import { outreachQueueSend } from './implementations/outreach-queue-send';
import { outreachMarkSent } from './implementations/outreach-mark-sent';
import { outreachRecordInbound } from './implementations/outreach-record-inbound';
import { outreachSendEmail } from './implementations/outreach-send-email';
import { followupsCreate } from './implementations/followups-create';
import { followupsCreateForThread } from './implementations/followups-create-for-thread';
import { scoringScoreGuest } from './implementations/scoring-score-guest';
import { themesUpsertTheme } from './implementations/themes-upsert-theme';
import { themesLinkToInterview } from './implementations/themes-link-to-interview';
import { contentGenerateQuoteCard } from './implementations/content-generate-quote-card';
import { contentGenerateCarouselOutline } from './implementations/content-generate-carousel-outline';
import { contentGenerateShortformScript } from './implementations/content-generate-shortform-script';
import { contentGeneratePostIdeas } from './implementations/content-generate-post-ideas';

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
registerTool(brainSearch);

// Guest tools
registerTool(guestsUpsertGuest);
registerTool(guestsEnrichProfiles);
registerTool(guestPersonasUpsert);

// Interview tools
registerTool(interviewsUpsertInterview);
registerTool(interviewsAddQuote);
registerTool(interviewsTagTheme);
registerTool(interviewsAutoTag);
registerTool(interviewsExtractDefiningQuotes);
registerTool(interviewsBuildSemanticIndex);

// Outreach tools (Pipeline 4)
registerTool(outreachLogEvent);
registerTool(outreachCreateCampaign);
registerTool(outreachUpsertThread);
registerTool(outreachComposeMessage);
registerTool(outreachQueueSend);
registerTool(outreachMarkSent);
registerTool(outreachRecordInbound);
registerTool(outreachSendEmail);

// Followup tools
registerTool(followupsCreate);
registerTool(followupsCreateForThread);

// Scoring tools
registerTool(scoringScoreGuest);

// Theme tools
registerTool(themesUpsertTheme);
registerTool(themesLinkToInterview);

// Content tools (Pipeline 3)
registerTool(contentGenerateQuoteCard);
registerTool(contentGenerateCarouselOutline);
registerTool(contentGenerateShortformScript);
registerTool(contentGeneratePostIdeas);

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
