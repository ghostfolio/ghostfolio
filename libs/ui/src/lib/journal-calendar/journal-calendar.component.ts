import {
  JournalCalendarDataItem,
  JournalStats
} from '@ghostfolio/common/interfaces';

import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { IonIcon } from '@ionic/angular/standalone';
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  format,
  getDay,
  startOfMonth,
  subMonths
} from 'date-fns';
import { addIcons } from 'ionicons';
import {
  chevronBackOutline,
  chevronForwardOutline,
  documentTextOutline
} from 'ionicons/icons';

export interface CalendarDay {
  data?: JournalCalendarDataItem;
  date: Date;
  dayOfMonth: number;
  isCurrentMonth: boolean;
  isToday: boolean;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, IonIcon, MatButtonModule, MatCardModule],
  selector: 'gf-journal-calendar',
  styleUrls: ['./journal-calendar.component.scss'],
  templateUrl: './journal-calendar.component.html'
})
export class GfJournalCalendarComponent implements OnChanges {
  @Input() baseCurrency: string;
  @Input() days: JournalCalendarDataItem[] = [];
  @Input() locale: string;
  @Input() month: number;
  @Input() stats: JournalStats;
  @Input() year: number;

  @Output() dayClicked = new EventEmitter<string>();
  @Output() monthChanged = new EventEmitter<{ month: number; year: number }>();

  public calendarWeeks: CalendarDay[][] = [];
  public weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  public get monthLabel(): string {
    return format(new Date(this.year, this.month - 1), 'MMMM yyyy');
  }

  public get winRate(): number {
    if (!this.stats || this.stats.totalTradingDays === 0) {
      return 0;
    }

    return Math.round(
      (this.stats.winningDays / this.stats.totalTradingDays) * 100
    );
  }

  public constructor() {
    addIcons({
      chevronBackOutline,
      chevronForwardOutline,
      documentTextOutline
    });
  }

  public ngOnChanges() {
    this.buildCalendar();
  }

  public onPreviousMonth() {
    const prev = subMonths(new Date(this.year, this.month - 1), 1);
    this.monthChanged.emit({
      month: prev.getMonth() + 1,
      year: prev.getFullYear()
    });
  }

  public onNextMonth() {
    const next = addMonths(new Date(this.year, this.month - 1), 1);
    this.monthChanged.emit({
      month: next.getMonth() + 1,
      year: next.getFullYear()
    });
  }

  public onDayClick(day: CalendarDay) {
    if (day.isCurrentMonth) {
      this.dayClicked.emit(format(day.date, 'yyyy-MM-dd'));
    }
  }

  public getDayClass(day: CalendarDay): string {
    if (!day.isCurrentMonth) {
      return 'other-month';
    }

    if (!day.data) {
      return '';
    }

    if (day.data.netPerformance > 0) {
      return 'positive';
    }

    if (day.data.netPerformance < 0) {
      return 'negative';
    }

    return 'neutral';
  }

  public formatCurrency(value: number): string {
    if (value === 0 || value === undefined || value === null) {
      return '';
    }

    try {
      return new Intl.NumberFormat(this.locale ?? 'en-US', {
        style: 'currency',
        currency: this.baseCurrency ?? 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(value);
    } catch {
      return value.toFixed(0);
    }
  }

  private buildCalendar() {
    const currentDate = new Date(this.year, this.month - 1);
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const today = new Date();

    const daysDataMap = new Map<string, JournalCalendarDataItem>();

    for (const day of this.days) {
      daysDataMap.set(day.date, day);
    }

    const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
    const startDayOfWeek = getDay(monthStart);

    const calendarDays: CalendarDay[] = [];

    // Padding for days before the month starts
    for (let i = 0; i < startDayOfWeek; i++) {
      const date = new Date(this.year, this.month - 1, -startDayOfWeek + i + 1);
      calendarDays.push({
        date,
        dayOfMonth: date.getDate(),
        isCurrentMonth: false,
        isToday: false
      });
    }

    // Actual days
    for (const date of daysInMonth) {
      const dateKey = format(date, 'yyyy-MM-dd');
      calendarDays.push({
        data: daysDataMap.get(dateKey),
        date,
        dayOfMonth: date.getDate(),
        isCurrentMonth: true,
        isToday:
          date.getDate() === today.getDate() &&
          date.getMonth() === today.getMonth() &&
          date.getFullYear() === today.getFullYear()
      });
    }

    // Pad to complete the last week
    while (calendarDays.length % 7 !== 0) {
      const lastDate = calendarDays[calendarDays.length - 1].date;
      const date = new Date(
        lastDate.getFullYear(),
        lastDate.getMonth(),
        lastDate.getDate() + 1
      );
      calendarDays.push({
        date,
        dayOfMonth: date.getDate(),
        isCurrentMonth: false,
        isToday: false
      });
    }

    // Group into weeks
    this.calendarWeeks = [];
    for (let i = 0; i < calendarDays.length; i += 7) {
      this.calendarWeeks.push(calendarDays.slice(i, i + 7));
    }
  }
}
