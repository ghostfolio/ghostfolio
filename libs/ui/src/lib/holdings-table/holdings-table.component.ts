import { getLocale, getLowercase } from '@ghostfolio/common/helper';
import {
  AssetProfileIdentifier,
  PortfolioPosition
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
  computed,
  input,
  viewChild
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { AssetSubClass } from '@prisma/client';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';
import { Subject, Subscription } from 'rxjs';

import { GfEntityLogoComponent } from '../entity-logo/entity-logo.component';
import { GfValueComponent } from '../value/value.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    GfEntityLogoComponent,
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
  @Input() hasPermissionToOpenDetails = true;
  @Input() hasPermissionToShowQuantities = true;
  @Input() hasPermissionToShowValues = true;
  @Input() locale = getLocale();
  @Input() pageSize = Number.MAX_SAFE_INTEGER;

  @Output() holdingClicked = new EventEmitter<AssetProfileIdentifier>();

  public displayedColumns: string[] = [];
  public ignoreAssetSubClasses = [AssetSubClass.CASH];
  public routeQueryParams: Subscription;

  public readonly holdings = input.required<PortfolioPosition[]>();
  public readonly paginator = viewChild.required(MatPaginator);
  public readonly sort = viewChild.required(MatSort);

  protected readonly dataSource = computed(() => {
    const dataSource = new MatTableDataSource(this.holdings());
    dataSource.paginator = this.paginator();
    dataSource.sortingDataAccessor = getLowercase;
    dataSource.sort = this.sort();
    return dataSource;
  });

  protected readonly isLoading = computed(() => !this.holdings());

  private readonly unsubscribeSubject = new Subject<void>();

  public ngOnChanges() {
    this.displayedColumns = ['icon', 'nameWithSymbol', 'dateOfFirstActivity'];

    if (this.hasPermissionToShowQuantities) {
      this.displayedColumns.push('quantity');
    }

    if (this.hasPermissionToShowValues) {
      this.displayedColumns.push('valueInBaseCurrency');
    }

    this.displayedColumns.push('allocationInPercentage');

    if (this.hasPermissionToShowValues) {
      this.displayedColumns.push('performance');
    }

    this.displayedColumns.push('performanceInPercentage');
  }

  public onOpenHoldingDialog({ dataSource, symbol }: AssetProfileIdentifier) {
    if (this.hasPermissionToOpenDetails) {
      this.holdingClicked.emit({ dataSource, symbol });
    }
  }

  public onShowAllHoldings() {
    this.pageSize = Number.MAX_SAFE_INTEGER;

    setTimeout(() => {
      this.dataSource().paginator = this.paginator();
    });
  }

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }
}
