'use client';

import { useToolLibraryStore } from '@/lib/tools/catalog';
import type { ToolExecutionStatus } from '@/lib/tools/catalog';
import { cn } from '@/lib/utils';
import { ParameterForm } from './ParameterForm';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Search,
  BarChart3,
  FileText,
  MessageSquare,
  PieChart,
  X,
  Play,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  type LucideIcon,
} from 'lucide-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  research: Search,
  scoring: BarChart3,
  content: FileText,
  communication: MessageSquare,
  analytics: PieChart,
};

const CATEGORY_COLORS: Record<string, string> = {
  research: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  scoring: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  content: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
  communication: 'bg-green-500/10 text-green-600 dark:text-green-400',
  analytics: 'bg-pink-500/10 text-pink-600 dark:text-pink-400',
};

const STATUS_ICONS: Record<ToolExecutionStatus, LucideIcon | null> = {
  idle: null,
  validating: Loader2,
  running: Loader2,
  success: CheckCircle2,
  error: XCircle,
};

interface ToolConfigPanelProps {
  className?: string;
}

export function ToolConfigPanel({ className }: ToolConfigPanelProps) {
  const {
    selectedTool,
    configPanelOpen,
    executionState,
    parameterValues,
    closeConfigPanel,
    clearSelection,
    startExecution,
    completeExecution,
    failExecution,
    resetExecution,
  } = useToolLibraryStore();

  if (!selectedTool || !configPanelOpen) return null;

  const Icon = CATEGORY_ICONS[selectedTool.category] || Search;
  const categoryColor = CATEGORY_COLORS[selectedTool.category];
  const isExecuting =
    executionState.status === 'running' ||
    executionState.status === 'validating';
  const StatusIcon = STATUS_ICONS[executionState.status];

  const handleRun = async () => {
    // Validate required parameters
    const missingRequired = selectedTool.parameters
      .filter((p) => p.required && parameterValues[p.name] === undefined)
      .map((p) => p.label);

    if (missingRequired.length > 0) {
      failExecution(`Missing required parameters: ${missingRequired.join(', ')}`);
      return;
    }

    startExecution();

    // TODO: Wire up to actual tool execution
    // For now, simulate execution
    try {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      completeExecution({
        message: 'Tool executed successfully',
        parameters: parameterValues,
      });
    } catch (err) {
      failExecution(err instanceof Error ? err.message : 'Execution failed');
    }
  };

  const handleClose = () => {
    closeConfigPanel();
    clearSelection();
    resetExecution();
  };

  return (
    <div
      className={cn(
        'flex w-96 flex-col border-l bg-background',
        className
      )}
    >
      {/* Header */}
      <div className="flex h-14 items-center justify-between border-b px-4">
        <div className="flex items-center gap-2 overflow-hidden">
          <div
            className={cn(
              'flex h-7 w-7 shrink-0 items-center justify-center rounded-md',
              categoryColor
            )}
          >
            <Icon className="h-3.5 w-3.5" />
          </div>
          <span className="truncate text-sm font-medium">
            {selectedTool.name}
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleClose}
          className="h-7 w-7 shrink-0"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-4 p-4">
          {/* Badges */}
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary" className={categoryColor}>
              {selectedTool.category.charAt(0).toUpperCase() +
                selectedTool.category.slice(1)}
            </Badge>
            {selectedTool.status === 'beta' && (
              <Badge
                variant="secondary"
                className="bg-yellow-500/10 text-yellow-600 dark:text-yellow-400"
              >
                Beta
              </Badge>
            )}
            {selectedTool.requiresWrites && (
              <Badge variant="outline" className="text-xs">
                Writes Data
              </Badge>
            )}
          </div>

          {/* Description */}
          <p className="text-sm text-muted-foreground">
            {selectedTool.description}
          </p>

          {/* Duration */}
          {selectedTool.estimatedDuration && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              <span>Estimated: {selectedTool.estimatedDuration}</span>
            </div>
          )}

          {/* Parameters */}
          <ParameterForm tool={selectedTool} disabled={isExecuting} />

          {/* Output */}
          {executionState.status !== 'idle' && (
            <Collapsible defaultOpen className="space-y-2">
              <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border bg-muted/30 px-3 py-2 text-sm font-medium hover:bg-muted/50">
                <div className="flex items-center gap-2">
                  {StatusIcon && (
                    <StatusIcon
                      className={cn(
                        'h-4 w-4',
                        isExecuting && 'animate-spin',
                        executionState.status === 'success' && 'text-green-500',
                        executionState.status === 'error' && 'text-destructive'
                      )}
                    />
                  )}
                  <span>
                    {executionState.status === 'running'
                      ? 'Running...'
                      : executionState.status === 'success'
                        ? 'Completed'
                        : executionState.status === 'error'
                          ? 'Error'
                          : 'Output'}
                  </span>
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div
                  className={cn(
                    'rounded-lg border p-3 text-sm',
                    executionState.status === 'error' &&
                      'border-destructive/50 bg-destructive/5'
                  )}
                >
                  {executionState.error ? (
                    <p className="text-destructive">{executionState.error}</p>
                  ) : executionState.result ? (
                    <pre className="overflow-x-auto whitespace-pre-wrap font-mono text-xs">
                      {JSON.stringify(executionState.result, null, 2)}
                    </pre>
                  ) : (
                    <p className="text-muted-foreground">Processing...</p>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}
        </div>
      </ScrollArea>

      {/* Footer Actions */}
      <div className="flex items-center gap-2 border-t p-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => resetExecution()}
          disabled={isExecuting}
          className="flex-1"
        >
          Reset
        </Button>
        <Button
          size="sm"
          onClick={handleRun}
          disabled={isExecuting || selectedTool.status === 'coming_soon'}
          className="flex-1 gap-1.5"
        >
          {isExecuting ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Running...
            </>
          ) : (
            <>
              <Play className="h-3.5 w-3.5" />
              Run Tool
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

export default ToolConfigPanel;
