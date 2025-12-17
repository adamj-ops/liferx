'use client';

import type { CatalogTool } from '@/lib/tools/catalog';
import { useToolLibraryStore } from '@/lib/tools/catalog';
import { ParameterInput } from './ParameterInput';
import { Button } from '@/components/ui/button';
import { RotateCcw } from 'lucide-react';

interface ParameterFormProps {
  tool: CatalogTool;
  disabled?: boolean;
}

export function ParameterForm({ tool, disabled }: ParameterFormProps) {
  const { parameterValues, setParameterValue, resetParameters } =
    useToolLibraryStore();

  if (tool.parameters.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-4 text-center">
        <p className="text-sm text-muted-foreground">
          This tool doesn&apos;t require any parameters
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium">Parameters</h4>
        <Button
          variant="ghost"
          size="sm"
          onClick={resetParameters}
          disabled={disabled}
          className="h-7 gap-1 text-xs"
        >
          <RotateCcw className="h-3 w-3" />
          Reset
        </Button>
      </div>

      <div className="space-y-4">
        {tool.parameters.map((param) => (
          <ParameterInput
            key={param.name}
            parameter={param}
            value={parameterValues[param.name]}
            onChange={(value) => setParameterValue(param.name, value)}
            disabled={disabled}
          />
        ))}
      </div>
    </div>
  );
}

export default ParameterForm;
