import { getLocale } from '@ghostfolio/common/helper';
import { PortfolioPosition, UniqueAsset } from '@ghostfolio/common/interfaces';

import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  ViewChild
} from '@angular/core';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { Router } from '@angular/router';
import { AssetClass } from '@prisma/client';
import { Subject, Subscription } from 'rxjs';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'gf-holdings-table',
  styleUrls: ['./holdings-table.component.scss'],
  templateUrl: './holdings-table.component.html'
})
export class HoldingsTableComponent implements OnChanges, OnDestroy, OnInit {
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
