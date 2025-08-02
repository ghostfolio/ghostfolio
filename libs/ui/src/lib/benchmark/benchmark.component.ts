import { ConfirmationDialogType } from '@ghostfolio/client/core/notification/confirmation-dialog/confirmation-dialog.type';
import { NotificationService } from '@ghostfolio/client/core/notification/notification.service';
import { getLocale, resolveMarketCondition } from '@ghostfolio/common/helper';
import {
  AssetProfileIdentifier,
  Benchmark,
  User
} from '@ghostfolio/common/interfaces';

import { CommonModule } from '@angular/common';
import {
  CUSTOM_ELEMENTS_SCHEMA,
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  ViewChild
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatMenuModule } from '@angular/material/menu';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { ellipsisHorizontal, trashOutline } from 'ionicons/icons';
import { get, isNumber } from 'lodash';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';
import { Subject, takeUntil } from 'rxjs';

import { translate } from '../i18n';
import { GfTrendIndicatorComponent } from '../trend-indicator/trend-indicator.component';
import { GfValueComponent } from '../value/value.component';
import { GfBenchmarkDetailDialogComponent } from './benchmark-detail-dialog/benchmark-detail-dialog.component';
import { BenchmarkDetailDialogParams } from './benchmark-detail-dialog/interfaces/interfaces';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    GfTrendIndicatorComponent,
    GfValueComponent,
    IonIcon,
    MatButtonModule,
    MatMenuModule,
    MatSortModule,
    MatTableModule,
    NgxSkeletonLoaderModule,
    RouterModule
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  selector: 'gf-benchmark',
  styleUrls: ['./benchmark.component.scss'],
  templateUrl: './benchmark.component.html'
})
export class GfBenchmarkComponent implements OnChanges, OnDestroy {
  @Input() benchmarks: Benchmark[];
  @Input() deviceType: string;
  @Input() hasPermissionToDeleteItem: boolean;
  @Input() locale = getLocale();
  @Input() user: User;

  @Output() itemDeleted = new EventEmitter<AssetProfileIdentifier>();

  @ViewChild(MatSort) sort: MatSort;

  public dataSource = new MatTableDataSource<Benchmark>([]);
  public displayedColumns = [
    'name',
    'date',
    'change',
    'marketCondition',
    'actions'
  ];
  public isLoading = true;
  public isNumber = isNumber;
  public resolveMarketCondition = resolveMarketCondition;
  public translate = translate;

  private unsubscribeSubject = new Subject<void>();

  public constructor(
    private dialog: MatDialog,
    private notificationService: NotificationService,
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.route.queryParams
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((params) => {
        if (
          params['benchmarkDetailDialog'] &&
          params['dataSource'] &&
          params['symbol']
        ) {
          this.openBenchmarkDetailDialog({
            dataSource: params['dataSource'],
            symbol: params['symbol']
          });
        }
      });

    addIcons({ ellipsisHorizontal, trashOutline });
  }

  public ngOnChanges() {
    if (this.benchmarks) {
      this.dataSource.data = this.benchmarks;
      this.dataSource.sort = this.sort;
      this.dataSource.sortingDataAccessor = get;

      this.isLoading = false;
    }

    if (this.user?.settings?.isExperimentalFeatures) {
      this.displayedColumns = [
        'name',
        'trend50d',
        'trend200d',
        'date',
        'change',
        'marketCondition',
        'actions'
      ];
    }
  }

  public onDeleteItem({ dataSource, symbol }: AssetProfileIdentifier) {
    this.notificationService.confirm({
      confirmFn: () => {
        this.itemDeleted.emit({ dataSource, symbol });
      },
      confirmType: ConfirmationDialogType.Warn,
      title: $localize`Do you really want to delete this item?`
    });
  }

  public onOpenBenchmarkDialog({ dataSource, symbol }: AssetProfileIdentifier) {
    this.router.navigate([], {
      queryParams: { dataSource, symbol, benchmarkDetailDialog: true }
    });
  }

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }

  private openBenchmarkDetailDialog({
    dataSource,
    symbol
  }: AssetProfileIdentifier) {
    const dialogRef = this.dialog.open(GfBenchmarkDetailDialogComponent, {
      data: {
        dataSource,
        symbol,
        colorScheme: this.user?.settings?.colorScheme,
        deviceType: this.deviceType,
        locale: this.locale
      } as BenchmarkDetailDialogParams,
      height: this.deviceType === 'mobile' ? '98vh' : undefined,
      width: this.deviceType === 'mobile' ? '100vw' : '50rem'
    });

    dialogRef
      .afterClosed()
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe(() => {
        this.router.navigate(['.'], { relativeTo: this.route });
      });
  }
}
