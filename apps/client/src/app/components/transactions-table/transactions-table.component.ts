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
import { MatDialog } from '@angular/material/dialog';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { ActivatedRoute, Router } from '@angular/router';
import { OrderWithAccount } from '@ghostfolio/api/app/order/interfaces/order-with-account.type';
import { DEFAULT_DATE_FORMAT } from '@ghostfolio/helper';
import { Subject, Subscription } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { PositionDetailDialog } from '../position/position-detail-dialog/position-detail-dialog.component';

@Component({
  selector: 'gf-transactions-table',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './transactions-table.component.html',
  styleUrls: ['./transactions-table.component.scss']
})
export class TransactionsTableComponent
  implements OnChanges, OnDestroy, OnInit {
  @Input() baseCurrency: string;
  @Input() deviceType: string;
  @Input() locale: string;
  @Input() showActions: boolean;
  @Input() transactions: OrderWithAccount[];

  @Output() transactionDeleted = new EventEmitter<string>();
  @Output() transactionToClone = new EventEmitter<OrderWithAccount>();
  @Output() transactionToUpdate = new EventEmitter<OrderWithAccount>();

  @ViewChild(MatSort) sort: MatSort;

  public dataSource: MatTableDataSource<OrderWithAccount> = new MatTableDataSource();
  public defaultDateFormat = DEFAULT_DATE_FORMAT;
  public displayedColumns = [];
  public isLoading = true;
  public routeQueryParams: Subscription;

  private unsubscribeSubject = new Subject<void>();

  public constructor(
    private dialog: MatDialog,
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.routeQueryParams = route.queryParams
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((params) => {
        if (params['positionDetailDialog'] && params['symbol']) {
          this.openPositionDialog({
            symbol: params['symbol'],
            title: params['title']
          });
        }
      });
  }

  public ngOnInit() {}

  public ngOnChanges() {
    this.displayedColumns = [
      'account',
      'date',
      'type',
      'symbol',
      'currency',
      'quantity',
      'unitPrice',
      'fee'
    ];

    if (this.showActions) {
      this.displayedColumns.push('actions');
    }

    this.isLoading = true;

    if (this.transactions) {
      this.dataSource = new MatTableDataSource(this.transactions);
      this.dataSource.filterPredicate = (data, filter) => {
        const accumulator = (currentTerm: string, key: string) => {
          return key === 'Account'
            ? currentTerm + data.Account.name
            : currentTerm + data[key];
        };
        const dataString = Object.keys(data)
          .reduce(accumulator, '')
          .toLowerCase();
        const transformedFilter = filter.trim().toLowerCase();
        return dataString.includes(transformedFilter);
      };
      this.dataSource.sort = this.sort;

      this.isLoading = false;
    }
  }

  public applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();
  }

  public onDeleteTransaction(aId: string) {
    const confirmation = confirm(
      'Do you really want to delete this transaction?'
    );

    if (confirmation) {
      this.transactionDeleted.emit(aId);
    }
  }

  public onOpenPositionDialog({
    symbol,
    title
  }: {
    symbol: string;
    title: string;
  }): void {
    this.router.navigate([], {
      queryParams: { positionDetailDialog: true, symbol, title }
    });
  }

  public onUpdateTransaction(aTransaction: OrderWithAccount) {
    this.transactionToUpdate.emit(aTransaction);
  }

  public onCloneTransaction(aTransaction: OrderWithAccount) {
    this.transactionToClone.emit(aTransaction);
  }

  public openPositionDialog({
    symbol,
    title
  }: {
    symbol: string;
    title: string;
  }): void {
    const dialogRef = this.dialog.open(PositionDetailDialog, {
      autoFocus: false,
      data: {
        symbol,
        title,
        baseCurrency: this.baseCurrency,
        deviceType: this.deviceType,
        locale: this.locale
      },
      height: this.deviceType === 'mobile' ? '97.5vh' : '80vh',
      width: this.deviceType === 'mobile' ? '100vw' : '50rem'
    });

    dialogRef.afterClosed().subscribe(() => {
      this.router.navigate(['.'], { relativeTo: this.route });
    });
  }

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }
}
