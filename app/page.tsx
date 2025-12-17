'use client';

import type { FormEvent, ReactNode } from 'react';
import { useCallback, useMemo } from 'react';
import {
  useChatStore,
  useMessages,
  useIsLoading,
  useToolParts,
  useShowToolPanel,
} from '@/lib/chat/store';
import { useToolLibraryStore } from '@/lib/tools/catalog';
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
  PromptInputModelSelect,
  PromptInputModelSelectTrigger,
  PromptInputModelSelectContent,
  PromptInputModelSelectItem,
  PromptInputModelSelectValue,
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
import { ToolLibrarySidebar, ToolConfigPanel } from '@/components/tool-library';
import { Button } from '@/components/ui/button';
import {
  ChevronRight,
  Globe,
  Library,
  Mic,
  Plus,
  RotateCcw,
  Sparkles,
  Wrench,
} from 'lucide-react';

export default function BrainChat() {
  const messages = useMessages();
  const isLoading = useIsLoading();
  const toolParts = useToolParts();
  const showToolPanel = useShowToolPanel();
  const { sessionId, toggleToolPanel, clearMessages } = useChatStore();

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
      });
    },
    [sessionId, chatHistory]
  );

  return (
    <div className="flex h-dvh bg-background">
      {/* Main Chat Area */}
      <div className="relative flex flex-1 flex-col">
        {/* Header */}
        <header className="flex h-14 shrink-0 items-center justify-between border-b px-4">
          <div className="flex items-center gap-2">
            <span className="text-lg font-semibold">LifeRX Brain</span>
          </div>
          <div className="flex items-center gap-2">
            {messages.length > 0 && (
              <Button variant="ghost" size="sm" onClick={clearMessages}>
                <RotateCcw className="mr-2 h-3.5 w-3.5" />
                New Chat
              </Button>
            )}
            {toolParts.length > 0 && (
              <Button variant="ghost" size="sm" onClick={toggleToolPanel}>
                <Wrench className="mr-2 h-3.5 w-3.5" />
                {toolParts.length}
              </Button>
            )}
            <ThemeToggle />
          </div>
        </header>

        {/* Chat Container - Centered */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {messages.length === 0 ? (
            /* Empty State */
            <div className="flex flex-1 flex-col items-center justify-center px-4">
              <div className="w-full max-w-2xl space-y-8">
                <div className="space-y-2 text-center">
                  <h1 className="text-3xl font-semibold tracking-tight">
                    What can I help you with?
                  </h1>
                  <p className="text-muted-foreground">
                    Ask about guests, newsletters, outreach, or any LifeRX operation.
                  </p>
                </div>

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
                  />
                  <PromptInputToolbar>
                    <PromptInputTools>
                      <PromptInputButton>
                        <Plus className="size-4" />
                      </PromptInputButton>
                      <PromptInputButton>
                        <Mic className="size-4" />
                      </PromptInputButton>
                      <PromptInputButton>
                        <Globe className="size-4" />
                        Search
                      </PromptInputButton>
                      <PromptInputModelSelect defaultValue="gpt-4">
                        <PromptInputModelSelectTrigger className="w-auto gap-1">
                          <Sparkles className="size-4" />
                          <PromptInputModelSelectValue />
                        </PromptInputModelSelectTrigger>
                        <PromptInputModelSelectContent>
                          <PromptInputModelSelectItem value="gpt-4">
                            GPT-4
                          </PromptInputModelSelectItem>
                          <PromptInputModelSelectItem value="gpt-4-turbo">
                            GPT-4 Turbo
                          </PromptInputModelSelectItem>
                          <PromptInputModelSelectItem value="claude-3">
                            Claude 3
                          </PromptInputModelSelectItem>
                        </PromptInputModelSelectContent>
                      </PromptInputModelSelect>
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
                                {message.nextActions.map((action, i) => (
                                  <li key={i} className="flex items-start gap-2">
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
                                {message.assumptions.map((assumption, i) => (
                                  <li key={i}>{assumption}</li>
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
                        <PromptInputButton>
                          <Plus className="size-4" />
                        </PromptInputButton>
                        <PromptInputButton>
                          <Mic className="size-4" />
                        </PromptInputButton>
                        <PromptInputButton>
                          <Globe className="size-4" />
                          Search
                        </PromptInputButton>
                        <PromptInputModelSelect defaultValue="gpt-4">
                          <PromptInputModelSelectTrigger className="w-auto gap-1">
                            <Sparkles className="size-4" />
                            <PromptInputModelSelectValue />
                          </PromptInputModelSelectTrigger>
                          <PromptInputModelSelectContent>
                            <PromptInputModelSelectItem value="gpt-4">
                              GPT-4
                            </PromptInputModelSelectItem>
                            <PromptInputModelSelectItem value="gpt-4-turbo">
                              GPT-4 Turbo
                            </PromptInputModelSelectItem>
                            <PromptInputModelSelectItem value="claude-3">
                              Claude 3
                            </PromptInputModelSelectItem>
                          </PromptInputModelSelectContent>
                        </PromptInputModelSelect>
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

      {/* Tool Panel */}
      {showToolPanel && toolParts.length > 0 && (
        <div className="hidden w-80 flex-col border-l md:flex">
          <div className="flex h-14 items-center border-b px-4">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Wrench className="h-4 w-4" />
              Tool Activity
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
    </div>
  );
}
