import { getLocale } from '@ghostfolio/common/helper';
import { Holding } from '@ghostfolio/common/interfaces';
import { GfValueComponent } from '@ghostfolio/ui/value';

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
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { get } from 'lodash';
import { Subject } from 'rxjs';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [GfValueComponent, MatButtonModule, MatSortModule, MatTableModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  selector: 'gf-top-holdings',
  standalone: true,
  styleUrls: ['./top-holdings.component.scss'],
  templateUrl: './top-holdings.component.html'
})
export class GfTopHoldingsComponent implements OnChanges, OnDestroy, OnInit {
  @Input() baseCurrency: string;
  @Input() locale = getLocale();
  @Input() topHoldings: Holding[];

  @ViewChild(MatSort) sort: MatSort;

  public dataSource: MatTableDataSource<Holding> = new MatTableDataSource();
  public displayedColumns: string[] = [
    'name',
    'valueInBaseCurrency',
    'allocationInPercentage'
  ];

  private unsubscribeSubject = new Subject<void>();

  public constructor() {}

  public ngOnInit() {}

  public ngOnChanges() {
    if (this.topHoldings) {
      this.dataSource = new MatTableDataSource(this.topHoldings);

      this.dataSource.sort = this.sort;
      this.dataSource.sortingDataAccessor = get;
    }
  }

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }
}
