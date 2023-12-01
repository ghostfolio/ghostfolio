import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
  OnDestroy,
  OnInit,
  ViewChild
} from '@angular/core';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { DataService } from '@ghostfolio/client/services/data.service';
import { AccountBalance } from '@ghostfolio/common/interfaces';
import { get } from 'lodash';
import { Subject, takeUntil } from 'rxjs';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'gf-account-balances',
  styleUrls: ['./account-balances.component.scss'],
  templateUrl: './account-balances.component.html'
})
export class AccountBalancesComponent implements OnDestroy, OnInit {
  @Input() accountId: string;
  @Input() locale: string;

  @ViewChild(MatSort) sort: MatSort;

  public dataSource: MatTableDataSource<AccountBalance> =
    new MatTableDataSource();
  public displayedColumns: string[] = ['date', 'value'];

  private unsubscribeSubject = new Subject<void>();

  public constructor(
    private changeDetectorRef: ChangeDetectorRef,
    private dataService: DataService
  ) {}

  public ngOnInit() {
    this.fetchBalances();
  }

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }

  private fetchBalances() {
    this.dataService
      .fetchAccountBalances(this.accountId)
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe(({ balances }) => {
        this.dataSource = new MatTableDataSource(balances);

        this.dataSource.sort = this.sort;
        this.dataSource.sortingDataAccessor = get;

        this.changeDetectorRef.markForCheck();
      });
  }
}
