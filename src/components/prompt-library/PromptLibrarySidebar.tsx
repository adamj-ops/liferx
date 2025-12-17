'use client';

import { useCallback } from 'react';
import type { Prompt } from '@/lib/prompts';
import {
  usePromptLibraryStore,
  useSidebarOpen,
  useSearchQuery,
  PROMPTS,
} from '@/lib/prompts';
import { CategoryList } from './CategoryList';
import { PromptInputDialog } from './PromptInputDialog';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, X } from 'lucide-react';

interface PromptLibrarySidebarProps {
  onSendPrompt: (text: string) => void;
  className?: string;
}

export function PromptLibrarySidebar({
  onSendPrompt,
  className,
}: PromptLibrarySidebarProps) {
  const sidebarOpen = useSidebarOpen();
  const searchQuery = useSearchQuery();
  const {
    setSearchQuery,
    selectPrompt,
    selectedPrompt,
    clearSelection,
    variableValues,
    setVariableValue,
    setSidebarOpen,
  } = usePromptLibraryStore();

  const handlePromptClick = useCallback(
    (prompt: Prompt) => {
      // If prompt has variables, show input dialog
      if (prompt.variables && prompt.variables.length > 0) {
        selectPrompt(prompt);
      } else {
        // No variables, send directly
        onSendPrompt(prompt.template);
        setSidebarOpen(false);
      }
    },
    [selectPrompt, onSendPrompt, setSidebarOpen]
  );

  const handleSendWithVariables = useCallback(() => {
    if (!selectedPrompt) return;

    // Replace variables in template
    let message = selectedPrompt.template;
    selectedPrompt.variables?.forEach((variable) => {
      const value = variableValues[variable.name] || variable.placeholder || `{${variable.name}}`;
      message = message.replace(new RegExp(`\\{${variable.name}\\}`, 'g'), value);
    });

    onSendPrompt(message);
    clearSelection();
    setSidebarOpen(false);
  }, [selectedPrompt, variableValues, onSendPrompt, clearSelection, setSidebarOpen]);

  if (!sidebarOpen) return null;

  return (
    <>
      <div
        className={cn(
          'flex w-72 flex-col border-r bg-background',
          className
        )}
      >
        {/* Search */}
        <div className="border-b p-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search prompts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 pl-8 text-sm"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSearchQuery('')}
                className="absolute right-1 top-1/2 h-6 w-6 -translate-y-1/2"
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>

        {/* Category List */}
        <ScrollArea className="flex-1">
          <div className="py-2">
            <CategoryList onPromptClick={handlePromptClick} />
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="border-t px-3 py-2">
          <p className="text-center text-xs text-muted-foreground">
            {PROMPTS.length} prompts available
          </p>
        </div>
      </div>

      {/* Variable Input Dialog */}
      <PromptInputDialog
        prompt={selectedPrompt}
        variableValues={variableValues}
        onVariableChange={setVariableValue}
        onSend={handleSendWithVariables}
        onCancel={clearSelection}
      />
    </>
  );
}

export default PromptLibrarySidebar;
