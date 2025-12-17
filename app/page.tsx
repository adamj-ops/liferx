'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { HubEvent, ChatMessage } from '@/lib/agno/types';

export default function BrainChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId] = useState(() => uuidv4());
  const [toolActivity, setToolActivity] = useState<{ tool: string; status: 'running' | 'done' }[]>([]);
  const [showToolPanel, setShowToolPanel] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: uuidv4(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setToolActivity([]);

    const assistantMessageId = uuidv4();
    const assistantMessage: ChatMessage = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, assistantMessage]);

    try {
      const response = await fetch('/api/assistant/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          messages: [...messages, userMessage].map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error(`Request failed: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response stream');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;

            try {
              const event: HubEvent = JSON.parse(data);
              handleHubEvent(event, assistantMessageId);
            } catch {
              // Ignore parse errors for malformed chunks
            }
          }
        }
      }
    } catch (error) {
      console.error('Chat error:', error);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMessageId
            ? { ...m, content: 'An error occurred. Please try again.' }
            : m
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleHubEvent = (event: HubEvent, messageId: string) => {
    switch (event.type) {
      case 'delta':
        setMessages((prev) =>
          prev.map((m) =>
            m.id === messageId
              ? { ...m, content: m.content + event.content }
              : m
          )
        );
        break;

      case 'tool_start':
        setToolActivity((prev) => [...prev, { tool: event.tool, status: 'running' }]);
        setShowToolPanel(true);
        break;

      case 'tool_result':
        setToolActivity((prev) =>
          prev.map((t) =>
            t.tool === event.tool ? { ...t, status: 'done' } : t
          )
        );
        break;

      case 'final':
        if (event.next_actions?.length) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === messageId
                ? { ...m, nextActions: event.next_actions, assumptions: event.assumptions }
                : m
            )
          );
        }
        break;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="chat-container">
      <header className="chat-header">
        <div className="header-content">
          <h1 className="header-title">LifeRX Brain</h1>
          <span className="header-badge">v0.1</span>
        </div>
        {toolActivity.length > 0 && (
          <button
            className="tool-toggle"
            onClick={() => setShowToolPanel(!showToolPanel)}
          >
            {showToolPanel ? 'Hide' : 'Show'} Tools ({toolActivity.length})
          </button>
        )}
      </header>

      <div className="chat-body">
        <div className="messages-container">
          {messages.length === 0 && (
            <div className="empty-state">
              <div className="empty-icon">⚡</div>
              <h2>LifeRX Brain</h2>
              <p>Your operator control plane. Ask about guests, newsletters, outreach, or any LifeRX operation.</p>
            </div>
          )}

          {messages.map((message) => (
            <div
              key={message.id}
              className={`message ${message.role} animate-fade-in`}
            >
              <div className="message-content">
                {message.content || (
                  <span className="thinking animate-pulse">Thinking...</span>
                )}
              </div>
              {message.nextActions && message.nextActions.length > 0 && (
                <div className="next-actions">
                  <span className="next-actions-label">Next actions:</span>
                  <ul>
                    {message.nextActions.map((action, i) => (
                      <li key={i}>{action}</li>
                    ))}
                  </ul>
                </div>
              )}
              {message.assumptions && message.assumptions.length > 0 && (
                <div className="assumptions">
                  <span className="assumptions-label">Assumptions:</span>
                  <ul>
                    {message.assumptions.map((assumption, i) => (
                      <li key={i}>{assumption}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {showToolPanel && toolActivity.length > 0 && (
          <div className="tool-panel">
            <div className="tool-panel-header">Tool Activity</div>
            <div className="tool-list">
              {toolActivity.map((t, i) => (
                <div key={i} className={`tool-item ${t.status}`}>
                  <span className="tool-indicator" />
                  <span className="tool-name">{t.tool}</span>
                  <span className="tool-status">{t.status}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <form className="chat-form" onSubmit={handleSubmit}>
        <div className="input-container">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about guests, newsletters, outreach..."
            disabled={isLoading}
            rows={1}
          />
          <button type="submit" disabled={isLoading || !input.trim()}>
            {isLoading ? (
              <span className="loading-dots">
                <span>.</span><span>.</span><span>.</span>
              </span>
            ) : (
              '→'
            )}
          </button>
        </div>
        <div className="input-hint">
          Press Enter to send, Shift+Enter for new line
        </div>
      </form>

      <style jsx>{`
        .chat-container {
          display: flex;
          flex-direction: column;
          height: 100vh;
          max-width: 900px;
          margin: 0 auto;
          background: var(--bg-primary);
        }

        .chat-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 24px;
          border-bottom: 1px solid var(--border-subtle);
          background: var(--bg-secondary);
        }

        .header-content {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .header-title {
          font-size: 18px;
          font-weight: 600;
          letter-spacing: -0.02em;
        }

        .header-badge {
          font-size: 11px;
          font-family: var(--font-mono);
          padding: 2px 8px;
          background: var(--accent-glow);
          color: var(--accent-secondary);
          border-radius: 4px;
        }

        .tool-toggle {
          font-size: 12px;
          font-family: var(--font-mono);
          padding: 6px 12px;
          background: var(--bg-tertiary);
          border: 1px solid var(--border-subtle);
          color: var(--text-secondary);
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .tool-toggle:hover {
          background: var(--bg-input);
          border-color: var(--border-accent);
        }

        .chat-body {
          flex: 1;
          display: flex;
          overflow: hidden;
        }

        .messages-container {
          flex: 1;
          overflow-y: auto;
          padding: 24px;
        }

        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          text-align: center;
          color: var(--text-secondary);
        }

        .empty-icon {
          font-size: 48px;
          margin-bottom: 16px;
        }

        .empty-state h2 {
          font-size: 24px;
          font-weight: 600;
          color: var(--text-primary);
          margin-bottom: 8px;
        }

        .empty-state p {
          max-width: 400px;
          line-height: 1.6;
        }

        .message {
          margin-bottom: 20px;
        }

        .message.user .message-content {
          background: var(--accent-glow);
          border: 1px solid var(--accent-primary);
          color: var(--text-primary);
          padding: 12px 16px;
          border-radius: 12px 12px 4px 12px;
          margin-left: 48px;
        }

        .message.assistant .message-content {
          background: var(--bg-secondary);
          border: 1px solid var(--border-subtle);
          padding: 16px 20px;
          border-radius: 4px 12px 12px 12px;
          margin-right: 48px;
          line-height: 1.7;
          white-space: pre-wrap;
        }

        .thinking {
          color: var(--text-muted);
          font-style: italic;
        }

        .next-actions,
        .assumptions {
          margin-top: 12px;
          padding: 12px 16px;
          background: var(--bg-tertiary);
          border-radius: 8px;
          font-size: 13px;
          margin-right: 48px;
        }

        .next-actions-label,
        .assumptions-label {
          display: block;
          font-family: var(--font-mono);
          font-size: 11px;
          text-transform: uppercase;
          color: var(--accent-secondary);
          margin-bottom: 8px;
          letter-spacing: 0.05em;
        }

        .assumptions-label {
          color: var(--warning);
        }

        .next-actions ul,
        .assumptions ul {
          list-style: none;
          padding-left: 0;
        }

        .next-actions li,
        .assumptions li {
          position: relative;
          padding-left: 16px;
          margin-bottom: 4px;
          color: var(--text-secondary);
        }

        .next-actions li::before {
          content: '→';
          position: absolute;
          left: 0;
          color: var(--accent-primary);
        }

        .assumptions li::before {
          content: '⚠';
          position: absolute;
          left: 0;
          color: var(--warning);
        }

        .tool-panel {
          width: 240px;
          border-left: 1px solid var(--border-subtle);
          background: var(--bg-secondary);
          overflow-y: auto;
        }

        .tool-panel-header {
          padding: 12px 16px;
          font-size: 12px;
          font-family: var(--font-mono);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--text-muted);
          border-bottom: 1px solid var(--border-subtle);
        }

        .tool-list {
          padding: 8px;
        }

        .tool-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          border-radius: 6px;
          font-size: 12px;
          margin-bottom: 4px;
        }

        .tool-item.running {
          background: var(--accent-glow);
        }

        .tool-item.done {
          background: rgba(34, 197, 94, 0.1);
        }

        .tool-indicator {
          width: 6px;
          height: 6px;
          border-radius: 50%;
        }

        .tool-item.running .tool-indicator {
          background: var(--accent-primary);
          animation: pulse 1s ease-in-out infinite;
        }

        .tool-item.done .tool-indicator {
          background: var(--success);
        }

        .tool-name {
          flex: 1;
          font-family: var(--font-mono);
          color: var(--text-primary);
        }

        .tool-status {
          font-family: var(--font-mono);
          color: var(--text-muted);
          font-size: 10px;
          text-transform: uppercase;
        }

        .chat-form {
          padding: 16px 24px 24px;
          border-top: 1px solid var(--border-subtle);
          background: var(--bg-secondary);
        }

        .input-container {
          display: flex;
          gap: 12px;
          align-items: flex-end;
        }

        .input-container textarea {
          flex: 1;
          padding: 14px 18px;
          background: var(--bg-input);
          border: 1px solid var(--border-subtle);
          border-radius: 12px;
          color: var(--text-primary);
          font-size: 15px;
          font-family: var(--font-sans);
          resize: none;
          min-height: 52px;
          max-height: 200px;
          transition: border-color 0.15s ease;
        }

        .input-container textarea:focus {
          outline: none;
          border-color: var(--accent-primary);
        }

        .input-container textarea::placeholder {
          color: var(--text-muted);
        }

        .input-container button {
          padding: 14px 20px;
          background: var(--accent-primary);
          border: none;
          border-radius: 12px;
          color: white;
          font-size: 18px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .input-container button:hover:not(:disabled) {
          background: var(--accent-secondary);
          transform: translateY(-1px);
        }

        .input-container button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .loading-dots span {
          animation: pulse 1s ease-in-out infinite;
        }

        .loading-dots span:nth-child(2) {
          animation-delay: 0.2s;
        }

        .loading-dots span:nth-child(3) {
          animation-delay: 0.4s;
        }

        .input-hint {
          margin-top: 8px;
          font-size: 11px;
          color: var(--text-muted);
          text-align: center;
        }
      `}</style>
    </div>
  );
}

