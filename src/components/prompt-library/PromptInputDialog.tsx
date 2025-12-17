'use client';

import type { Prompt } from '@/lib/prompts';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Send, X } from 'lucide-react';

interface PromptInputDialogProps {
  prompt: Prompt | null;
  variableValues: Record<string, string>;
  onVariableChange: (name: string, value: string) => void;
  onSend: () => void;
  onCancel: () => void;
}

export function PromptInputDialog({
  prompt,
  variableValues,
  onVariableChange,
  onSend,
  onCancel,
}: PromptInputDialogProps) {
  if (!prompt) return null;

  const hasVariables = prompt.variables && prompt.variables.length > 0;
  const allVariablesFilled = prompt.variables?.every(
    (v) => variableValues[v.name]?.trim()
  );

  // Generate preview with current values
  let preview = prompt.template;
  prompt.variables?.forEach((variable) => {
    const value = variableValues[variable.name] || `{${variable.name}}`;
    preview = preview.replace(new RegExp(`\\{${variable.name}\\}`, 'g'), value);
  });

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.metaKey && allVariablesFilled) {
      onSend();
    }
  };

  return (
    <Dialog open={!!prompt} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="sm:max-w-lg" onKeyDown={handleKeyDown}>
        <DialogHeader>
          <DialogTitle>{prompt.name}</DialogTitle>
          <DialogDescription>{prompt.description}</DialogDescription>
        </DialogHeader>

        {hasVariables && (
          <div className="space-y-4 py-4">
            {prompt.variables!.map((variable) => (
              <div key={variable.name} className="space-y-2">
                <Label htmlFor={variable.name}>{variable.label}</Label>
                <Input
                  id={variable.name}
                  placeholder={variable.placeholder}
                  value={variableValues[variable.name] || ''}
                  onChange={(e) => onVariableChange(variable.name, e.target.value)}
                  autoFocus={prompt.variables![0].name === variable.name}
                />
              </div>
            ))}
          </div>
        )}

        {/* Preview */}
        <div className="rounded-lg border bg-muted/30 p-3">
          <p className="mb-1 text-xs font-medium text-muted-foreground">Preview</p>
          <p className="text-sm">{preview}</p>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onCancel}>
            <X className="mr-2 h-4 w-4" />
            Cancel
          </Button>
          <Button onClick={onSend} disabled={hasVariables && !allVariablesFilled}>
            <Send className="mr-2 h-4 w-4" />
            Send to Chat
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default PromptInputDialog;
