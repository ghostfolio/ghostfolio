import { getLocale } from '@ghostfolio/common/helper';
import { AccountBalancesResponse } from '@ghostfolio/common/interfaces';

import { CommonModule } from '@angular/common';
import {
  CUSTOM_ELEMENTS_SCHEMA,
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  ViewChild
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { get } from 'lodash';
import { Subject } from 'rxjs';

import { GfValueComponent } from '../value';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    GfValueComponent,
    MatButtonModule,
    MatMenuModule,
    MatSortModule,
    MatTableModule
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  selector: 'gf-account-balances',
  standalone: true,
  styleUrls: ['./account-balances.component.scss'],
  templateUrl: './account-balances.component.html'
})
export class GfAccountBalancesComponent
  implements OnChanges, OnDestroy, OnInit
{
  @Input() accountBalances: AccountBalancesResponse['balances'];
  @Input() accountId: string;
  @Input() locale = getLocale();
  @Input() showActions = true;

  @Output() accountBalanceDeleted = new EventEmitter<string>();

  @ViewChild(MatSort) sort: MatSort;

  public dataSource: MatTableDataSource<
    AccountBalancesResponse['balances'][0]
  > = new MatTableDataSource();
  public displayedColumns: string[] = ['date', 'value', 'actions'];

  private unsubscribeSubject = new Subject<void>();

  public constructor() {}

  public ngOnInit() {}

  public ngOnChanges() {
    if (this.accountBalances) {
      this.dataSource = new MatTableDataSource(this.accountBalances);

      this.dataSource.sort = this.sort;
      this.dataSource.sortingDataAccessor = get;
    }
  }

  public onDeleteAccountBalance(aId: string) {
    const confirmation = confirm(
      $localize`Do you really want to delete this account balance?`
    );

    if (confirmation) {
      this.accountBalanceDeleted.emit(aId);
    }
  }

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }
}
