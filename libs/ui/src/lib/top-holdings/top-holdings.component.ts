import { getLocale } from '@ghostfolio/common/helper';
import { Holding } from '@ghostfolio/common/interfaces';
import { GfValueComponent } from '@ghostfolio/ui/value';

import { CommonModule } from '@angular/common';
import {
  CUSTOM_ELEMENTS_SCHEMA,
  ChangeDetectionStrategy,
  Component,
  Input,
  OnChanges,
  OnDestroy,
  ViewChild
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { get } from 'lodash';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';
import { Subject } from 'rxjs';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    GfValueComponent,
    MatButtonModule,
    MatPaginatorModule,
    MatSortModule,
    MatTableModule,
    NgxSkeletonLoaderModule
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  selector: 'gf-top-holdings',
  standalone: true,
  styleUrls: ['./top-holdings.component.scss'],
  templateUrl: './top-holdings.component.html'
})
export class GfTopHoldingsComponent implements OnChanges, OnDestroy {
  @Input() baseCurrency: string;
  @Input() locale = getLocale();
  @Input() pageSize = Number.MAX_SAFE_INTEGER;
  @Input() topHoldings: Holding[];

  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;

  public dataSource: MatTableDataSource<Holding> = new MatTableDataSource();
  public displayedColumns: string[] = [
    'name',
    'valueInBaseCurrency',
    'allocationInPercentage'
  ];
  public isLoading = true;

  private unsubscribeSubject = new Subject<void>();

  public ngOnChanges() {
    this.isLoading = true;

    this.dataSource = new MatTableDataSource(this.topHoldings);
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
    this.dataSource.sortingDataAccessor = get;

    if (this.topHoldings) {
      this.isLoading = false;
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
