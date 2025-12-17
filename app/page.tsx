'use client';

import type { FormEvent, ReactNode } from 'react';
import { useCallback, useMemo, useState } from 'react';
import {
  useChatStore,
  useMessages,
  useIsLoading,
  useToolParts,
  useShowToolPanel,
  useError,
  useToolEvents,
  useWebSearchEnabled,
  useFirecrawlEnabled,
} from '@/lib/chat/store';
import { usePromptLibraryStore } from '@/lib/prompts';
import { sendMessage } from '@/lib/chat/send-message';
import { AIDevTools } from '@/components/ai-devtools';
import { ThemeToggle } from '@/components/theme-toggle';
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from '@/components/ai-elements/conversation';
import {
  Message,
  MessageContent,
} from '@/components/ai-elements/message';
import { Response } from '@/components/ai-elements/response';
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputToolbar,
  PromptInputTools,
  PromptInputButton,
  PromptInputSubmit,
} from '@/components/ai-elements/prompt-input';
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
} from '@/components/ai-elements/tool';
import { Suggestions, Suggestion } from '@/components/ai-elements/suggestion';
import { Loader } from '@/components/ai-elements/loader';
import { PromptLibrarySidebar } from '@/components/prompt-library';
import { FileUploadModal } from '@/components/file-upload';
import { QuickCalendarDialog } from '@/components/calendar/QuickCalendarDialog';
import { Button } from '@/components/ui/button';
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Flame,
  Globe,
  Loader2,
  Menu,
  Mic,
  Paperclip,
  RotateCcw,
  Wrench,
  XCircle,
} from 'lucide-react';

function withStableDuplicateKeys(values: readonly string[], prefix: string) {
  const counts = new Map<string, number>();
  return values.map((value) => {
    const next = (counts.get(value) ?? 0) + 1;
    counts.set(value, next);
    return { key: `${prefix}:${value}:${next}`, value };
  });
}

export default function BrainChat() {
  const messages = useMessages();
  const isLoading = useIsLoading();
  const toolParts = useToolParts();
  const toolEvents = useToolEvents();
  const showToolPanel = useShowToolPanel();
  const error = useError();
  const webSearchEnabled = useWebSearchEnabled();
  const firecrawlEnabled = useFirecrawlEnabled();
  const { sessionId, toggleToolPanel, clearMessages, setError, toggleWebSearch, toggleFirecrawl } = useChatStore();
  const { sidebarOpen, toggleSidebar } = usePromptLibraryStore();
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);

  // Calculate tool status counts
  const toolStatusCounts = useMemo(() => {
    const pending = toolEvents.filter(e => e.status === 'pending').length;
    const success = toolEvents.filter(e => e.status === 'success').length;
    const errorCount = toolEvents.filter(e => e.status === 'error').length;
    return { pending, success, error: errorCount };
  }, [toolEvents]);

  const chatHistory = useMemo(
    () =>
      messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    [messages]
  );

  const handleSendMessage = useCallback(
    async (text: string) => {
      await sendMessage(text, {
        sessionId,
        chatHistory,
        webSearchEnabled,
        firecrawlEnabled,
      });
    },
    [sessionId, chatHistory, webSearchEnabled, firecrawlEnabled]
  );

  return (
    <div className="flex h-dvh bg-background">
      {/* Prompt Library Sidebar */}
      <PromptLibrarySidebar onSendPrompt={handleSendMessage} />

      {/* Main Chat Area */}
      <div className="relative flex flex-1 flex-col">
        {/* Header */}
        <header className="flex h-14 shrink-0 items-center justify-between border-b px-4">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleSidebar}
              aria-label={sidebarOpen ? 'Close prompts sidebar' : 'Open prompts sidebar'}
              title={sidebarOpen ? 'Close prompts sidebar' : 'Open prompts sidebar'}
              className={`h-8 w-8 ${sidebarOpen ? 'bg-accent' : ''}`}
            >
              <Menu className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center gap-2">
            {messages.length > 0 && (
              <Button variant="ghost" size="sm" onClick={clearMessages}>
                <RotateCcw className="mr-2 h-3.5 w-3.5" />
                New Chat
              </Button>
            )}
            {toolParts.length > 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={toggleToolPanel}
                className={toolStatusCounts.error > 0 ? 'text-destructive' : toolStatusCounts.pending > 0 ? 'text-yellow-600' : 'text-green-600'}
              >
                {toolStatusCounts.pending > 0 ? (
                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                ) : toolStatusCounts.error > 0 ? (
                  <XCircle className="mr-2 h-3.5 w-3.5" />
                ) : (
                  <CheckCircle2 className="mr-2 h-3.5 w-3.5" />
                )}
                {toolParts.length} tool{toolParts.length !== 1 ? 's' : ''}
              </Button>
            )}
            <ThemeToggle />
          </div>
        </header>

        {/* Error Banner */}
        {error && (
          <div className="flex items-center justify-between gap-4 border-b border-destructive/20 bg-destructive/10 px-4 py-2 text-sm text-destructive">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setError(null)}
              className="h-6 px-2 text-destructive hover:bg-destructive/20 hover:text-destructive"
            >
              Dismiss
            </Button>
          </div>
        )}
        
        {/* Chat Container - Centered */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {messages.length === 0 ? (
            /* Empty State */
            <div className="flex flex-1 flex-col items-center justify-end px-4 pb-10 sm:px-6 md:px-10">
              <div className="w-full space-y-6">
                {/* Input - Empty State */}
                <PromptInput
                  onSubmit={(e: FormEvent<HTMLFormElement>) => {
                    e.preventDefault();
                    const form = e.currentTarget;
                    const formData = new FormData(form);
                    const text = formData.get('message') as string;
                    if (text?.trim()) {
                      handleSendMessage(text);
                      form.reset();
                    }
                  }}
                  className="w-full"
                >
                  {/* Suggestions - Horizontal Pills */}
                  <Suggestions>
                    <Suggestion
                      suggestion="Show me the newsletter SOP"
                      onClick={handleSendMessage}
                    />
                    <Suggestion
                      suggestion="Who are our top guests?"
                      onClick={handleSendMessage}
                    />
                    <Suggestion
                      suggestion="What themes are trending?"
                      onClick={handleSendMessage}
                    />
                    <Suggestion
                      suggestion="Review outreach pipeline"
                      onClick={handleSendMessage}
                    />
                  </Suggestions>

                  <PromptInputTextarea
                    placeholder="What would you like to know?"
                    disabled={isLoading}
                    minHeight={96}
                    maxHeight={260}
                  />
                  <PromptInputToolbar>
                    <PromptInputTools>
                      <PromptInputButton
                        title="Add to knowledge base"
                        onClick={() => setUploadModalOpen(true)}
                      >
                        <Paperclip className="size-4" />
                      </PromptInputButton>
                      <PromptInputButton
                        title="Calendar"
                        onClick={() => setCalendarOpen(true)}
                      >
                        <CalendarDays className="size-4" />
                      </PromptInputButton>
                      <PromptInputButton title="Voice input">
                        <Mic className="size-4" />
                      </PromptInputButton>
                      <PromptInputButton
                        title={webSearchEnabled ? "Disable web search" : "Enable web search"}
                        onClick={toggleWebSearch}
                        className={webSearchEnabled ? "bg-primary/10 text-primary" : ""}
                      >
                        <Globe className="size-4" />
                        {webSearchEnabled ? "Search On" : "Search"}
                      </PromptInputButton>
                      <PromptInputButton
                        title={firecrawlEnabled ? "Disable Firecrawl" : "Enable Firecrawl"}
                        onClick={toggleFirecrawl}
                        className={firecrawlEnabled ? "bg-orange-500/10 text-orange-500" : ""}
                      >
                        <Flame className="size-4" />
                        {firecrawlEnabled ? "Crawl On" : "Crawl"}
                      </PromptInputButton>
                    </PromptInputTools>
                    <PromptInputSubmit
                      disabled={isLoading}
                      status={isLoading ? 'streaming' : 'ready'}
                    />
                  </PromptInputToolbar>
                </PromptInput>
              </div>
            </div>
          ) : (
            /* Conversation View */
            <>
              <div className="flex-1 overflow-y-auto">
                <div className="mx-auto w-full max-w-2xl px-4 py-6">
                  <Conversation>
                    <ConversationContent>
                      {messages.map((message) => (
                        <Message key={message.id} from={message.role}>
                          <MessageContent>
                            {message.content ? (
                              <Response>{message.content}</Response>
                            ) : null}
                          </MessageContent>

                          {/* Next Actions */}
                          {message.role === 'assistant' && message.nextActions?.length ? (
                            <div className="mt-3 rounded-lg border border-primary/20 bg-primary/5 p-3">
                              <div className="mb-2 text-xs font-medium uppercase tracking-wide text-primary">
                                Next Actions
                              </div>
                              <ul className="space-y-1 text-sm text-muted-foreground">
                                {withStableDuplicateKeys(
                                  message.nextActions,
                                  `${message.id}-next-actions`
                                ).map(({ key, value: action }) => (
                                  <li key={key} className="flex items-start gap-2">
                                    <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                                    {action}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ) : null}

                          {/* Assumptions */}
                          {message.role === 'assistant' && message.assumptions?.length ? (
                            <div className="mt-2 rounded-lg border bg-muted/50 p-3">
                              <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                Assumptions
                              </div>
                              <ul className="list-disc space-y-1 pl-4 text-sm text-muted-foreground">
                                {withStableDuplicateKeys(
                                  message.assumptions,
                                  `${message.id}-assumptions`
                                ).map(({ key, value: assumption }) => (
                                  <li key={key}>{assumption}</li>
                                ))}
                              </ul>
                            </div>
                          ) : null}
                        </Message>
                      ))}

                      {/* Loading indicator */}
                      {isLoading && (
                        <Message from="assistant">
                          <MessageContent>
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Loader />
                              <span>Thinking...</span>
                            </div>
                          </MessageContent>
                        </Message>
                      )}
                    </ConversationContent>
                    <ConversationScrollButton />
                  </Conversation>
                </div>
              </div>

              {/* Input - Conversation State */}
              <div className="shrink-0 border-t bg-background px-4 py-4">
                <div className="mx-auto w-full max-w-2xl">
                  <PromptInput
                    onSubmit={(e: FormEvent<HTMLFormElement>) => {
                      e.preventDefault();
                      const form = e.currentTarget;
                      const formData = new FormData(form);
                      const text = formData.get('message') as string;
                      if (text?.trim()) {
                        handleSendMessage(text);
                        form.reset();
                      }
                    }}
                    className="w-full"
                  >
                    <PromptInputTextarea
                      placeholder="What would you like to know?"
                      disabled={isLoading}
                    />
                    <PromptInputToolbar>
                      <PromptInputTools>
                        <PromptInputButton
                          title="Add to knowledge base"
                          onClick={() => setUploadModalOpen(true)}
                        >
                          <Paperclip className="size-4" />
                        </PromptInputButton>
                        <PromptInputButton
                          title="Calendar"
                          onClick={() => setCalendarOpen(true)}
                        >
                          <CalendarDays className="size-4" />
                        </PromptInputButton>
                        <PromptInputButton title="Voice input">
                          <Mic className="size-4" />
                        </PromptInputButton>
                        <PromptInputButton
                          title={webSearchEnabled ? "Disable web search" : "Enable web search"}
                          onClick={toggleWebSearch}
                          className={webSearchEnabled ? "bg-primary/10 text-primary" : ""}
                        >
                          <Globe className="size-4" />
                          {webSearchEnabled ? "Search On" : "Search"}
                        </PromptInputButton>
                        <PromptInputButton
                          title={firecrawlEnabled ? "Disable Firecrawl" : "Enable Firecrawl"}
                          onClick={toggleFirecrawl}
                          className={firecrawlEnabled ? "bg-orange-500/10 text-orange-500" : ""}
                        >
                          <Flame className="size-4" />
                          {firecrawlEnabled ? "Crawl On" : "Crawl"}
                        </PromptInputButton>
                      </PromptInputTools>
                      <PromptInputSubmit
                        disabled={isLoading}
                        status={isLoading ? 'streaming' : 'ready'}
                      />
                    </PromptInputToolbar>
                  </PromptInput>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Tool Activity Panel - for AI tool calls */}
      {showToolPanel && toolParts.length > 0 && (
        <div className="hidden w-80 flex-col border-l md:flex">
          <div className="flex h-14 items-center justify-between border-b px-4">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Wrench className="h-4 w-4" />
              Tool Activity
            </div>
            {/* Status Summary */}
            <div className="flex items-center gap-2 text-xs">
              {toolStatusCounts.success > 0 && (
                <span className="flex items-center gap-1 text-green-600">
                  <CheckCircle2 className="h-3 w-3" />
                  {toolStatusCounts.success}
                </span>
              )}
              {toolStatusCounts.pending > 0 && (
                <span className="flex items-center gap-1 text-yellow-600">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  {toolStatusCounts.pending}
                </span>
              )}
              {toolStatusCounts.error > 0 && (
                <span className="flex items-center gap-1 text-destructive">
                  <XCircle className="h-3 w-3" />
                  {toolStatusCounts.error}
                </span>
              )}
            </div>
          </div>
          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {toolParts.map((part, i) => (
              <Tool
                key={`${part.type}-${i}`}
                defaultOpen={part.state !== 'output-available'}
              >
                <ToolHeader type={part.type} state={part.state} />
                <ToolContent>
                  <ToolInput input={part.input} />
                  <ToolOutput
                    output={part.output as ReactNode}
                    errorText={part.errorText}
                  />
                </ToolContent>
              </Tool>
            ))}
          </div>
        </div>
      )}

      {/* DevTools */}
      <AIDevTools position="bottom-right" />

      {/* File Upload Modal */}
      <FileUploadModal
        open={uploadModalOpen}
        onOpenChange={setUploadModalOpen}
        onUploadComplete={(documentId) => {
          console.log('[FileUpload] Document uploaded:', documentId);
        }}
      />

      {/* Quick Calendar */}
      <QuickCalendarDialog open={calendarOpen} onOpenChange={setCalendarOpen} />
    </div>
  );
}
