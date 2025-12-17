'use client';

import type { IEvent } from '@/calendar/interfaces';

interface CalendarWeekViewProps {
  singleDayEvents: IEvent[];
  multiDayEvents: IEvent[];
}

export function CalendarWeekView({ singleDayEvents, multiDayEvents }: CalendarWeekViewProps) {
  const count = singleDayEvents.length + multiDayEvents.length;
  return (
    <div className="p-4 text-sm text-muted-foreground">
      Week view (WIP): {count} events this week.
    </div>
  );
}


