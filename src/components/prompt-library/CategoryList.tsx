'use client';

import type { Prompt, PromptCategory } from '@/lib/prompts';
import {
  CATEGORIES,
  usePromptLibraryStore,
  useIsCategoryExpanded,
  usePromptsForCategory,
} from '@/lib/prompts';
import { PromptCard } from './PromptCard';
import { cn } from '@/lib/utils';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Search,
  BarChart3,
  FileText,
  MessageSquare,
  PieChart,
  ChevronRight,
  type LucideIcon,
} from 'lucide-react';

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  research: Search,
  scoring: BarChart3,
  content: FileText,
  communication: MessageSquare,
  analytics: PieChart,
};

interface CategorySectionProps {
  category: PromptCategory;
  onPromptClick: (prompt: Prompt) => void;
}

function CategorySection({ category, onPromptClick }: CategorySectionProps) {
  const categoryInfo = CATEGORIES.find((c) => c.id === category);
  const isExpanded = useIsCategoryExpanded(category);
  const prompts = usePromptsForCategory(category);
  const { toggleCategory } = usePromptLibraryStore();

  if (!categoryInfo || prompts.length === 0) return null;

  const Icon = CATEGORY_ICONS[category] || Search;

  return (
    <Collapsible open={isExpanded} onOpenChange={() => toggleCategory(category)}>
      <CollapsibleTrigger className="flex w-full items-center gap-2 px-3 py-2 hover:bg-accent/50">
        <ChevronRight
          className={cn(
            'h-4 w-4 shrink-0 text-muted-foreground transition-transform',
            isExpanded && 'rotate-90'
          )}
        />
        <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className="flex-1 text-left text-sm font-medium">
          {categoryInfo.name}
        </span>
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
          {prompts.length}
        </span>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="space-y-1 px-2 pb-2">
          {prompts.map((prompt) => (
            <PromptCard
              key={prompt.id}
              prompt={prompt}
              onClick={onPromptClick}
            />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

interface CategoryListProps {
  onPromptClick: (prompt: Prompt) => void;
}

export function CategoryList({ onPromptClick }: CategoryListProps) {
  return (
    <div className="space-y-1">
      {CATEGORIES.map((category) => (
        <CategorySection
          key={category.id}
          category={category.id}
          onPromptClick={onPromptClick}
        />
      ))}
    </div>
  );
}

export default CategoryList;
