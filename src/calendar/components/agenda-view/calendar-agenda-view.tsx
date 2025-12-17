'use client';

import type { IEvent } from '@/calendar/interfaces';

interface CalendarAgendaViewProps {
  singleDayEvents: IEvent[];
  multiDayEvents: IEvent[];
}

export function CalendarAgendaView({ singleDayEvents, multiDayEvents }: CalendarAgendaViewProps) {
  const count = singleDayEvents.length + multiDayEvents.length;
  return (
    <div className="p-4 text-sm text-muted-foreground">
      Agenda view (WIP): {count} events in month.
    </div>
  );
}


