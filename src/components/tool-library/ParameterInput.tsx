'use client';

import type { ToolParameter } from '@/lib/tools/catalog';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { HelpCircle } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ParameterInputProps {
  parameter: ToolParameter;
  value: unknown;
  onChange: (value: unknown) => void;
  disabled?: boolean;
  error?: string;
}

export function ParameterInput({
  parameter,
  value,
  onChange,
  disabled,
  error,
}: ParameterInputProps) {
  const inputId = `param-${parameter.name}`;

  const renderLabel = () => (
    <div className="mb-1.5 flex items-center gap-1.5">
      <Label htmlFor={inputId} className="text-sm font-medium">
        {parameter.label}
      </Label>
      {parameter.required && (
        <span className="text-destructive">*</span>
      )}
      {parameter.description && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <HelpCircle className="h-3.5 w-3.5 cursor-help text-muted-foreground" />
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs">
              <p className="text-xs">{parameter.description}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );

  const renderInput = () => {
    switch (parameter.type) {
      case 'string':
        return (
          <Input
            id={inputId}
            type="text"
            value={(value as string) ?? ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={parameter.placeholder}
            disabled={disabled}
            className={cn(error && 'border-destructive')}
          />
        );

      case 'number':
        return (
          <Input
            id={inputId}
            type="number"
            value={(value as number) ?? ''}
            onChange={(e) => onChange(e.target.valueAsNumber || undefined)}
            placeholder={parameter.placeholder}
            disabled={disabled}
            min={parameter.validation?.min}
            max={parameter.validation?.max}
            className={cn(error && 'border-destructive')}
          />
        );

      case 'boolean':
        return (
          <div className="flex items-center gap-2">
            <Switch
              id={inputId}
              checked={(value as boolean) ?? false}
              onCheckedChange={onChange}
              disabled={disabled}
            />
            <Label htmlFor={inputId} className="text-sm text-muted-foreground">
              {(value as boolean) ? 'Enabled' : 'Disabled'}
            </Label>
          </div>
        );

      case 'select':
        return (
          <Select
            value={(value as string) ?? ''}
            onValueChange={onChange}
            disabled={disabled}
          >
            <SelectTrigger id={inputId} className={cn(error && 'border-destructive')}>
              <SelectValue placeholder={parameter.placeholder || 'Select...'} />
            </SelectTrigger>
            <SelectContent>
              {parameter.options?.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'multiselect':
        const selectedValues = (value as string[]) ?? [];
        return (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-1">
              {selectedValues.map((v) => {
                const option = parameter.options?.find((o) => o.value === v);
                return (
                  <Badge
                    key={v}
                    variant="secondary"
                    className="cursor-pointer"
                    onClick={() =>
                      onChange(selectedValues.filter((sv) => sv !== v))
                    }
                  >
                    {option?.label || v}
                    <span className="ml-1">&times;</span>
                  </Badge>
                );
              })}
            </div>
            <Select
              value=""
              onValueChange={(newValue) => {
                if (!selectedValues.includes(newValue)) {
                  onChange([...selectedValues, newValue]);
                }
              }}
              disabled={disabled}
            >
              <SelectTrigger className={cn(error && 'border-destructive')}>
                <SelectValue placeholder="Add..." />
              </SelectTrigger>
              <SelectContent>
                {parameter.options
                  ?.filter((o) => !selectedValues.includes(o.value))
                  .map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        );

      case 'date':
        return (
          <Input
            id={inputId}
            type="date"
            value={(value as string) ?? ''}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            className={cn(error && 'border-destructive')}
          />
        );

      case 'textarea':
        return (
          <Textarea
            id={inputId}
            value={(value as string) ?? ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={parameter.placeholder}
            disabled={disabled}
            rows={4}
            className={cn(error && 'border-destructive')}
          />
        );

      case 'json':
        return (
          <Textarea
            id={inputId}
            value={
              typeof value === 'string'
                ? value
                : value !== undefined
                  ? JSON.stringify(value, null, 2)
                  : ''
            }
            onChange={(e) => {
              try {
                onChange(JSON.parse(e.target.value));
              } catch {
                onChange(e.target.value);
              }
            }}
            placeholder={parameter.placeholder || '{\n  \n}'}
            disabled={disabled}
            rows={6}
            className={cn(
              'font-mono text-xs',
              error && 'border-destructive'
            )}
          />
        );

      default:
        return (
          <Input
            id={inputId}
            type="text"
            value={(value as string) ?? ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={parameter.placeholder}
            disabled={disabled}
          />
        );
    }
  };

  return (
    <div className="space-y-1">
      {parameter.type !== 'boolean' && renderLabel()}
      {parameter.type === 'boolean' && (
        <div className="flex items-center justify-between">
          {renderLabel()}
          {renderInput()}
        </div>
      )}
      {parameter.type !== 'boolean' && renderInput()}
      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}
    </div>
  );
}

export default ParameterInput;
