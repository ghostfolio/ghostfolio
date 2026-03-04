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
  Output,
  SimpleChanges
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
  isToday,
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
  public weekDays: string[] = [];

  public get monthLabel(): string {
    return new Intl.DateTimeFormat(this.locale ?? 'en-US', {
      month: 'long',
      year: 'numeric'
    }).format(new Date(this.year, this.month - 1));
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

  public ngOnChanges(changes: SimpleChanges) {
    if (changes['days'] || changes['month'] || changes['year']) {
      this.buildCalendar();
    }

    if (changes['locale']) {
      this.buildWeekDays();
    }
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
    if (value === undefined || value === null) {
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

  private buildWeekDays() {
    // Generate locale-aware weekday names (Sunday-start)
    const baseDate = new Date(2024, 0, 7); // A known Sunday

    this.weekDays = Array.from({ length: 7 }, (_, i) => {
      const day = new Date(baseDate);
      day.setDate(baseDate.getDate() + i);

      return new Intl.DateTimeFormat(this.locale ?? 'en-US', {
        weekday: 'short'
      }).format(day);
    });
  }

  private buildCalendar() {
    if (!this.weekDays.length) {
      this.buildWeekDays();
    }

    const currentDate = new Date(this.year, this.month - 1);
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);

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
        isToday: isToday(date)
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
