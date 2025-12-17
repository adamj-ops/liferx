'use client';

import type { IEvent } from '@/calendar/interfaces';

interface CalendarDayViewProps {
  singleDayEvents: IEvent[];
  multiDayEvents: IEvent[];
}

export function CalendarDayView({ singleDayEvents, multiDayEvents }: CalendarDayViewProps) {
  const count = singleDayEvents.length + multiDayEvents.length;
  return (
    <div className="p-4 text-sm text-muted-foreground">
      Day view (WIP): {count} events today.
    </div>
  );
}


