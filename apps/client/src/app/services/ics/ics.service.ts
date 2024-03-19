import { capitalize } from '@ghostfolio/common/helper';
import { Export } from '@ghostfolio/common/interfaces';

import { Injectable } from '@angular/core';
import { Type } from '@prisma/client';
import { format, parseISO } from 'date-fns';

@Injectable({
  providedIn: 'root'
})
export class IcsService {
  private readonly ICS_DATE_FORMAT = 'yyyyMMdd';
  private readonly ICS_LINE_BREAK = '\r\n';

  public constructor() {}

  public transformActivitiesToIcsContent(
    aActivities: Export['activities']
  ): string {
    const header = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Ghostfolio//NONSGML v1.0//EN'
    ];
    const events = aActivities.map((activity) => {
      return this.getEvent({
        date: parseISO(activity.date),
        id: activity.id,
        symbol: activity.symbol,
        type: activity.type
      });
    });
    const footer = ['END:VCALENDAR'];

    return [...header, ...events, ...footer].join(this.ICS_LINE_BREAK);
  }

  private getEvent({
    date,
    id,
    symbol,
    type
  }: {
    date: Date;
    id: string;
    symbol: string;
    type: Type;
  }) {
    const today = format(new Date(), this.ICS_DATE_FORMAT);

    return [
      'BEGIN:VEVENT',
      `UID:${id}`,
      `DTSTAMP:${today}T000000`,
      `DTSTART;VALUE=DATE:${format(date, this.ICS_DATE_FORMAT)}`,
      `SUMMARY:${capitalize(type)} ${symbol}`,
      'END:VEVENT'
    ].join(this.ICS_LINE_BREAK);
  }
}
