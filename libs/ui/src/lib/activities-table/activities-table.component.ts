import { Activity } from '@ghostfolio/api/app/order/interfaces/activities.interface';
import { DEFAULT_PAGE_SIZE } from '@ghostfolio/common/config';
import { getDateFormatString, getLocale } from '@ghostfolio/common/helper';
import { UniqueAsset } from '@ghostfolio/common/interfaces';
import { OrderWithAccount } from '@ghostfolio/common/types';

import { SelectionModel } from '@angular/cdk/collections';
import {
  AfterViewInit,
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
import { MatSort, Sort, SortDirection } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { Router } from '@angular/router';
import { isUUID } from 'class-validator';
import { endOfToday, isAfter } from 'date-fns';
import { Subject, Subscription, takeUntil } from 'rxjs';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'gf-activities-table',
  styleUrls: ['./activities-table.component.scss'],
  templateUrl: './activities-table.component.html'
})
export class ActivitiesTableComponent
  implements AfterViewInit, OnChanges, OnDestroy, OnInit
{
  @Input() baseCurrency: string;
  @Input() dataSource: MatTableDataSource<Activity>;
  @Input() deviceType: string;
  @Input() hasPermissionToCreateActivity: boolean;
  @Input() hasPermissionToExportActivities: boolean;
  @Input() hasPermissionToOpenDetails = true;
  @Input() locale = getLocale();
  @Input() pageIndex: number;
  @Input() pageSize = DEFAULT_PAGE_SIZE;
  @Input() showActions = true;
  @Input() showCheckbox = false;
  @Input() showNameColumn = true;
  @Input() sortColumn: string;
  @Input() sortDirection: SortDirection;
  @Input() sortDisabled = false;
  @Input() totalItems = Number.MAX_SAFE_INTEGER;

  @Output() activityDeleted = new EventEmitter<string>();
  @Output() activityToClone = new EventEmitter<OrderWithAccount>();
  @Output() activityToUpdate = new EventEmitter<OrderWithAccount>();
  @Output() deleteAllActivities = new EventEmitter<void>();
  @Output() export = new EventEmitter<void>();
  @Output() exportDrafts = new EventEmitter<string[]>();
  @Output() import = new EventEmitter<void>();
  @Output() importDividends = new EventEmitter<UniqueAsset>();
  @Output() pageChanged = new EventEmitter<PageEvent>();
  @Output() selectedActivities = new EventEmitter<Activity[]>();
  @Output() sortChanged = new EventEmitter<Sort>();

  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;

  public defaultDateFormat: string;
  public displayedColumns = [];
  public endOfToday = endOfToday();
  public hasDrafts = false;
  public hasErrors = false;
  public isAfter = isAfter;
  public isLoading = true;
  public isUUID = isUUID;
  public routeQueryParams: Subscription;
  public selectedRows = new SelectionModel<Activity>(true, []);

  private unsubscribeSubject = new Subject<void>();

  public constructor(private router: Router) {}

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

  public ngAfterViewInit() {
    this.sort.sortChange.subscribe((value: Sort) => {
      this.sortChanged.emit(value);
    });
  }

  public areAllRowsSelected() {
    const numSelectedRows = this.selectedRows.selected.length;
    const numTotalRows = this.dataSource.data.length;
    return numSelectedRows === numTotalRows;
  }

  public ngOnChanges() {
    this.defaultDateFormat = getDateFormatString(this.locale);

    this.displayedColumns = [
      'select',
      'importStatus',
      'icon',
      'nameWithSymbol',
      'type',
      'date',
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

    if (!this.showCheckbox) {
      this.displayedColumns = this.displayedColumns.filter((column) => {
        return column !== 'importStatus' && column !== 'select';
      });
    }

    if (!this.showNameColumn) {
      this.displayedColumns = this.displayedColumns.filter((column) => {
        return column !== 'nameWithSymbol';
      });
    }

    if (this.dataSource) {
      this.isLoading = false;
    }
  }

  public onChangePage(page: PageEvent) {
    this.pageChanged.emit(page);
  }

  public onClickActivity(activity: Activity) {
    if (this.showCheckbox) {
      if (!activity.error) {
        this.selectedRows.toggle(activity);
      }
    } else if (
      this.hasPermissionToOpenDetails &&
      !activity.isDraft &&
      activity.type !== 'FEE' &&
      activity.type !== 'INTEREST' &&
      activity.type !== 'ITEM' &&
      activity.type !== 'LIABILITY'
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
    this.export.emit();
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

  public onOpenPositionDialog({ dataSource, symbol }: UniqueAsset) {
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
}
