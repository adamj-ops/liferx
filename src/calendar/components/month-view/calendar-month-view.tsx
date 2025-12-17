'use client';

import type { IEvent } from '@/calendar/interfaces';

interface CalendarMonthViewProps {
  singleDayEvents: IEvent[];
  multiDayEvents: IEvent[];
}

export function CalendarMonthView({ singleDayEvents, multiDayEvents }: CalendarMonthViewProps) {
  const count = singleDayEvents.length + multiDayEvents.length;
  return (
    <div className="p-4 text-sm text-muted-foreground">
      Month view (WIP): {count} events in range.
    </div>
  );
}


