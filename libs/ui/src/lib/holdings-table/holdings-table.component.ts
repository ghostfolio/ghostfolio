import { GfAssetProfileIconComponent } from '@ghostfolio/client/components/asset-profile-icon/asset-profile-icon.component';
import { GfPositionDetailDialogModule } from '@ghostfolio/client/components/position/position-detail-dialog/position-detail-dialog.module';
import { GfSymbolModule } from '@ghostfolio/client/pipes/symbol/symbol.module';
import { getLocale } from '@ghostfolio/common/helper';
import { PortfolioPosition, UniqueAsset } from '@ghostfolio/common/interfaces';
import { GfNoTransactionsInfoComponent } from '@ghostfolio/ui/no-transactions-info';
import { GfValueComponent } from '@ghostfolio/ui/value';

import { CommonModule } from '@angular/common';
import {
  CUSTOM_ELEMENTS_SCHEMA,
  ChangeDetectionStrategy,
  Component,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  ViewChild
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { Router, RouterModule } from '@angular/router';
import { AssetClass } from '@prisma/client';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';
import { Subject, Subscription } from 'rxjs';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    GfAssetProfileIconComponent,
    GfNoTransactionsInfoComponent,
    GfPositionDetailDialogModule,
    GfSymbolModule,
    GfValueComponent,
    MatButtonModule,
    MatDialogModule,
    MatPaginatorModule,
    MatSortModule,
    MatTableModule,
    NgxSkeletonLoaderModule,
    RouterModule
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  selector: 'gf-holdings-table',
  standalone: true,
  styleUrls: ['./holdings-table.component.scss'],
  templateUrl: './holdings-table.component.html'
})
export class GfHoldingsTableComponent implements OnChanges, OnDestroy, OnInit {
  @Input() baseCurrency: string;
  @Input() deviceType: string;
  @Input() hasPermissionToCreateActivity: boolean;
  @Input() hasPermissionToOpenDetails = true;
  @Input() hasPermissionToShowValues = true;
  @Input() holdings: PortfolioPosition[];
  @Input() locale = getLocale();
  @Input() pageSize = Number.MAX_SAFE_INTEGER;

  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;

  public dataSource: MatTableDataSource<PortfolioPosition> =
    new MatTableDataSource();
  public displayedColumns = [];
  public ignoreAssetSubClasses = [AssetClass.CASH];
  public isLoading = true;
  public routeQueryParams: Subscription;

  private unsubscribeSubject = new Subject<void>();

  public constructor(private router: Router) {}

  public ngOnInit() {}

  public ngOnChanges() {
    this.displayedColumns = ['icon', 'nameWithSymbol', 'dateOfFirstActivity'];

    if (this.hasPermissionToShowValues) {
      this.displayedColumns.push('valueInBaseCurrency');
    }

    this.displayedColumns.push('allocationInPercentage');
    this.displayedColumns.push('performance');

    this.isLoading = true;

    this.dataSource = new MatTableDataSource(this.holdings);
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;

    if (this.holdings) {
      this.isLoading = false;
    }
  }

  public onOpenPositionDialog({ dataSource, symbol }: UniqueAsset) {
    if (this.hasPermissionToOpenDetails) {
      this.router.navigate([], {
        queryParams: { dataSource, symbol, positionDetailDialog: true }
      });
    }
  }

  public onShowAllPositions() {
    this.pageSize = Number.MAX_SAFE_INTEGER;

    setTimeout(() => {
      this.dataSource.paginator = this.paginator;
    });
  }

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }
}
