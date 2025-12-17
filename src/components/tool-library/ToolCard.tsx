'use client';

import type { CatalogTool, ToolStatus } from '@/lib/tools/catalog';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import {
  Search,
  BarChart3,
  FileText,
  MessageSquare,
  PieChart,
  type LucideIcon,
} from 'lucide-react';

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  research: Search,
  scoring: BarChart3,
  content: FileText,
  communication: MessageSquare,
  analytics: PieChart,
};

const STATUS_CONFIG: Record<
  ToolStatus,
  { label: string; className: string; dot?: string }
> = {
  available: {
    label: 'Available',
    className: 'bg-green-500/10 text-green-600 dark:text-green-400',
    dot: 'bg-green-500',
  },
  beta: {
    label: 'Beta',
    className: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400',
  },
  coming_soon: {
    label: 'Coming Soon',
    className: 'bg-muted text-muted-foreground',
  },
};

interface ToolCardProps {
  tool: CatalogTool;
  isSelected?: boolean;
  onClick?: () => void;
  compact?: boolean;
}

export function ToolCard({
  tool,
  isSelected,
  onClick,
  compact = false,
}: ToolCardProps) {
  const Icon = CATEGORY_ICONS[tool.category] || Search;
  const statusConfig = STATUS_CONFIG[tool.status];
  const isDisabled = tool.status === 'coming_soon';

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isDisabled}
      className={cn(
        'group flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors',
        'hover:bg-accent/50',
        isSelected && 'border-primary bg-primary/5',
        isDisabled && 'cursor-not-allowed opacity-60',
        compact && 'p-2'
      )}
    >
      {/* Icon */}
      <div
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-md',
          'bg-muted/50 text-muted-foreground',
          'group-hover:bg-primary/10 group-hover:text-primary',
          isSelected && 'bg-primary/10 text-primary',
          compact && 'h-6 w-6'
        )}
      >
        <Icon className={cn('h-4 w-4', compact && 'h-3.5 w-3.5')} />
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'truncate font-medium',
              compact ? 'text-xs' : 'text-sm'
            )}
          >
            {tool.name}
          </span>

          {/* Status indicator */}
          {tool.status === 'available' && statusConfig.dot && (
            <span
              className={cn('h-1.5 w-1.5 shrink-0 rounded-full', statusConfig.dot)}
            />
          )}
          {tool.status !== 'available' && (
            <Badge
              variant="secondary"
              className={cn('shrink-0 text-[10px] px-1.5 py-0', statusConfig.className)}
            >
              {statusConfig.label}
            </Badge>
          )}
        </div>

        {!compact && (
          <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
            {tool.description}
          </p>
        )}

        {/* Duration estimate */}
        {!compact && tool.estimatedDuration && tool.status === 'available' && (
          <span className="mt-1 inline-block text-[10px] text-muted-foreground/70">
            {tool.estimatedDuration}
          </span>
        )}
      </div>
    </button>
  );
}

export default ToolCard;
