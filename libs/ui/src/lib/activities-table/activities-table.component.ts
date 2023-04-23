import { SelectionModel } from '@angular/cdk/collections';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  ViewChild
} from '@angular/core';
import { MatPaginator, PageEvent } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { Router } from '@angular/router';
import { Activity } from '@ghostfolio/api/app/order/interfaces/activities.interface';
import { DEFAULT_PAGE_SIZE } from '@ghostfolio/common/config';
import { getDateFormatString } from '@ghostfolio/common/helper';
import { Filter, UniqueAsset } from '@ghostfolio/common/interfaces';
import { OrderWithAccount } from '@ghostfolio/common/types';
import Big from 'big.js';
import { isUUID } from 'class-validator';
import { endOfToday, format, isAfter } from 'date-fns';
import { get, isNumber } from 'lodash';
import { Subject, Subscription, distinctUntilChanged, takeUntil } from 'rxjs';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'gf-activities-table',
  styleUrls: ['./activities-table.component.scss'],
  templateUrl: './activities-table.component.html'
})
export class ActivitiesTableComponent implements OnChanges, OnDestroy, OnInit {
  @Input() activities: Activity[];
  @Input() baseCurrency: string;
  @Input() deviceType: string;
  @Input() hasPermissionToCreateActivity: boolean;
  @Input() hasPermissionToExportActivities: boolean;
  @Input() hasPermissionToFilter = true;
  @Input() hasPermissionToOpenDetails = true;
  @Input() locale: string;
  @Input() pageSize = DEFAULT_PAGE_SIZE;
  @Input() showActions = true;
  @Input() showCheckbox = false;
  @Input() showFooter = true;
  @Input() showNameColumn = true;

  @Output() activityDeleted = new EventEmitter<string>();
  @Output() activityToClone = new EventEmitter<OrderWithAccount>();
  @Output() activityToUpdate = new EventEmitter<OrderWithAccount>();
  @Output() deleteAllActivities = new EventEmitter<void>();
  @Output() export = new EventEmitter<string[]>();
  @Output() exportDrafts = new EventEmitter<string[]>();
  @Output() import = new EventEmitter<void>();
  @Output() importDividends = new EventEmitter<UniqueAsset>();
  @Output() selectedActivities = new EventEmitter<Activity[]>();

  @ViewChild(MatPaginator) paginator: MatPaginator;
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
  public pageIndex = 0;
  public placeholder = '';
  public routeQueryParams: Subscription;
  public searchKeywords: string[] = [];
  public selectedRows = new SelectionModel<Activity>(true, []);
  public totalFees: number;
  public totalValue: number;

  private readonly SEARCH_STRING_SEPARATOR = ',';
  private unsubscribeSubject = new Subject<void>();

  public constructor(private router: Router) {
    this.filters$
      .pipe(distinctUntilChanged(), takeUntil(this.unsubscribeSubject))
      .subscribe((filters) => {
        this.updateFilters(filters);
      });
  }

  public ngOnInit() {
    if (this.showCheckbox) {
      this.toggleAllRows();
      this.selectedRows.changed
        .pipe(takeUntil(this.unsubscribeSubject))
        .subscribe((selectedRows) => {
          this.selectedActivities.emit(selectedRows.source.selected);
        });
    }
  }

  public areAllRowsSelected() {
    const numSelectedRows = this.selectedRows.selected.length;
    const numTotalRows = this.dataSource.data.length;
    return numSelectedRows === numTotalRows;
  }

  public ngOnChanges() {
    this.displayedColumns = [
      'select',
      'count',
      'date',
      'type',
      'nameWithSymbol',
      'quantity',
      'unitPrice',
      'fee',
      'value',
      'currency',
      'valueInBaseCurrency',
      'account',
      'comment',
      'actions'
    ];

    if (this.showCheckbox) {
      this.displayedColumns = this.displayedColumns.filter((column) => {
        return column !== 'count';
      });
    } else {
      this.displayedColumns = this.displayedColumns.filter((column) => {
        return column !== 'select';
      });
    }

    if (!this.showNameColumn) {
      this.displayedColumns = this.displayedColumns.filter((column) => {
        return column !== 'nameWithSymbol';
      });
    }

    this.defaultDateFormat = getDateFormatString(this.locale);

    if (this.activities) {
      this.allFilters = this.getSearchableFieldValues(this.activities);

      this.dataSource = new MatTableDataSource(this.activities);
      this.dataSource.filterPredicate = (data, filter) => {
        const filterableLabels = this.getFilterableValues(data).map(
          ({ label }) => {
            return label.toLowerCase();
          }
        );

        let includes = true;
        for (const singleFilter of filter.split(this.SEARCH_STRING_SEPARATOR)) {
          includes =
            includes &&
            filterableLabels.includes(singleFilter.trim().toLowerCase());
        }
        return includes;
      };
      this.dataSource.paginator = this.paginator;
      this.dataSource.sort = this.sort;
      this.dataSource.sortingDataAccessor = get;

      this.updateFilters();
    }
  }

  public onChangePage(page: PageEvent) {
    this.pageIndex = page.pageIndex;

    this.totalFees = this.getTotalFees();
    this.totalValue = this.getTotalValue();
  }

  public onClickActivity(activity: Activity) {
    if (this.showCheckbox) {
      this.selectedRows.toggle(activity);
    } else if (
      this.hasPermissionToOpenDetails &&
      !activity.isDraft &&
      activity.type !== 'ITEM'
    ) {
      this.onOpenPositionDialog({
        dataSource: activity.SymbolProfile.dataSource,
        symbol: activity.SymbolProfile.symbol
      });
    }
  }

  public onCloneActivity(aActivity: OrderWithAccount) {
    this.activityToClone.emit(aActivity);
  }

  public onDeleteActivity(aId: string) {
    const confirmation = confirm(
      $localize`Do you really want to delete this activity?`
    );

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

  public onDeleteAllActivities() {
    this.deleteAllActivities.emit();
  }

  public onImport() {
    this.import.emit();
  }

  public onImportDividends() {
    this.importDividends.emit();
  }

  public onOpenComment(aComment: string) {
    alert(aComment);
  }

  public onOpenPositionDialog({ dataSource, symbol }: UniqueAsset): void {
    this.router.navigate([], {
      queryParams: { dataSource, symbol, positionDetailDialog: true }
    });
  }

  public onUpdateActivity(aActivity: OrderWithAccount) {
    this.activityToUpdate.emit(aActivity);
  }

  public toggleAllRows() {
    this.areAllRowsSelected()
      ? this.selectedRows.clear()
      : this.dataSource.data.forEach((row) => this.selectedRows.select(row));

    this.selectedActivities.emit(this.selectedRows.selected);
  }

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }

  private getFilterableValues(
    activity: OrderWithAccount,
    fieldValueMap: { [id: string]: Filter } = {}
  ): Filter[] {
    if (activity.Account?.id) {
      fieldValueMap[activity.Account.id] = {
        id: activity.Account.id,
        label: activity.Account.name,
        type: 'ACCOUNT'
      };
    }

    if (activity.SymbolProfile?.currency) {
      fieldValueMap[activity.SymbolProfile.currency] = {
        id: activity.SymbolProfile.currency,
        label: activity.SymbolProfile.currency,
        type: 'TAG'
      };
    }

    if (
      activity.SymbolProfile?.symbol &&
      !isUUID(activity.SymbolProfile.symbol)
    ) {
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

    fieldValueMap[format(new Date(activity.date), 'yyyy')] = {
      id: format(new Date(activity.date), 'yyyy'),
      label: format(new Date(activity.date), 'yyyy'),
      type: 'TAG'
    };

    return Object.values(fieldValueMap);
  }

  private getPaginatedData() {
    if (this.dataSource.data.length > this.pageSize) {
      const sortedData = this.dataSource.sortData(
        this.dataSource.filteredData,
        this.dataSource.sort
      );

      return sortedData.slice(
        this.pageIndex * this.pageSize,
        (this.pageIndex + 1) * this.pageSize
      );
    }
    return this.dataSource.filteredData;
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
    const paginatedData = this.getPaginatedData();
    for (const activity of paginatedData) {
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
    const paginatedData = this.getPaginatedData();
    for (const activity of paginatedData) {
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
      .join(this.SEARCH_STRING_SEPARATOR);

    const lowercaseSearchKeywords = filters.map((filter) => {
      return filter.label.trim().toLowerCase();
    });

    this.placeholder =
      lowercaseSearchKeywords.length <= 0
        ? $localize`Filter by account, currency, symbol or type...`
        : '';

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
