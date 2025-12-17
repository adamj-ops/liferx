/**
 * Send Message Action
 * 
 * Handles sending messages to the Agno Hub and processing the SSE stream.
 */

import { v4 as uuidv4 } from 'uuid';
import { useChatStore } from './store';
import type { HubEvent, ChatMessage } from '@/lib/agno/types';

interface SendMessageOptions {
  sessionId: string;
  chatHistory: Array<{ role: string; content: string }>;
}

export async function sendMessage(
  text: string,
  options: SendMessageOptions
): Promise<void> {
  const store = useChatStore.getState();
  
  if (!text.trim() || store.isLoading) return;
  
  const userMessage: ChatMessage = {
    id: uuidv4(),
    role: 'user',
    content: text.trim(),
    timestamp: new Date().toISOString(),
  };
  
  const assistantMessageId = uuidv4();
  const assistantMessage: ChatMessage = {
    id: assistantMessageId,
    role: 'assistant',
    content: '',
    timestamp: new Date().toISOString(),
  };
  
  // Update store
  store.setLoading(true);
  store.setError(null);
  store.clearToolEvents();
  store.addMessage(userMessage);
  store.addMessage(assistantMessage);
  
  try {
    const response = await fetch('/api/assistant/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: options.sessionId,
        messages: [
          ...options.chatHistory,
          { role: 'user', content: userMessage.content },
        ],
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
            store.handleHubEvent(event, assistantMessageId);
          } catch {
            // Ignore parse errors for malformed chunks
          }
        }
      }
    }
  } catch (error) {
    console.error('Chat error:', error);
    store.updateMessage(assistantMessageId, {
      content: 'An error occurred. Please try again.',
    });
    store.setError(error instanceof Error ? error.message : 'Unknown error');
  } finally {
    store.setLoading(false);
  }
}

