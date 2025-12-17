'use client';

import { useToolLibraryStore } from '@/lib/tools/catalog';
import { useToolExecution } from '@/lib/tools/catalog/useToolExecution';
import type { ToolExecutionStatus } from '@/lib/tools/catalog';
import type { ToolResponse, WriteRecord } from '@/lib/tools/types';
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
  AlertTriangle,
  Info,
  Database,
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
    failExecution,
    resetExecution,
  } = useToolLibraryStore();

  const { executeWithState } = useToolExecution();

  if (!selectedTool || !configPanelOpen) return null;

  const Icon = CATEGORY_ICONS[selectedTool.category] || Search;
  const categoryColor = CATEGORY_COLORS[selectedTool.category];
  const isExecuting =
    executionState.status === 'running' ||
    executionState.status === 'validating';
  const StatusIcon = STATUS_ICONS[executionState.status];

  // Check if tool has backend implementation
  const hasImplementation = !!selectedTool.toolName;

  // Extract result data for display
  const result = executionState.result as ToolResponse | undefined;
  const resultData = result?.data;
  const explainability = result?.explainability;
  const writes = result?.writes;

  const handleRun = async () => {
    // Check if tool has backend implementation
    if (!selectedTool.toolName) {
      failExecution('This tool is not yet implemented. Check back soon!');
      return;
    }

    // Validate required parameters
    const missingRequired = selectedTool.parameters
      .filter((p) => p.required && parameterValues[p.name] === undefined)
      .map((p) => p.label);

    if (missingRequired.length > 0) {
      failExecution(`Missing required parameters: ${missingRequired.join(', ')}`);
      return;
    }

    // Execute tool via API
    await executeWithState(selectedTool.toolName, parameterValues, {
      allowWrites: selectedTool.requiresWrites,
    });
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

          {/* Not Implemented Warning */}
          {!hasImplementation && (
            <div className="flex items-start gap-2 rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-yellow-600" />
              <div className="text-sm">
                <p className="font-medium text-yellow-600">Not Yet Implemented</p>
                <p className="text-muted-foreground">
                  This tool is planned but doesn&apos;t have a backend implementation yet.
                </p>
              </div>
            </div>
          )}

          {/* Output */}
          {executionState.status !== 'idle' ? (
            <div className="space-y-3">
              {/* Status Header */}
              <div className="flex items-center gap-2 text-sm font-medium">
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
                      ? 'Completed Successfully'
                      : executionState.status === 'error'
                        ? 'Error'
                        : 'Output'}
                </span>
              </div>

              {executionState.error ? (
                <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-3">
                  <p className="text-sm text-destructive">{executionState.error}</p>
                </div>
              ) : null}

              {resultData ? (
                <Collapsible defaultOpen className="space-y-2">
                  <CollapsibleTrigger className="flex w-full items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2 text-sm font-medium hover:bg-muted/50">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span>Result Data</span>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <pre className="overflow-x-auto whitespace-pre-wrap rounded-lg border bg-muted/20 p-3 font-mono text-xs">
                      {JSON.stringify(resultData, null, 2)}
                    </pre>
                  </CollapsibleContent>
                </Collapsible>
              ) : null}

              {explainability && Object.keys(explainability).length > 0 ? (
                <Collapsible className="space-y-2">
                  <CollapsibleTrigger className="flex w-full items-center gap-2 rounded-lg border bg-blue-500/5 px-3 py-2 text-sm font-medium hover:bg-blue-500/10">
                    <Info className="h-4 w-4 text-blue-500" />
                    <span>Why / How</span>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-3">
                      <pre className="overflow-x-auto whitespace-pre-wrap font-mono text-xs text-muted-foreground">
                        {JSON.stringify(explainability, null, 2)}
                      </pre>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              ) : null}

              {writes && writes.length > 0 ? (
                <Collapsible className="space-y-2">
                  <CollapsibleTrigger className="flex w-full items-center gap-2 rounded-lg border bg-purple-500/5 px-3 py-2 text-sm font-medium hover:bg-purple-500/10">
                    <Database className="h-4 w-4 text-purple-500" />
                    <span>Database Writes ({writes.length})</span>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="space-y-2">
                      {writes.map((write: WriteRecord) => (
                        <div
                          key={`${write.table}-${write.operation}-${write.id || 'no-id'}`}
                          className="rounded-lg border border-purple-500/20 bg-purple-500/5 p-2 text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-[10px]">
                              {write.operation}
                            </Badge>
                            <span className="font-mono text-muted-foreground">
                              {write.table}
                            </span>
                          </div>
                          {write.id && (
                            <p className="mt-1 font-mono text-muted-foreground">
                              ID: {write.id}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              ) : null}

              {isExecuting && !resultData && !executionState.error ? (
                <div className="rounded-lg border p-3">
                  <p className="text-sm text-muted-foreground">Processing...</p>
                </div>
              ) : null}
            </div>
          ) : null}
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
