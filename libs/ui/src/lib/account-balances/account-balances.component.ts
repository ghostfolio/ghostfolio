import { getLocale } from '@ghostfolio/common/helper';
import { AccountBalancesResponse } from '@ghostfolio/common/interfaces';

import {
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
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { get } from 'lodash';
import { Subject } from 'rxjs';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'gf-account-balances',
  styleUrls: ['./account-balances.component.scss'],
  templateUrl: './account-balances.component.html'
})
export class AccountBalancesComponent implements OnChanges, OnDestroy, OnInit {
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
