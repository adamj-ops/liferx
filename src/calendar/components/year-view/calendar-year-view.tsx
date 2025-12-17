'use client';

import type { IEvent } from '@/calendar/interfaces';

interface CalendarYearViewProps {
  allEvents: IEvent[];
}

export function CalendarYearView({ allEvents }: CalendarYearViewProps) {
  return (
    <div className="p-4 text-sm text-muted-foreground">
      Year view (WIP): {allEvents.length} events in year.
    </div>
  );
}


