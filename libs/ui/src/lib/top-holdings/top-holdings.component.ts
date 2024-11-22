import { getLocale } from '@ghostfolio/common/helper';
import {
  AssetProfileIdentifier,
  HoldingWithParents,
  PortfolioPosition
} from '@ghostfolio/common/interfaces';
import { GfValueComponent } from '@ghostfolio/ui/value';

import {
  animate,
  state,
  style,
  transition,
  trigger
} from '@angular/animations';
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
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { DataSource } from '@prisma/client';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';
import { Subject } from 'rxjs';

@Component({
  animations: [
    trigger('detailExpand', [
      state('collapsed,void', style({ height: '0px', minHeight: '0' })),
      state('expanded', style({ height: '*' })),
      transition(
        'expanded <=> collapsed',
        animate('225ms cubic-bezier(0.4, 0.0, 0.2, 1)')
      )
    ])
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    GfValueComponent,
    MatButtonModule,
    MatPaginatorModule,
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
  @Input() topHoldings: HoldingWithParents[];
  @Input() positions: {
    [symbol: string]: Pick<PortfolioPosition, 'type'> & {
      dataSource?: DataSource;
      name: string;
      value: number;
    };
  } = {};

  @Output() holdingClicked = new EventEmitter<AssetProfileIdentifier>();

  @ViewChild(MatPaginator) paginator: MatPaginator;

  public dataSource = new MatTableDataSource<HoldingWithParents>();
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

    if (this.topHoldings) {
      this.isLoading = false;
    }
  }

  public onClickHolding(assetProfileIdentifier: AssetProfileIdentifier) {
    this.holdingClicked.emit(assetProfileIdentifier);
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
