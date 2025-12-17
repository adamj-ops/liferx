'use client';

import { useCallback, useMemo } from 'react';
import {
  useChatStore,
  useMessages,
  useIsLoading,
  useToolParts,
  useShowToolPanel,
} from '@/lib/chat/store';
import { sendMessage } from '@/lib/chat/send-message';
import { AIDevTools } from '@/components/ai-devtools';
import { ThemeToggle } from '@/components/theme-toggle';
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from '@/components/ai-elements/conversation';
import {
  Message,
  MessageContent,
  MessageResponse,
} from '@/components/ai-elements/message';
import {
  PromptInput,
  PromptInputBody,
  PromptInputTextarea,
  PromptInputSubmit,
  PromptInputFooter,
  PromptInputTools,
} from '@/components/ai-elements/prompt-input';
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
} from '@/components/ai-elements/tool';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Sparkles, RotateCcw, Wrench, ChevronRight } from 'lucide-react';

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
    <div className="flex h-screen flex-col bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="mx-auto flex w-full max-w-4xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h1 className="text-base font-semibold tracking-tight">LifeRX Brain</h1>
              <p className="text-xs text-muted-foreground">Operator Control Plane</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {messages.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearMessages}
              >
                <RotateCcw className="mr-2 h-3.5 w-3.5" />
                New Chat
              </Button>
            )}
            {toolParts.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={toggleToolPanel}
              >
                <Wrench className="mr-2 h-3.5 w-3.5" />
                {toolParts.length}
              </Button>
            )}
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main */}
      <div className="mx-auto flex w-full max-w-4xl flex-1 overflow-hidden">
        <main className="flex min-w-0 flex-1 flex-col">
          <Conversation className="flex-1">
            <ConversationContent className="p-4">
              {messages.length === 0 ? (
                <ConversationEmptyState
                  icon={<Sparkles className="h-8 w-8" />}
                  title="Welcome to LifeRX Brain"
                  description="Your intelligent operator control plane. Ask about guests, newsletters, outreach, or any LifeRX operation."
                >
                  {/* Quick Actions */}
                  <div className="mt-6 grid gap-2 sm:grid-cols-2">
                    {[
                      'Show me the newsletter SOP',
                      'Who are our top guests?',
                      'What themes are trending?',
                      'Review outreach pipeline',
                    ].map((prompt, i) => (
                      <button
                        key={i}
                        onClick={() => handleSendMessage(prompt)}
                        className={cn(
                          'group flex items-center gap-2 rounded-lg border bg-card px-4 py-3 text-left text-sm transition-colors',
                          'hover:border-primary hover:bg-accent'
                        )}
                      >
                        <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
                        <span>{prompt}</span>
                      </button>
                    ))}
                  </div>
                </ConversationEmptyState>
              ) : null}

              {/* Messages */}
              {messages.map((message) => (
                <Message key={message.id} from={message.role}>
                  <MessageContent>
                    {message.content ? (
                      <MessageResponse>{message.content}</MessageResponse>
                    ) : (
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <span className="h-2 w-2 animate-pulse rounded-full bg-current" />
                        <span className="h-2 w-2 animate-pulse rounded-full bg-current" style={{ animationDelay: '0.2s' }} />
                        <span className="h-2 w-2 animate-pulse rounded-full bg-current" style={{ animationDelay: '0.4s' }} />
                      </div>
                    )}
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
            </ConversationContent>

            <ConversationScrollButton />
          </Conversation>

          {/* Input */}
          <div className="border-t bg-card p-4">
            <PromptInput
              onSubmit={async ({ text }) => {
                await handleSendMessage(text);
              }}
            >
              <PromptInputBody>
                <PromptInputTextarea
                  placeholder="Ask about guests, newsletters, outreach..."
                  disabled={isLoading}
                />
                <PromptInputFooter>
                  <PromptInputTools>
                    {/* Future: Add attachment button, voice input, etc. */}
                  </PromptInputTools>
                  <PromptInputSubmit
                    disabled={isLoading}
                    status={isLoading ? 'submitted' : undefined}
                  />
                </PromptInputFooter>
              </PromptInputBody>
            </PromptInput>
          </div>
        </main>

        {/* Tool Panel */}
        {showToolPanel && toolParts.length > 0 ? (
          <aside className="hidden w-80 shrink-0 border-l bg-card md:block">
            <div className="border-b px-4 py-3">
              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <Wrench className="h-4 w-4" />
                Tool Activity
              </div>
            </div>
            <div className="space-y-3 p-4">
              {toolParts.map((part, i) => (
                <Tool
                  key={`${part.type}-${i}`}
                  defaultOpen={part.state !== 'output-available'}
                >
                  <ToolHeader type={part.type} state={part.state} />
                  <ToolContent>
                    <ToolInput input={part.input} />
                    <ToolOutput output={part.output} errorText={part.errorText} />
                  </ToolContent>
                </Tool>
              ))}
            </div>
          </aside>
        ) : null}
      </div>

      {/* DevTools */}
      <AIDevTools position="bottom-right" />
    </div>
  );
}
