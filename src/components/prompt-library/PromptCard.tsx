'use client';

import type { Prompt } from '@/lib/prompts';
import { cn } from '@/lib/utils';
import {
  Search,
  BarChart3,
  FileText,
  MessageSquare,
  PieChart,
  User,
  Layers,
  TrendingUp,
  Quote,
  Layout,
  Star,
  ListOrdered,
  Flag,
  Image,
  Video,
  Lightbulb,
  Folder,
  Mail,
  RefreshCw,
  Heart,
  UserPlus,
  Trophy,
  Users,
  Database,
  GitBranch,
  type LucideIcon,
} from 'lucide-react';

const ICON_MAP: Record<string, LucideIcon> = {
  Search,
  BarChart3,
  FileText,
  MessageSquare,
  PieChart,
  User,
  Layers,
  TrendingUp,
  Quote,
  Layout,
  Star,
  ListOrdered,
  Flag,
  Image,
  Video,
  Lightbulb,
  Folder,
  Mail,
  RefreshCw,
  Heart,
  UserPlus,
  Trophy,
  Users,
  Database,
  GitBranch,
};

const CATEGORY_COLORS: Record<string, string> = {
  research: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20',
  scoring: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20',
  content: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 hover:bg-purple-500/20',
  communication: 'bg-green-500/10 text-green-600 dark:text-green-400 hover:bg-green-500/20',
  analytics: 'bg-pink-500/10 text-pink-600 dark:text-pink-400 hover:bg-pink-500/20',
};

interface PromptCardProps {
  prompt: Prompt;
  onClick: (prompt: Prompt) => void;
  className?: string;
}

export function PromptCard({ prompt, onClick, className }: PromptCardProps) {
  const Icon = ICON_MAP[prompt.icon] || Search;
  const colorClass = CATEGORY_COLORS[prompt.category] || CATEGORY_COLORS.research;
  const hasVariables = prompt.variables && prompt.variables.length > 0;

  return (
    <button
      onClick={() => onClick(prompt)}
      className={cn(
        'group flex w-full items-start gap-3 rounded-lg p-2.5 text-left transition-colors',
        'hover:bg-accent/50',
        className
      )}
    >
      <div
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-md transition-colors',
          colorClass
        )}
      >
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium">{prompt.name}</span>
          {hasVariables && (
            <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
              {prompt.variables!.length} var{prompt.variables!.length > 1 ? 's' : ''}
            </span>
          )}
        </div>
        <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
          {prompt.description}
        </p>
      </div>
    </button>
  );
}

export default PromptCard;
