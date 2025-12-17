'use client';

import { useMemo, useState } from 'react';
import { format } from 'date-fns';

import { Calendar } from '@/components/ui/calendar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface QuickCalendarDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function QuickCalendarDialog({ open, onOpenChange }: QuickCalendarDialogProps) {
  const [selected, setSelected] = useState<Date | undefined>(new Date());

  const subtitle = useMemo(() => {
    if (!selected) return 'Select a date';
    return `Selected: ${format(selected, 'PPP')}`;
  }, [selected]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Calendar</DialogTitle>
          <DialogDescription>{subtitle}</DialogDescription>
        </DialogHeader>

        <div className="flex justify-center">
          <Calendar
            mode="single"
            selected={selected}
            onSelect={setSelected}
            initialFocus
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}


