import {
  canOpenHoldingDetail,
  getLocale,
  getLowercase
} from '@ghostfolio/common/helper';
import {
  AssetProfileIdentifier,
  PortfolioPosition
} from '@ghostfolio/common/interfaces';

import {
  CUSTOM_ELEMENTS_SCHEMA,
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  model,
  output,
  viewChild
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule, SortDirection } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';

import { GfEntityLogoComponent } from '../entity-logo/entity-logo.component';
import { GfValueComponent } from '../value/value.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
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
export class GfHoldingsTableComponent {
  public readonly hasPermissionToOpenDetails = input(true);
  public readonly hasPermissionToShowQuantities = input(true);
  public readonly hasPermissionToShowValues = input(true);
  public readonly holdings = input.required<PortfolioPosition[] | undefined>();
  public readonly locale = input(getLocale());
  public readonly mode = input<'default' | 'simple'>('default');
  public readonly pageSize = model(Number.MAX_SAFE_INTEGER);

  public readonly holdingClicked = output<AssetProfileIdentifier>();

  protected readonly paginator = viewChild.required(MatPaginator);
  protected readonly sort = viewChild.required(MatSort);

  protected readonly dataSource = new MatTableDataSource<PortfolioPosition>([]);

  protected readonly displayedColumns = computed(() => {
    if (this.mode() === 'simple') {
      return ['icon', 'nameWithSymbol', 'performanceInPercentage'];
    }

    const columns = ['icon', 'nameWithSymbol', 'dateOfFirstActivity'];

    if (this.hasPermissionToShowQuantities()) {
      columns.push('quantity');
    }

    if (this.hasPermissionToShowValues()) {
      columns.push('valueInBaseCurrency');
    }

    columns.push('allocationInPercentage');

    if (this.hasPermissionToShowValues()) {
      columns.push('performance');
    }

    columns.push('performanceInPercentage');
    return columns;
  });

  protected readonly isLoading = computed(() => {
    return !this.holdings();
  });

  protected readonly sortActive = computed(() => {
    return this.mode() === 'default'
      ? 'allocationInPercentage'
      : 'assetProfile.name';
  });

  protected readonly sortDirection = computed<SortDirection>(() => {
    return this.mode() === 'default' ? 'desc' : 'asc';
  });

  public constructor() {
    this.dataSource.sortingDataAccessor = getLowercase;

    // Reactive data update
    effect(() => {
      this.dataSource.data = this.holdings() ?? [];
    });

    // Reactive view connection
    effect(() => {
      this.dataSource.paginator = this.paginator();
      this.dataSource.sort = this.sort();
    });
  }

  protected canShowDetails(holding: PortfolioPosition): boolean {
    return this.hasPermissionToOpenDetails() && canOpenHoldingDetail(holding);
  }

  protected onOpenHoldingDialog({
    dataSource,
    symbol
  }: AssetProfileIdentifier) {
    this.holdingClicked.emit({ dataSource, symbol });
  }

  protected onShowAllHoldings() {
    this.pageSize.set(Number.MAX_SAFE_INTEGER);

    setTimeout(() => {
      this.dataSource.paginator = this.paginator();
    });
  }
}
