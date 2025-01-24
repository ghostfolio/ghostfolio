import { GfAssetProfileIconComponent } from '@ghostfolio/client/components/asset-profile-icon/asset-profile-icon.component';
import { GfSymbolModule } from '@ghostfolio/client/pipes/symbol/symbol.module';
import { getLocale } from '@ghostfolio/common/helper';
import {
  AssetProfileIdentifier,
  PortfolioPosition
} from '@ghostfolio/common/interfaces';
import { GfNoTransactionsInfoComponent } from '@ghostfolio/ui/no-transactions-info';
import { GfValueComponent } from '@ghostfolio/ui/value';

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
import { MatDialogModule } from '@angular/material/dialog';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { AssetSubClass } from '@prisma/client';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';
import { Subject, Subscription } from 'rxjs';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    GfAssetProfileIconComponent,
    GfNoTransactionsInfoComponent,
    GfSymbolModule,
    GfValueComponent,
    MatButtonModule,
    MatDialogModule,
    MatPaginatorModule,
    MatSortModule,
    MatTableModule,
    NgxSkeletonLoaderModule
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  selector: 'gf-holdings-table',
  styleUrls: ['./holdings-table.component.scss'],
  templateUrl: './holdings-table.component.html'
})
export class GfHoldingsTableComponent implements OnChanges, OnDestroy {
  @Input() baseCurrency: string;
  @Input() deviceType: string;
  @Input() hasPermissionToCreateActivity: boolean;
  @Input() hasPermissionToOpenDetails = true;
  @Input() hasPermissionToShowValues = true;
  @Input() holdings: PortfolioPosition[];
  @Input() locale = getLocale();
  @Input() pageSize = Number.MAX_SAFE_INTEGER;

  @Output() holdingClicked = new EventEmitter<AssetProfileIdentifier>();

  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;

  public dataSource = new MatTableDataSource<PortfolioPosition>();
  public displayedColumns = [];
  public ignoreAssetSubClasses = [AssetSubClass.CASH];
  public isLoading = true;
  public routeQueryParams: Subscription;

  private unsubscribeSubject = new Subject<void>();

  public ngOnChanges() {
    this.displayedColumns = ['icon', 'nameWithSymbol', 'dateOfFirstActivity'];

    if (this.hasPermissionToShowValues) {
      this.displayedColumns.push('valueInBaseCurrency');
    }

    this.displayedColumns.push('allocationInPercentage');

    if (this.hasPermissionToShowValues) {
      this.displayedColumns.push('performance');
    }

    this.displayedColumns.push('performanceInPercentage');

    this.isLoading = true;

    this.dataSource = new MatTableDataSource(this.holdings);
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;

    if (this.holdings) {
      this.isLoading = false;
    }
  }

  public onOpenHoldingDialog({ dataSource, symbol }: AssetProfileIdentifier) {
    if (this.hasPermissionToOpenDetails) {
      this.holdingClicked.emit({ dataSource, symbol });
    }
  }

  public onShowAllHoldings() {
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
