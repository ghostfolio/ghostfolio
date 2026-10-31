import { UserService } from '@ghostfolio/client/services/user/user.service';
import { getAvailableDateRanges } from '@ghostfolio/common/date-range.helper';
import { User } from '@ghostfolio/common/interfaces';
import { DateRange, ToggleOption } from '@ghostfolio/common/types';
import { DataService } from '@ghostfolio/ui/services';
import { GfToggleComponent } from '@ghostfolio/ui/toggle';

import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  signal
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [GfToggleComponent],
  selector: 'gf-date-range-selector',
  styleUrls: ['./date-range-selector.component.scss'],
  templateUrl: './date-range-selector.component.html'
})
export class GfDateRangeSelectorComponent {
  protected readonly isLoading = signal(false);
  protected readonly user = signal<User | null>(null);

  // The date range is fixed to `max` in the zen mode
  protected readonly isVisible = computed(() => {
    return !!this.user() && this.user()?.settings?.viewMode !== 'ZEN';
  });

  protected readonly options = computed<ToggleOption<DateRange>[]>(() => {
    const dateRanges = getAvailableDateRanges({
      dateOfFirstActivity: this.user()?.dateOfFirstActivity
    });

    // Keep a range which is not part of the toggle, e.g. a past year selected
    // in the assistant, visible as selected option
    const selectedDateRange = this.user()?.settings?.dateRange;

    if (selectedDateRange && !dateRanges.includes(selectedDateRange)) {
      dateRanges.splice(dateRanges.length - 1, 0, selectedDateRange);
    }

    return dateRanges.map((value) => {
      return { value, label: this.getLabel(value) };
    });
  });

  private readonly dataService = inject(DataService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly userService = inject(UserService);

  public constructor() {
    this.userService.stateChanged
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((state) => {
        if (state?.user) {
          this.user.set(state.user);
        }
      });
  }

  protected onValueChange({ value }: { value: DateRange }) {
    this.isLoading.set(true);

    this.dataService
      .putUserSetting({ dateRange: value })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        complete: () => {
          this.userService
            .get(true)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
              complete: () => this.isLoading.set(false)
            });
        },
        error: () => this.isLoading.set(false)
      });
  }

  private getLabel(dateRange: DateRange) {
    switch (dateRange) {
      case '1d':
        return $localize`Today`;
      case 'wtd':
        return $localize`WTD`;
      case 'mtd':
        return $localize`MTD`;
      case 'ytd':
        return $localize`YTD`;
      case '1y':
        return $localize`1Y`;
      case '5y':
        return $localize`5Y`;
      case 'max':
        return $localize`Max`;
      default:
        // A past year, e.g. 2025
        return dateRange;
    }
  }
}
