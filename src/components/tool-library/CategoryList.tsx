'use client';

import type { CategoryInfo, CatalogTool, ToolCategory } from '@/lib/tools/catalog';
import {
  CATEGORIES,
  useToolLibraryStore,
  useIsCategoryExpanded,
  useToolsForCategory,
} from '@/lib/tools/catalog';
import { cn } from '@/lib/utils';
import { ToolCard } from './ToolCard';
import {
  Search,
  BarChart3,
  FileText,
  MessageSquare,
  PieChart,
  ChevronRight,
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

interface CategoryItemProps {
  category: CategoryInfo;
  tools: CatalogTool[];
  selectedToolId?: string;
  onToolSelect?: (toolId: string) => void;
}

function CategoryItem({
  category,
  tools,
  selectedToolId,
  onToolSelect,
}: CategoryItemProps) {
  const isExpanded = useIsCategoryExpanded(category.id);
  const { toggleCategory } = useToolLibraryStore();
  const Icon = CATEGORY_ICONS[category.id] || Search;

  const availableCount = tools.filter((t) => t.status === 'available').length;

  return (
    <Collapsible open={isExpanded} onOpenChange={() => toggleCategory(category.id)}>
      <CollapsibleTrigger
        className={cn(
          'flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium',
          'hover:bg-accent/50 transition-colors',
          isExpanded && 'bg-accent/30'
        )}
      >
        <ChevronRight
          className={cn(
            'h-4 w-4 shrink-0 text-muted-foreground transition-transform',
            isExpanded && 'rotate-90'
          )}
        />
        <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className="flex-1 text-left">{category.name}</span>
        <span className="shrink-0 text-xs text-muted-foreground">
          {availableCount}/{tools.length}
        </span>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="ml-6 mt-1 space-y-1 border-l pl-2">
          {tools.map((tool) => (
            <ToolCard
              key={tool.id}
              tool={tool}
              compact
              isSelected={selectedToolId === tool.id}
              onClick={() => onToolSelect?.(tool.id)}
            />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

interface CategoryListProps {
  selectedToolId?: string;
  onToolSelect?: (toolId: string) => void;
  className?: string;
}

export function CategoryList({
  selectedToolId,
  onToolSelect,
  className,
}: CategoryListProps) {
  const filteredTools = useToolLibraryStore((state) => state.filteredTools);

  // Group tools by category
  const toolsByCategory = CATEGORIES.reduce(
    (acc, category) => {
      acc[category.id] = filteredTools.filter(
        (tool) => tool.category === category.id
      );
      return acc;
    },
    {} as Record<ToolCategory, CatalogTool[]>
  );

  return (
    <div className={cn('space-y-1', className)}>
      {CATEGORIES.map((category) => {
        const categoryTools = toolsByCategory[category.id];
        if (categoryTools.length === 0) return null;

        return (
          <CategoryItem
            key={category.id}
            category={category}
            tools={categoryTools}
            selectedToolId={selectedToolId}
            onToolSelect={onToolSelect}
          />
        );
      })}
    </div>
  );
}

export default CategoryList;
