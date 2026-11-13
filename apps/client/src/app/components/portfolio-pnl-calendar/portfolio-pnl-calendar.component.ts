import type { HistoricalDataItem } from '@ghostfolio/common/interfaces';
import { DataService } from '@ghostfolio/ui/services';

import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  signal
} from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { catchError, of, switchMap } from 'rxjs';

import {
  addCalendarDays,
  aggregatePnlCalendarDays,
  aggregatePnlCalendarWeekInMonth,
  getLocalTodayKey,
  getMonday,
  getPnlCalendarDays,
  type PnlCalendarPeriod
} from './portfolio-pnl-calendar.helper';

type CalendarView = 'daily' | 'weekly' | 'monthly' | 'last30';
type CalendarUnit = 'currency' | 'percentage';

interface CalendarCell extends PnlCalendarPeriod {
  label: string;
  outsideMonth?: boolean;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatButtonModule, MatCardModule],
  selector: 'gf-portfolio-pnl-calendar',
  styleUrls: ['./portfolio-pnl-calendar.component.scss'],
  templateUrl: './portfolio-pnl-calendar.component.html'
})
export class GfPortfolioPnlCalendarComponent {
  public readonly chart = input<HistoricalDataItem[] | null>(null);
  public readonly currency = input.required<string>();
  public readonly locale = input.required<string>();
  public readonly showDetails = input(false);

  protected readonly view = signal<CalendarView>('daily');
  protected readonly unit = signal<CalendarUnit>('currency');
  protected readonly referenceDate = signal(new Date());

  protected readonly effectiveUnit = computed<CalendarUnit>(() => {
    return this.showDetails() ? this.unit() : 'percentage';
  });

  protected readonly days = computed(() => {
    return getPnlCalendarDays(this.chart() ?? []);
  });
  protected readonly firstHistoricalDate = computed(() => {
    return this.chart()
      ?.map(({ date }) => date)
      .filter((date) => /^\d{4}-\d{2}-\d{2}$/.test(date))
      .sort()[0];
  });
  protected readonly weekdays = computed(() => {
    const formatter = new Intl.DateTimeFormat(this.locale(), {
      weekday: 'short',
      timeZone: 'UTC'
    });

    return Array.from({ length: 7 }, (_, index) => {
      return formatter.format(new Date(Date.UTC(2024, 0, 1 + index)));
    });
  });

  protected readonly title = computed(() => {
    const referenceDate = this.referenceDate();

    if (this.view() === 'last30') {
      const endDate = this.toDateKey(
        referenceDate.getFullYear(),
        referenceDate.getMonth(),
        referenceDate.getDate()
      );
      return `${this.formatShortDate(addCalendarDays(endDate, -29))} – ${this.formatShortDate(endDate)}`;
    }

    return new Intl.DateTimeFormat(this.locale(), {
      month: this.view() === 'monthly' ? undefined : 'long',
      year: 'numeric'
    }).format(referenceDate);
  });

  protected readonly cells = computed<CalendarCell[]>(() => {
    const referenceDate = this.referenceDate();
    const year = referenceDate.getFullYear();
    const month = referenceDate.getMonth();
    const days = this.days();

    if (this.view() === 'last30') {
      const lastDate = this.toDateKey(year, month, referenceDate.getDate());
      const firstDate = addCalendarDays(lastDate, -29);
      const rollingFirstMonday = getMonday(firstDate);
      const rollingLastSunday = addCalendarDays(getMonday(lastDate), 6);
      const numberOfDays =
        Math.round(
          (Date.parse(`${rollingLastSunday}T00:00:00Z`) -
            Date.parse(`${rollingFirstMonday}T00:00:00Z`)) /
            86400000
        ) + 1;

      return Array.from({ length: numberOfDays }, (_, index) => {
        const startDate = addCalendarDays(rollingFirstMonday, index);
        return {
          ...aggregatePnlCalendarDays({ days, endDate: startDate, startDate }),
          label: `${Number(startDate.slice(8, 10))}`,
          outsideMonth: startDate < firstDate || startDate > lastDate
        };
      });
    }

    if (this.view() === 'monthly') {
      return Array.from({ length: 12 }, (_, index) => {
        const startDate = this.toDateKey(year, index, 1);
        const endDate = addCalendarDays(this.toDateKey(year, index + 1, 1), -1);

        return {
          ...aggregatePnlCalendarDays({
            days,
            endDate,
            startDate,
            requireComplete: true,
            firstHistoricalDate: this.firstHistoricalDate()
          }),
          label: new Intl.DateTimeFormat(this.locale(), {
            month: 'short',
            timeZone: 'UTC'
          }).format(new Date(Date.UTC(year, index, 1)))
        };
      });
    }

    const monthStart = this.toDateKey(year, month, 1);
    const monthEnd = addCalendarDays(this.toDateKey(year, month + 1, 1), -1);
    const firstMonday = getMonday(monthStart);
    const lastSunday = addCalendarDays(getMonday(monthEnd), 6);
    const weekCount =
      ((Date.parse(`${lastSunday}T00:00:00Z`) -
        Date.parse(`${firstMonday}T00:00:00Z`)) /
        86400000 +
        1) /
      7;

    if (this.view() === 'weekly') {
      return Array.from({ length: weekCount }, (_, index) => {
        const startDate = addCalendarDays(firstMonday, index * 7);
        const endDate = addCalendarDays(startDate, 6);

        return {
          ...aggregatePnlCalendarWeekInMonth({
            days,
            monthEnd,
            monthStart,
            weekStart: startDate,
            requireComplete: true,
            firstHistoricalDate: this.firstHistoricalDate()
          }),
          label: `${this.formatShortDate(startDate)} – ${this.formatShortDate(endDate)}`
        };
      });
    }

    return Array.from({ length: weekCount * 7 }, (_, index) => {
      const startDate = addCalendarDays(firstMonday, index);

      return {
        ...aggregatePnlCalendarDays({
          days,
          endDate: startDate,
          startDate
        }),
        label: `${Number(startDate.slice(8, 10))}`,
        outsideMonth: startDate < monthStart || startDate > monthEnd
      };
    });
  });

  protected readonly periodTotal = computed(() => {
    const date = this.referenceDate();
    const year = date.getFullYear();
    const month = date.getMonth();
    const isYear = this.view() === 'monthly';
    const isRolling = this.view() === 'last30';
    const endDate = isRolling
      ? this.toDateKey(year, month, date.getDate())
      : addCalendarDays(this.toDateKey(year, isYear ? 12 : month + 1, 1), -1);
    const startDate = isRolling
      ? addCalendarDays(endDate, -29)
      : this.toDateKey(year, isYear ? 0 : month, 1);
    const period = aggregatePnlCalendarDays({
      days: this.days(),
      endDate,
      startDate,
      requireComplete: true,
      firstHistoricalDate: this.firstHistoricalDate()
    });

    return this.effectiveUnit() === 'currency'
      ? period.amount
      : this.getPeriodPercentage(startDate, endDate);
  });

  private readonly dataService = inject(DataService);
  private readonly percentages = signal<Map<string, number> | null>(null);
  private readonly percentageRequest = computed(() => {
    if (
      this.chart() === null ||
      this.effectiveUnit() !== 'percentage' ||
      this.days().length === 0
    ) {
      return null;
    }
    const date = this.referenceDate();
    const year = date.getFullYear();
    const month = date.getMonth();
    const rolling = this.view() === 'last30';
    const annual = this.view() === 'monthly';
    const endDate = rolling
      ? this.toDateKey(year, month, date.getDate())
      : addCalendarDays(this.toDateKey(year, annual ? 12 : month + 1, 1), -1);
    const startDate = rolling
      ? addCalendarDays(endDate, -29)
      : this.toDateKey(year, annual ? 0 : month, 1);
    const today = getLocalTodayKey();
    const periods = this.cells()
      .filter(
        ({ outsideMonth, startDate: cellStartDate }) =>
          !outsideMonth && cellStartDate <= today
      )
      .map(({ startDate: cellStartDate, endDate: cellEndDate }) => ({
        startDate: cellStartDate,
        endDate: cellEndDate > today ? today : cellEndDate
      }));
    if (startDate <= today) {
      periods.push({ startDate, endDate: endDate > today ? today : endDate });
    }
    return periods;
  });

  public constructor() {
    toObservable(this.percentageRequest)
      .pipe(
        switchMap((periods) => {
          this.percentages.set(null);
          return periods?.length
            ? this.dataService
                .fetchPortfolioCalendarPercentages(periods)
                .pipe(catchError(() => of([])))
            : of([]);
        }),
        takeUntilDestroyed()
      )
      .subscribe((results) => {
        this.percentages.set(
          new Map(
            results.flatMap(({ startDate, endDate, percentage }) =>
              typeof percentage === 'number' && Number.isFinite(percentage)
                ? [[`${startDate}|${endDate}`, percentage] as const]
                : []
            )
          )
        );
      });
  }

  protected setView(view: CalendarView) {
    if (view === 'last30') {
      // Last 30 days always means the current rolling window, not a
      // historical window inherited from monthly navigation.
      this.referenceDate.set(new Date());
    }
    this.view.set(view);
  }

  protected setUnit(unit: CalendarUnit) {
    this.unit.set(unit);
  }

  protected navigate(direction: -1 | 1) {
    if (this.view() === 'last30') {
      return;
    }

    const date = this.referenceDate();

    this.referenceDate.set(
      new Date(
        date.getFullYear(),
        date.getMonth() + (this.view() === 'monthly' ? 12 : 1) * direction,
        1
      )
    );
  }

  protected getValue(cell: PnlCalendarPeriod): number | undefined {
    return this.effectiveUnit() === 'currency'
      ? cell.amount
      : this.getPeriodPercentage(cell.startDate, cell.endDate);
  }

  protected formatValue(value: number | undefined): string {
    if (value === undefined) {
      return '—';
    }

    return (
      new Intl.NumberFormat(this.locale(), {
        ...(this.effectiveUnit() === 'currency'
          ? { currency: this.currency(), style: 'currency' as const }
          : { style: 'decimal' as const }),
        maximumFractionDigits: 2,
        minimumFractionDigits: 2,
        signDisplay: 'exceptZero'
      }).format(value) + (this.effectiveUnit() === 'percentage' ? ' %' : '')
    );
  }

  private getPeriodPercentage(
    startDate: string,
    endDate: string
  ): number | undefined {
    const today = getLocalTodayKey();
    if (startDate > today) {
      return undefined;
    }
    return this.percentages()?.get(
      `${startDate}|${endDate > today ? today : endDate}`
    );
  }

  private formatShortDate(date: string): string {
    return new Intl.DateTimeFormat(this.locale(), {
      day: 'numeric',
      month: 'short',
      timeZone: 'UTC'
    }).format(new Date(`${date}T00:00:00Z`));
  }

  private toDateKey(year: number, month: number, day: number): string {
    return new Date(Date.UTC(year, month, day)).toISOString().slice(0, 10);
  }
}
