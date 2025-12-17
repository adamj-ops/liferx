'use client';

/**
 * AI DevTools
 * 
 * Debugging panel for monitoring tool calls and events.
 * Only renders in development mode.
 */

import { useState } from 'react';
import { useToolEvents } from '@/lib/chat/store';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ChevronDown,
  ChevronRight,
  X,
  Wrench,
  Clock,
  CheckCircle,
  AlertCircle,
  Bug,
} from 'lucide-react';

interface AIDevToolsProps {
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
}

export function AIDevTools({ position = 'bottom-right' }: AIDevToolsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'tools' | 'events'>('tools');
  const toolEvents = useToolEvents();
  
  // Only render in development
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }
  
  const positionClasses = {
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
  };
  
  const pendingCount = toolEvents.filter((e) => e.status === 'pending').length;
  const successCount = toolEvents.filter((e) => e.status === 'success').length;
  const errorCount = toolEvents.filter((e) => e.status === 'error').length;
  
  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className={cn(
          'fixed z-50 flex items-center gap-2 rounded-full bg-zinc-900 px-4 py-2 text-sm text-white shadow-lg hover:bg-zinc-800 transition-colors',
          positionClasses[position]
        )}
      >
        <Bug className="h-4 w-4" />
        <span className="hidden sm:inline">DevTools</span>
        {toolEvents.length > 0 && (
          <Badge variant="secondary" className="ml-1">
            {toolEvents.length}
          </Badge>
        )}
      </button>
    );
  }
  
  return (
    <div
      className={cn(
        'fixed z-50 flex h-96 w-[400px] flex-col rounded-lg border bg-card shadow-xl',
        positionClasses[position]
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b px-3 py-2">
        <div className="flex items-center gap-2">
          <Bug className="h-4 w-4 text-muted-foreground" />
          <span className="font-semibold text-sm">AI DevTools</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-xs">
            {pendingCount > 0 && (
              <Badge variant="outline" className="text-yellow-500">
                <Clock className="mr-1 h-3 w-3" />
                {pendingCount}
              </Badge>
            )}
            {successCount > 0 && (
              <Badge variant="outline" className="text-green-500">
                <CheckCircle className="mr-1 h-3 w-3" />
                {successCount}
              </Badge>
            )}
            {errorCount > 0 && (
              <Badge variant="outline" className="text-red-500">
                <AlertCircle className="mr-1 h-3 w-3" />
                {errorCount}
              </Badge>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => setIsOpen(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      {/* Tabs */}
      <div className="flex border-b">
        <button
          onClick={() => setActiveTab('tools')}
          className={cn(
            'flex-1 px-3 py-2 text-xs font-medium transition-colors',
            activeTab === 'tools'
              ? 'border-b-2 border-primary text-primary'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          Tool Calls
        </button>
        <button
          onClick={() => setActiveTab('events')}
          className={cn(
            'flex-1 px-3 py-2 text-xs font-medium transition-colors',
            activeTab === 'events'
              ? 'border-b-2 border-primary text-primary'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          Events
        </button>
      </div>
      
      {/* Content */}
      <div className="flex-1 overflow-auto p-2">
        {toolEvents.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            No tool calls yet
          </div>
        ) : (
          <div className="space-y-2">
            {toolEvents.map((event) => (
              <ToolEventItem key={event.id} event={event} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface ToolEventItemProps {
  event: {
    id: string;
    type: 'tool_start' | 'tool_result';
    tool: string;
    args?: unknown;
    data?: unknown;
    explainability?: unknown;
    timestamp: Date;
    duration?: number;
    status: 'pending' | 'success' | 'error';
  };
}

function ToolEventItem({ event }: ToolEventItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const statusIcon = {
    pending: <Clock className="h-3 w-3 text-yellow-500" />,
    success: <CheckCircle className="h-3 w-3 text-green-500" />,
    error: <AlertCircle className="h-3 w-3 text-red-500" />,
  };
  
  return (
    <div className="rounded border bg-muted/50">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center gap-2 px-2 py-1.5 text-left"
      >
        {isExpanded ? (
          <ChevronDown className="h-3 w-3 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-3 w-3 text-muted-foreground" />
        )}
        <Wrench className="h-3 w-3 text-muted-foreground" />
        <span className="flex-1 font-mono text-xs">{event.tool}</span>
        {statusIcon[event.status]}
        {event.duration && (
          <span className="text-[10px] text-muted-foreground">
            {event.duration}ms
          </span>
        )}
      </button>
      
      {isExpanded && (
        <div className="border-t px-2 py-2 text-xs">
          <div className="space-y-2">
            {event.args && (
              <div>
                <div className="font-medium text-muted-foreground">Input</div>
                <pre className="mt-1 overflow-auto rounded bg-muted p-2 text-[10px]">
                  {JSON.stringify(event.args, null, 2)}
                </pre>
              </div>
            )}
            {event.data && (
              <div>
                <div className="font-medium text-muted-foreground">Output</div>
                <pre className="mt-1 overflow-auto rounded bg-muted p-2 text-[10px]">
                  {JSON.stringify(event.data, null, 2)}
                </pre>
              </div>
            )}
            {event.explainability && (
              <div>
                <div className="font-medium text-muted-foreground">Explainability</div>
                <pre className="mt-1 overflow-auto rounded bg-muted p-2 text-[10px]">
                  {JSON.stringify(event.explainability, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default AIDevTools;

