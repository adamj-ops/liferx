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
  Message,
  MessageContent,
  MessageResponse,
} from '@/components/ai-elements/message';
import {
  PromptInput,
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
import { Suggestions, Suggestion } from '@/components/ai-elements/suggestion';
import { Loader } from '@/components/ai-elements/loader';
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
    <div className="flex h-screen">
      {/* Chat Panel */}
      <div className="flex flex-1 flex-col border-r">
        {/* Header */}
        <div className="flex h-14 items-center justify-between border-b px-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <h1 className="text-lg font-semibold">LifeRX Brain</h1>
          </div>
          <div className="flex items-center gap-2">
            {messages.length > 0 && (
              <Button variant="ghost" size="sm" onClick={clearMessages}>
                <RotateCcw className="mr-2 h-3.5 w-3.5" />
                New Chat
              </Button>
            )}
            {toolParts.length > 0 && (
              <Button variant="outline" size="sm" onClick={toggleToolPanel}>
                <Wrench className="mr-2 h-3.5 w-3.5" />
                {toolParts.length}
              </Button>
            )}
            <ThemeToggle />
          </div>
        </div>

        {/* Conversation */}
        <div className="flex-1 overflow-y-auto p-4">
          {messages.length === 0 ? (
            <div className="mt-8 text-center">
              <p className="text-3xl font-semibold">What can I help you with?</p>
              <p className="mt-2 text-muted-foreground">
                Ask about guests, newsletters, outreach, or any LifeRX operation.
              </p>
            </div>
          ) : (
            <Conversation>
              <ConversationContent>
                {messages.map((message) => (
                  <Message key={message.id} from={message.role}>
                    <MessageContent>
                      {message.content ? (
                        <MessageResponse>{message.content}</MessageResponse>
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
          )}
        </div>

        {/* Input */}
        <div className="border-t p-4">
          {/* Suggestions - show when no messages */}
          {messages.length === 0 && (
            <Suggestions className="mb-4">
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
          )}

          <PromptInput
            onSubmit={async ({ text }) => {
              await handleSendMessage(text);
            }}
            className="mx-auto w-full max-w-2xl"
          >
            <PromptInputTextarea
              placeholder="Ask about guests, newsletters, outreach..."
              disabled={isLoading}
              className="min-h-[60px] pr-12"
            />
            <PromptInputSubmit
              className="absolute bottom-1 right-1"
              disabled={isLoading}
              status={isLoading ? 'streaming' : 'ready'}
            />
          </PromptInput>
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
                  <ToolOutput output={part.output} errorText={part.errorText} />
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
