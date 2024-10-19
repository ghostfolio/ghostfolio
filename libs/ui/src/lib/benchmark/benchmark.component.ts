import { getLocale, resolveMarketCondition } from '@ghostfolio/common/helper';
import {
  AssetProfileIdentifier,
  Benchmark,
  User
} from '@ghostfolio/common/interfaces';
import { translate } from '@ghostfolio/ui/i18n';
import { GfTrendIndicatorComponent } from '@ghostfolio/ui/trend-indicator';
import { GfValueComponent } from '@ghostfolio/ui/value';

import { CommonModule } from '@angular/common';
import {
  CUSTOM_ELEMENTS_SCHEMA,
  ChangeDetectionStrategy,
  Component,
  Input,
  OnChanges,
  OnDestroy
} from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatTableModule } from '@angular/material/table';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';
import { Subject, takeUntil } from 'rxjs';

import { GfBenchmarkDetailDialogComponent } from './benchmark-detail-dialog/benchmark-detail-dialog.component';
import { BenchmarkDetailDialogParams } from './benchmark-detail-dialog/interfaces/interfaces';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    GfTrendIndicatorComponent,
    GfValueComponent,
    MatTableModule,
    NgxSkeletonLoaderModule,
    RouterModule
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  selector: 'gf-benchmark',
  standalone: true,
  styleUrls: ['./benchmark.component.scss'],
  templateUrl: './benchmark.component.html'
})
export class GfBenchmarkComponent implements OnChanges, OnDestroy {
  @Input() benchmarks: Benchmark[];
  @Input() deviceType: string;
  @Input() locale = getLocale();
  @Input() user: User;

  public displayedColumns = ['name', 'date', 'change', 'marketCondition'];
  public isLoading = true;
  public resolveMarketCondition = resolveMarketCondition;
  public translate = translate;

  private unsubscribeSubject = new Subject<void>();

  public constructor(
    private dialog: MatDialog,
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
  }

  public ngOnChanges() {
    if (this.benchmarks) {
      this.isLoading = false;
    }

    if (this.user?.settings?.isExperimentalFeatures) {
      this.displayedColumns = [
        'name',
        'trend50d',
        'trend200d',
        'date',
        'change',
        'marketCondition'
      ];
    }
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
      data: <BenchmarkDetailDialogParams>{
        dataSource,
        symbol,
        colorScheme: this.user?.settings?.colorScheme,
        deviceType: this.deviceType,
        locale: this.locale
      },
      height: this.deviceType === 'mobile' ? '97.5vh' : undefined,
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
