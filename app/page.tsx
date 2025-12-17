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
  ConversationScrollButton,
} from '@/components/ai-elements/conversation';
import {
  PromptInput,
  PromptInputBody,
  PromptInputTextarea,
  PromptInputSubmit,
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
import { 
  Sparkles, 
  RotateCcw, 
  ChevronRight,
  Wrench,
  User,
  Bot,
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
    <div className="flex h-screen flex-col">
      {/* ================================================================
          Header
          ================================================================ */}
      <header className="relative z-10 border-b border-border/50 bg-card/80 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-4">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 dark:bg-primary/20">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="font-display text-xl font-semibold tracking-tight text-foreground">
                LifeRX Brain
              </h1>
              <p className="text-xs text-muted-foreground">Operator Control Plane</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {messages.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="gap-2 text-muted-foreground hover:text-foreground"
                onClick={clearMessages}
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">New Chat</span>
              </Button>
            )}
            {toolParts.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="gap-2 font-mono text-xs"
                onClick={toggleToolPanel}
              >
                <Wrench className="h-3.5 w-3.5" />
                <span>{toolParts.length}</span>
              </Button>
            )}
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* ================================================================
          Main Content
          ================================================================ */}
      <div className="mx-auto flex w-full max-w-5xl flex-1 overflow-hidden">
        <main className="flex min-w-0 flex-1 flex-col">
          <Conversation className="flex-1">
            <ConversationContent className="px-6 py-8">
              {/* Empty State */}
              {messages.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-center">
                  <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 dark:bg-primary/20">
                    <Sparkles className="h-8 w-8 text-primary" />
                  </div>
                  <h2 className="font-display text-2xl font-semibold text-foreground">
                    Welcome to LifeRX Brain
                  </h2>
                  <p className="mt-2 max-w-md text-muted-foreground">
                    Your intelligent operator control plane. Ask about guests, 
                    newsletters, outreach, or any LifeRX operation.
                  </p>
                  
                  {/* Quick Actions */}
                  <div className="mt-8 grid gap-3 sm:grid-cols-2">
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
                          'group flex items-center gap-2 rounded-xl border border-border/50 bg-card/50 px-4 py-3 text-left text-sm transition-all',
                          'hover:border-primary/50 hover:bg-card hover:shadow-md',
                          'dark:hover:shadow-primary/5',
                          'animate-fade-in',
                          `stagger-${i + 1}`
                        )}
                        style={{ opacity: 0 }}
                      >
                        <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                        <span className="text-foreground">{prompt}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {/* Messages */}
              {messages.map((message, index) => (
                <div
                  key={message.id}
                  className={cn(
                    'mb-6 animate-fade-in',
                    message.role === 'user' ? 'flex justify-end' : ''
                  )}
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <div
                    className={cn(
                      'group relative max-w-[85%]',
                      message.role === 'user' ? 'ml-12' : 'mr-12'
                    )}
                  >
                    {/* Avatar */}
                    <div
                      className={cn(
                        'absolute top-0 flex h-8 w-8 items-center justify-center rounded-lg',
                        message.role === 'user'
                          ? '-right-10 bg-primary/10 dark:bg-primary/20'
                          : '-left-10 bg-secondary'
                      )}
                    >
                      {message.role === 'user' ? (
                        <User className="h-4 w-4 text-primary" />
                      ) : (
                        <Bot className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>

                    {/* Message Bubble */}
                    <div
                      className={cn(
                        'rounded-2xl px-4 py-3',
                        message.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'glass-card'
                      )}
                    >
                      {message.content ? (
                        <div className="prose prose-sm dark:prose-invert max-w-none">
                          <p className="m-0 whitespace-pre-wrap leading-relaxed">
                            {message.content}
                          </p>
                        </div>
                      ) : (
                        <div className="typing-indicator flex items-center gap-1 py-1">
                          <span />
                          <span />
                          <span />
                        </div>
                      )}
                    </div>

                    {/* Next Actions & Assumptions */}
                    {message.role === 'assistant' &&
                      (message.nextActions?.length || message.assumptions?.length) && (
                        <div className="mt-3 space-y-3 animate-fade-in">
                          {message.nextActions?.length ? (
                            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 dark:bg-primary/10">
                              <div className="mb-2 flex items-center gap-2">
                                <ChevronRight className="h-4 w-4 text-primary" />
                                <span className="font-mono text-xs font-medium uppercase tracking-wider text-primary">
                                  Next Actions
                                </span>
                              </div>
                              <ul className="space-y-1.5 pl-6">
                                {message.nextActions.map((action, i) => (
                                  <li
                                    key={i}
                                    className="text-sm text-foreground/80 before:mr-2 before:text-primary before:content-['→']"
                                  >
                                    {action}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ) : null}

                          {message.assumptions?.length ? (
                            <div className="rounded-xl border border-border/50 bg-muted/50 p-4">
                              <div className="mb-2 font-mono text-xs font-medium uppercase tracking-wider text-muted-foreground">
                                Assumptions
                              </div>
                              <ul className="space-y-1 pl-4 text-sm text-muted-foreground">
                                {message.assumptions.map((assumption, i) => (
                                  <li key={i} className="list-disc">
                                    {assumption}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ) : null}
                        </div>
                      )}
                  </div>
                </div>
              ))}
            </ConversationContent>

            <ConversationScrollButton />
          </Conversation>

          {/* ================================================================
              Input Area
              ================================================================ */}
          <div className="border-t border-border/50 bg-card/80 backdrop-blur-xl">
            <div className="mx-auto max-w-3xl px-6 py-4">
              <PromptInput
                onSubmit={async ({ text }) => {
                  await handleSendMessage(text);
                }}
              >
                <PromptInputBody className="rounded-2xl border border-border/50 bg-background shadow-lg transition-shadow focus-within:border-primary/50 focus-within:shadow-xl dark:focus-within:shadow-primary/5">
                  <PromptInputTextarea
                    placeholder="Ask about guests, newsletters, outreach..."
                    disabled={isLoading}
                    className="min-h-[52px] resize-none border-0 bg-transparent px-4 py-3.5 text-foreground placeholder:text-muted-foreground focus:ring-0"
                  />
                  <PromptInputSubmit
                    disabled={isLoading}
                    status={isLoading ? 'submitted' : undefined}
                    className="mr-2 rounded-xl bg-primary px-4 py-2 text-primary-foreground transition-all hover:bg-primary/90 disabled:opacity-50"
                  />
                </PromptInputBody>
              </PromptInput>
              <div className="mt-3 text-center text-xs text-muted-foreground">
                Press <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px]">Enter</kbd> to send, <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px]">Shift + Enter</kbd> for new line
              </div>
            </div>
          </div>
        </main>

        {/* ================================================================
            Tool Panel (Side)
            ================================================================ */}
        {showToolPanel && toolParts.length > 0 ? (
          <aside className="hidden w-80 shrink-0 animate-slide-in-right border-l border-border/50 bg-card/50 backdrop-blur-xl md:block">
            <div className="border-b border-border/50 px-4 py-3">
              <div className="flex items-center gap-2">
                <Wrench className="h-4 w-4 text-muted-foreground" />
                <span className="font-mono text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Tool Activity
                </span>
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

      {/* DevTools (dev only) */}
      <AIDevTools position="bottom-right" />
    </div>
  );
}
