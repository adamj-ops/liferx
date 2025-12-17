'use client';

import { useToolLibraryStore } from '@/lib/tools/catalog';
import { cn } from '@/lib/utils';
import { CategoryList } from './CategoryList';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Search,
  X,
  PanelLeftClose,
  PanelLeft,
  Library,
} from 'lucide-react';

interface ToolLibrarySidebarProps {
  className?: string;
}

export function ToolLibrarySidebar({ className }: ToolLibrarySidebarProps) {
  const {
    sidebarOpen,
    sidebarCollapsed,
    searchQuery,
    selectedTool,
    filteredTools,
    setSearchQuery,
    clearSearch,
    selectTool,
    toggleSidebarCollapse,
    closeSidebar,
  } = useToolLibraryStore();

  if (!sidebarOpen) return null;

  // Collapsed state - just show icons
  if (sidebarCollapsed) {
    return (
      <div
        className={cn(
          'flex w-12 flex-col border-r bg-background',
          className
        )}
      >
        <div className="flex h-14 items-center justify-center border-b">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebarCollapse}
            className="h-8 w-8"
          >
            <PanelLeft className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex flex-1 flex-col items-center gap-2 py-4">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            title="Tool Library"
          >
            <Library className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex w-72 flex-col border-r bg-background',
        className
      )}
    >
      {/* Header */}
      <div className="flex h-14 items-center justify-between border-b px-3">
        <div className="flex items-center gap-2">
          <Library className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Tool Library</span>
          <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
            {filteredTools.length}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebarCollapse}
            className="h-7 w-7"
            title="Collapse sidebar"
          >
            <PanelLeftClose className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={closeSidebar}
            className="h-7 w-7"
            title="Close sidebar"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="border-b p-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search tools..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 pl-8 pr-8 text-sm"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="icon"
              onClick={clearSearch}
              className="absolute right-1 top-1/2 h-6 w-6 -translate-y-1/2"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      {/* Tool List */}
      <div className="flex-1 overflow-y-auto p-3">
        {filteredTools.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Search className="h-8 w-8 text-muted-foreground/50" />
            <p className="mt-2 text-sm text-muted-foreground">
              No tools found
            </p>
            <Button
              variant="link"
              size="sm"
              onClick={clearSearch}
              className="mt-1"
            >
              Clear search
            </Button>
          </div>
        ) : (
          <CategoryList
            selectedToolId={selectedTool?.id}
            onToolSelect={selectTool}
          />
        )}
      </div>

      {/* Footer */}
      <div className="border-t px-3 py-2">
        <p className="text-[10px] text-muted-foreground">
          Press <kbd className="rounded border bg-muted px-1">⌘K</kbd> to search
        </p>
      </div>
    </div>
  );
}

export default ToolLibrarySidebar;
