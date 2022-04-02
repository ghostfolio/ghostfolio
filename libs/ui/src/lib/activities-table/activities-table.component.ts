import { COMMA, ENTER } from '@angular/cdk/keycodes';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  ViewChild
} from '@angular/core';
import { FormControl } from '@angular/forms';
import {
  MatAutocomplete,
  MatAutocompleteSelectedEvent
} from '@angular/material/autocomplete';
import { MatChipInputEvent } from '@angular/material/chips';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { Router } from '@angular/router';
import { Activity } from '@ghostfolio/api/app/order/interfaces/activities.interface';
import { DEFAULT_DATE_FORMAT } from '@ghostfolio/common/config';
import { UniqueAsset } from '@ghostfolio/common/interfaces';
import { OrderWithAccount } from '@ghostfolio/common/types';
import Big from 'big.js';
import { isUUID } from 'class-validator';
import { endOfToday, format, isAfter } from 'date-fns';
import { isNumber } from 'lodash';
import { BehaviorSubject, Observable, Subject, Subscription } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

const SEARCH_PLACEHOLDER = 'Search for account, currency, symbol or type...';
const SEARCH_STRING_SEPARATOR = ',';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'gf-activities-table',
  styleUrls: ['./activities-table.component.scss'],
  templateUrl: './activities-table.component.html'
})
export class ActivitiesTableComponent implements OnChanges, OnDestroy {
  @Input() activities: Activity[];
  @Input() baseCurrency: string;
  @Input() deviceType: string;
  @Input() hasPermissionToCreateActivity: boolean;
  @Input() hasPermissionToExportActivities: boolean;
  @Input() hasPermissionToFilter = true;
  @Input() hasPermissionToImportActivities: boolean;
  @Input() hasPermissionToOpenDetails = true;
  @Input() locale: string;
  @Input() showActions: boolean;
  @Input() showSymbolColumn = true;

  @Output() activityDeleted = new EventEmitter<string>();
  @Output() activityToClone = new EventEmitter<OrderWithAccount>();
  @Output() activityToUpdate = new EventEmitter<OrderWithAccount>();
  @Output() export = new EventEmitter<string[]>();
  @Output() import = new EventEmitter<void>();

  @ViewChild('autocomplete') matAutocomplete: MatAutocomplete;
  @ViewChild('searchInput') searchInput: ElementRef<HTMLInputElement>;
  @ViewChild(MatSort) sort: MatSort;

  public dataSource: MatTableDataSource<Activity> = new MatTableDataSource();
  public defaultDateFormat = DEFAULT_DATE_FORMAT;
  public displayedColumns = [];
  public endOfToday = endOfToday();
  public filters$: Subject<string[]> = new BehaviorSubject([]);
  public filters: Observable<string[]> = this.filters$.asObservable();
  public isAfter = isAfter;
  public isLoading = true;
  public isUUID = isUUID;
  public placeholder = '';
  public routeQueryParams: Subscription;
  public searchControl = new FormControl();
  public searchKeywords: string[] = [];
  public separatorKeysCodes: number[] = [ENTER, COMMA];
  public totalFees: number;
  public totalValue: number;

  private allFilters: string[];
  private unsubscribeSubject = new Subject<void>();

  public constructor(private router: Router) {
    this.searchControl.valueChanges
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((keyword) => {
        if (keyword) {
          const filterValue = keyword.toLowerCase();
          this.filters$.next(
            this.allFilters.filter(
              (filter) => filter.toLowerCase().indexOf(filterValue) === 0
            )
          );
        } else {
          this.filters$.next(this.allFilters);
        }
      });
  }

  public addKeyword({ input, value }: MatChipInputEvent): void {
    if (value?.trim()) {
      this.searchKeywords.push(value.trim());
      this.updateFilter();
    }

    // Reset the input value
    if (input) {
      input.value = '';
    }

    this.searchControl.setValue(null);
  }

  public removeKeyword(keyword: string): void {
    const index = this.searchKeywords.indexOf(keyword);

    if (index >= 0) {
      this.searchKeywords.splice(index, 1);
      this.updateFilter();
    }
  }

  public keywordSelected(event: MatAutocompleteSelectedEvent): void {
    this.searchKeywords.push(event.option.viewValue);
    this.updateFilter();
    this.searchInput.nativeElement.value = '';
    this.searchControl.setValue(null);
  }

  public ngOnChanges() {
    this.displayedColumns = [
      'count',
      'date',
      'type',
      'symbol',
      'quantity',
      'unitPrice',
      'fee',
      'value',
      'currency',
      'valueInBaseCurrency',
      'account',
      'actions'
    ];

    if (!this.showSymbolColumn) {
      this.displayedColumns = this.displayedColumns.filter((column) => {
        return column !== 'symbol';
      });
    }

    this.isLoading = true;

    if (this.activities) {
      this.dataSource = new MatTableDataSource(this.activities);
      this.dataSource.filterPredicate = (data, filter) => {
        const dataString = this.getFilterableValues(data)
          .join(' ')
          .toLowerCase();
        let contains = true;
        for (const singleFilter of filter.split(SEARCH_STRING_SEPARATOR)) {
          contains =
            contains && dataString.includes(singleFilter.trim().toLowerCase());
        }
        return contains;
      };
      this.dataSource.sort = this.sort;
      this.updateFilter();
      this.isLoading = false;
    }
  }

  public onCloneActivity(aActivity: OrderWithAccount) {
    this.activityToClone.emit(aActivity);
  }

  public onDeleteActivity(aId: string) {
    const confirmation = confirm('Do you really want to delete this activity?');

    if (confirmation) {
      this.activityDeleted.emit(aId);
    }
  }

  public onExport() {
    if (this.searchKeywords.length > 0) {
      this.export.emit(
        this.dataSource.filteredData.map((activity) => {
          return activity.id;
        })
      );
    } else {
      this.export.emit();
    }
  }

  public onImport() {
    this.import.emit();
  }

  public onOpenPositionDialog({ dataSource, symbol }: UniqueAsset): void {
    this.router.navigate([], {
      queryParams: { dataSource, symbol, positionDetailDialog: true }
    });
  }

  public onUpdateActivity(aActivity: OrderWithAccount) {
    this.activityToUpdate.emit(aActivity);
  }

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }

  private updateFilter() {
    this.dataSource.filter = this.searchKeywords.join(SEARCH_STRING_SEPARATOR);
    const lowercaseSearchKeywords = this.searchKeywords.map((keyword) =>
      keyword.trim().toLowerCase()
    );

    this.placeholder =
      lowercaseSearchKeywords.length <= 0 ? SEARCH_PLACEHOLDER : '';

    this.allFilters = this.getSearchableFieldValues(this.activities).filter(
      (item) => {
        return !lowercaseSearchKeywords.includes(item.trim().toLowerCase());
      }
    );

    this.filters$.next(this.allFilters);

    this.totalFees = this.getTotalFees();
    this.totalValue = this.getTotalValue();
  }

  private getSearchableFieldValues(activities: OrderWithAccount[]): string[] {
    const fieldValues = new Set<string>();

    for (const activity of activities) {
      this.getFilterableValues(activity, fieldValues);
    }

    return [...fieldValues]
      .filter((item) => {
        return item !== undefined;
      })
      .sort((a, b) => {
        const aFirstChar = a.charAt(0);
        const bFirstChar = b.charAt(0);
        const isANumber = aFirstChar >= '0' && aFirstChar <= '9';
        const isBNumber = bFirstChar >= '0' && bFirstChar <= '9';

        // Sort priority: text, followed by numbers
        if (isANumber && !isBNumber) {
          return 1;
        } else if (!isANumber && isBNumber) {
          return -1;
        } else {
          return a.toLowerCase() < b.toLowerCase() ? -1 : 1;
        }
      });
  }

  private getFilterableValues(
    activity: OrderWithAccount,
    fieldValues: Set<string> = new Set<string>()
  ): string[] {
    fieldValues.add(activity.Account?.name);
    fieldValues.add(activity.Account?.Platform?.name);
    fieldValues.add(activity.SymbolProfile.currency);

    if (!isUUID(activity.SymbolProfile.symbol)) {
      fieldValues.add(activity.SymbolProfile.symbol);
    }

    fieldValues.add(activity.type);
    fieldValues.add(format(activity.date, 'yyyy'));

    return [...fieldValues].filter((item) => {
      return item !== undefined;
    });
  }

  private getTotalFees() {
    let totalFees = new Big(0);

    for (const activity of this.dataSource.filteredData) {
      if (isNumber(activity.feeInBaseCurrency)) {
        totalFees = totalFees.plus(activity.feeInBaseCurrency);
      } else {
        return null;
      }
    }

    return totalFees.toNumber();
  }

  private getTotalValue() {
    let totalValue = new Big(0);

    for (const activity of this.dataSource.filteredData) {
      if (isNumber(activity.valueInBaseCurrency)) {
        if (activity.type === 'BUY' || activity.type === 'ITEM') {
          totalValue = totalValue.plus(activity.valueInBaseCurrency);
        } else if (activity.type === 'SELL') {
          totalValue = totalValue.minus(activity.valueInBaseCurrency);
        }
      } else {
        return null;
      }
    }

    return totalValue.toNumber();
  }
}
