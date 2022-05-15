import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  ViewChild
} from '@angular/core';
import { FormControl } from '@angular/forms';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { Router } from '@angular/router';
import { Activity } from '@ghostfolio/api/app/order/interfaces/activities.interface';
import { getDateFormatString } from '@ghostfolio/common/helper';
import { Filter, UniqueAsset } from '@ghostfolio/common/interfaces';
import { OrderWithAccount } from '@ghostfolio/common/types';
import Big from 'big.js';
import { isUUID } from 'class-validator';
import { endOfToday, format, isAfter } from 'date-fns';
import { isNumber } from 'lodash';
import { Subject, Subscription, distinctUntilChanged, takeUntil } from 'rxjs';

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
  @Output() exportDrafts = new EventEmitter<string[]>();
  @Output() import = new EventEmitter<void>();

  @ViewChild(MatSort) sort: MatSort;

  public allFilters: Filter[];
  public dataSource: MatTableDataSource<Activity> = new MatTableDataSource();
  public defaultDateFormat: string;
  public displayedColumns = [];
  public endOfToday = endOfToday();
  public filters$ = new Subject<Filter[]>();
  public hasDrafts = false;
  public isAfter = isAfter;
  public isLoading = true;
  public isUUID = isUUID;
  public placeholder = '';
  public routeQueryParams: Subscription;
  public searchControl = new FormControl();
  public searchKeywords: string[] = [];
  public totalFees: number;
  public totalValue: number;

  private unsubscribeSubject = new Subject<void>();

  public constructor(private router: Router) {
    this.filters$
      .pipe(distinctUntilChanged(), takeUntil(this.unsubscribeSubject))
      .subscribe((filters) => {
        this.updateFilters(filters);
      });
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

    this.defaultDateFormat = getDateFormatString(this.locale);

    if (this.activities) {
      this.allFilters = this.getSearchableFieldValues(this.activities);

      this.dataSource = new MatTableDataSource(this.activities);
      this.dataSource.filterPredicate = (data, filter) => {
        const dataString = this.getFilterableValues(data)
          .map((currentFilter) => {
            return currentFilter.label;
          })
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

      this.updateFilters();
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

  public onExportDraft(aActivityId: string) {
    this.exportDrafts.emit([aActivityId]);
  }

  public onExportDrafts() {
    this.exportDrafts.emit(
      this.dataSource.filteredData
        .filter((activity) => {
          return activity.isDraft;
        })
        .map((activity) => {
          return activity.id;
        })
    );
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

  private getFilterableValues(
    activity: OrderWithAccount,
    fieldValueMap: { [id: string]: Filter } = {}
  ): Filter[] {
    fieldValueMap[activity.Account?.id] = {
      id: activity.Account?.id,
      label: activity.Account?.name,
      type: 'ACCOUNT'
    };

    fieldValueMap[activity.SymbolProfile.currency] = {
      id: activity.SymbolProfile.currency,
      label: activity.SymbolProfile.currency,
      type: 'TAG'
    };

    if (!isUUID(activity.SymbolProfile.symbol)) {
      fieldValueMap[activity.SymbolProfile.symbol] = {
        id: activity.SymbolProfile.symbol,
        label: activity.SymbolProfile.symbol,
        type: 'SYMBOL'
      };
    }

    fieldValueMap[activity.type] = {
      id: activity.type,
      label: activity.type,
      type: 'TAG'
    };

    fieldValueMap[format(activity.date, 'yyyy')] = {
      id: format(activity.date, 'yyyy'),
      label: format(activity.date, 'yyyy'),
      type: 'TAG'
    };

    return Object.values(fieldValueMap);
  }

  private getSearchableFieldValues(activities: OrderWithAccount[]): Filter[] {
    const fieldValueMap: { [id: string]: Filter } = {};

    for (const activity of activities) {
      this.getFilterableValues(activity, fieldValueMap);
    }

    return Object.values(fieldValueMap);
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
          return null;
        }
      } else {
        return null;
      }
    }

    return totalValue.toNumber();
  }

  private updateFilters(filters: Filter[] = []) {
    this.isLoading = true;

    this.dataSource.filter = filters
      .map((filter) => {
        return filter.label;
      })
      .join(SEARCH_STRING_SEPARATOR);

    const lowercaseSearchKeywords = filters.map((filter) => {
      return filter.label.trim().toLowerCase();
    });

    this.placeholder =
      lowercaseSearchKeywords.length <= 0 ? SEARCH_PLACEHOLDER : '';

    this.searchKeywords = filters.map((filter) => {
      return filter.label;
    });

    this.hasDrafts = this.dataSource.filteredData.some((activity) => {
      return activity.isDraft === true;
    });
    this.totalFees = this.getTotalFees();
    this.totalValue = this.getTotalValue();

    this.isLoading = false;
  }
}
