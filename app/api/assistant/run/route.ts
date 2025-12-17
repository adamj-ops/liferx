/**
 * POST /api/assistant/run
 * 
 * Main entry point for the LifeRX Brain.
 * Proxies requests to the remote Agno Hub with streaming support.
 */

import { NextRequest } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

// Environment configuration
const AGNO_HUB_URL = process.env.AGNO_HUB_URL;
const INTERNAL_SHARED_SECRET = process.env.INTERNAL_SHARED_SECRET;
const ENABLE_OPERATOR_MODE = process.env.ENABLE_OPERATOR_MODE === 'true';
const RUNTIME_VERSION = '1.0.0';

interface RequestBody {
  session_id?: string;
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
  user?: { id?: string; email?: string };
}

export async function POST(request: NextRequest) {
  // =========================================
  // 1. Authentication
  // =========================================
  const authHeader = request.headers.get('Authorization');
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  
  // Check if authenticated via bearer token or operator mode
  const isAuthenticated = bearerToken || ENABLE_OPERATOR_MODE;
  
  if (!isAuthenticated) {
    return new Response(
      JSON.stringify({ 
        error: 'Authentication required. Provide a valid Bearer token or enable operator mode.' 
      }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }
  
  // =========================================
  // 2. Parse Request
  // =========================================
  let body: RequestBody;
  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({ error: 'Invalid JSON body' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }
  
  const { messages, user } = body;
  
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return new Response(
      JSON.stringify({ error: 'messages array is required' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }
  
  // Generate or use provided session ID
  const sessionId = body.session_id || crypto.randomUUID();
  const userId = user?.id || 'operator';
  
  // =========================================
  // 3. Persist Session & Messages
  // =========================================
  const supabase = createServerClient();
  
  // Upsert session
  try {
    await supabase
      .from('agent_sessions')
      .upsert({
        id: sessionId,
        user_id: userId,
        runtime_version: RUNTIME_VERSION,
        started_at: new Date().toISOString(),
      }, {
        onConflict: 'id',
      });
    
    // Store user message
    const lastMessage = messages[messages.length - 1];
    if (lastMessage.role === 'user') {
      await supabase
        .from('agent_messages')
        .insert({
          session_id: sessionId,
          role: 'user',
          content: lastMessage.content,
        });
    }
  } catch (error) {
    console.error('Failed to persist session/message:', error);
    // Continue anyway - don't block on persistence
  }
  
  // =========================================
  // 4. Check if Agno Hub is configured
  // =========================================
  if (!AGNO_HUB_URL) {
    // Return a simulated response for development
    const responseContent = `[Development Mode] Agno Hub not configured. 

Your message: "${messages[messages.length - 1]?.content}"

To connect to a real Agno Hub:
1. Deploy the agno-hub folder to Railway
2. Set AGNO_HUB_URL in .env.local
3. Set matching INTERNAL_SHARED_SECRET

Session: ${sessionId}`;
    
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        // Simulate streaming
        const words = responseContent.split(' ');
        for (const word of words) {
          const event = { type: 'delta', content: word + ' ' };
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
          await new Promise(resolve => setTimeout(resolve, 30));
        }
        
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
          type: 'final', 
          next_actions: ['Deploy Agno Hub to Railway', 'Configure AGNO_HUB_URL'],
          assumptions: ['Running in development mode without Agno Hub']
        })}\n\n`));
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      }
    });
    
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  }
  
  // =========================================
  // 5. Proxy to Agno Hub
  // =========================================
  try {
    const hubResponse = await fetch(`${AGNO_HUB_URL}/run`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Secret': INTERNAL_SHARED_SECRET || '',
      },
      body: JSON.stringify({
        session_id: sessionId,
        messages,
        user: { id: userId, email: user?.email },
      }),
    });
    
    if (!hubResponse.ok) {
      const errorText = await hubResponse.text();
      return new Response(
        JSON.stringify({ error: `Hub error: ${hubResponse.status}`, details: errorText }),
        { status: hubResponse.status, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Stream the response through
    const hubBody = hubResponse.body;
    if (!hubBody) {
      return new Response(
        JSON.stringify({ error: 'No response body from hub' }),
        { status: 502, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Create a transform stream to intercept and persist the response
    let fullAssistantResponse = '';
    const transformStream = new TransformStream({
      transform(chunk, controller) {
        // Pass through the chunk
        controller.enqueue(chunk);
        
        // Try to parse and accumulate assistant content
        const text = new TextDecoder().decode(chunk);
        const lines = text.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ') && !line.includes('[DONE]')) {
            try {
              const event = JSON.parse(line.slice(6));
              if (event.type === 'delta' && event.content) {
                fullAssistantResponse += event.content;
              }
            } catch {
              // Ignore parse errors
            }
          }
        }
      },
      async flush() {
        // Persist assistant response after stream completes
        if (fullAssistantResponse) {
          try {
            await supabase
              .from('agent_messages')
              .insert({
                session_id: sessionId,
                role: 'assistant',
                content: fullAssistantResponse,
              });
          } catch (error) {
            console.error('Failed to persist assistant message:', error);
          }
        }
      }
    });
    
    const streamedResponse = hubBody.pipeThrough(transformStream);
    
    return new Response(streamedResponse, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
    
  } catch (error) {
    console.error('Hub request failed:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to connect to Agno Hub', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 502, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
