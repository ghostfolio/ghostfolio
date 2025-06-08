import { Activity } from '@ghostfolio/api/app/order/interfaces/activities.interface';
import { ConfirmationDialogType } from '@ghostfolio/client/core/notification/confirmation-dialog/confirmation-dialog.type';
import { NotificationService } from '@ghostfolio/client/core/notification/notification.service';
import { GfSymbolModule } from '@ghostfolio/client/pipes/symbol/symbol.module';
import { DEFAULT_PAGE_SIZE } from '@ghostfolio/common/config';
import { getDateFormatString, getLocale } from '@ghostfolio/common/helper';
import { AssetProfileIdentifier } from '@ghostfolio/common/interfaces';
import { OrderWithAccount } from '@ghostfolio/common/types';
import { GfActivityTypeComponent } from '@ghostfolio/ui/activity-type';
import { GfAssetProfileIconComponent } from '@ghostfolio/ui/asset-profile-icon';
import { GfNoTransactionsInfoComponent } from '@ghostfolio/ui/no-transactions-info';
import { GfValueComponent } from '@ghostfolio/ui/value';

import { SelectionModel } from '@angular/cdk/collections';
import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  CUSTOM_ELEMENTS_SCHEMA,
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
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatMenuModule } from '@angular/material/menu';
import {
  MatPaginator,
  MatPaginatorModule,
  PageEvent
} from '@angular/material/paginator';
import {
  MatSort,
  MatSortModule,
  Sort,
  SortDirection
} from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { isUUID } from 'class-validator';
import { endOfToday, isAfter } from 'date-fns';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';
import { Subject, Subscription, takeUntil } from 'rxjs';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    GfActivityTypeComponent,
    GfAssetProfileIconComponent,
    GfNoTransactionsInfoComponent,
    GfSymbolModule,
    GfValueComponent,
    MatButtonModule,
    MatCheckboxModule,
    MatMenuModule,
    MatPaginatorModule,
    MatSortModule,
    MatTableModule,
    MatTooltipModule,
    NgxSkeletonLoaderModule
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  selector: 'gf-activities-table',
  styleUrls: ['./activities-table.component.scss'],
  templateUrl: './activities-table.component.html'
})
export class GfActivitiesTableComponent
  implements AfterViewInit, OnChanges, OnDestroy, OnInit
{
  @Input() baseCurrency: string;
  @Input() dataSource: MatTableDataSource<Activity>;
  @Input() deviceType: string;
  @Input() hasActivities: boolean;
  @Input() hasPermissionToCreateActivity: boolean;
  @Input() hasPermissionToDeleteActivity: boolean;
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

  @Output() activitiesDeleted = new EventEmitter<void>();
  @Output() activityClicked = new EventEmitter<AssetProfileIdentifier>();
  @Output() activityDeleted = new EventEmitter<string>();
  @Output() activityToClone = new EventEmitter<OrderWithAccount>();
  @Output() activityToUpdate = new EventEmitter<OrderWithAccount>();
  @Output() export = new EventEmitter<void>();
  @Output() exportDrafts = new EventEmitter<string[]>();
  @Output() import = new EventEmitter<void>();
  @Output() importDividends = new EventEmitter<AssetProfileIdentifier>();
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

  public constructor(private notificationService: NotificationService) {}

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
      activity.Account?.isExcluded !== true &&
      activity.isDraft === false &&
      ['BUY', 'DIVIDEND', 'SELL'].includes(activity.type)
    ) {
      this.activityClicked.emit({
        dataSource: activity.SymbolProfile.dataSource,
        symbol: activity.SymbolProfile.symbol
      });
    }
  }

  public onCloneActivity(aActivity: OrderWithAccount) {
    this.activityToClone.emit(aActivity);
  }

  public onDeleteActivities() {
    this.notificationService.confirm({
      confirmFn: () => {
        this.activitiesDeleted.emit();
      },
      confirmType: ConfirmationDialogType.Warn,
      title: $localize`Do you really want to delete these activities?`
    });
  }

  public onDeleteActivity(aId: string) {
    this.notificationService.confirm({
      confirmFn: () => {
        this.activityDeleted.emit(aId);
      },
      confirmType: ConfirmationDialogType.Warn,
      title: $localize`Do you really want to delete this activity?`
    });
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

  public onImport() {
    this.import.emit();
  }

  public onImportDividends() {
    this.importDividends.emit();
  }

  public onOpenComment(aComment: string) {
    this.notificationService.alert({
      title: aComment
    });
  }

  public onUpdateActivity(aActivity: OrderWithAccount) {
    this.activityToUpdate.emit(aActivity);
  }

  public toggleAllRows() {
    if (this.areAllRowsSelected()) {
      this.selectedRows.clear();
    } else {
      this.dataSource.data.forEach((row) => {
        this.selectedRows.select(row);
      });
    }

    this.selectedActivities.emit(this.selectedRows.selected);
  }

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }
}
