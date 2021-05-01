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
import { Order as OrderModel } from '@prisma/client';
import { Subject, Subscription } from 'rxjs';

@Component({
  selector: 'gf-accounts-table',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './accounts-table.component.html',
  styleUrls: ['./accounts-table.component.scss']
})
export class AccountsTableComponent implements OnChanges, OnDestroy, OnInit {
  @Input() accounts: OrderModel[];
  @Input() baseCurrency: string;
  @Input() deviceType: string;
  @Input() locale: string;
  @Input() showActions: boolean;

  @Output() transactionDeleted = new EventEmitter<string>();
  @Output() transactionToUpdate = new EventEmitter<OrderModel>();

  @ViewChild(MatSort) sort: MatSort;

  public dataSource: MatTableDataSource<OrderModel> = new MatTableDataSource();
  public displayedColumns = [];
  public isLoading = true;
  public routeQueryParams: Subscription;

  private unsubscribeSubject = new Subject<void>();

  public constructor(
    private dialog: MatDialog,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  public ngOnInit() {}

  public ngOnChanges() {
    this.displayedColumns = ['account', 'type', 'symbol'];

    this.isLoading = true;

    if (this.showActions) {
      this.displayedColumns.push('actions');
    }

    if (this.accounts) {
      this.dataSource = new MatTableDataSource(this.accounts);
      this.dataSource.sort = this.sort;

      this.isLoading = false;
    }
  }

  public onDeleteTransaction(aId: string) {
    const confirmation = confirm(
      'Do you really want to delete this transaction?'
    );

    if (confirmation) {
      this.transactionDeleted.emit(aId);
    }
  }

  public onUpdateTransaction(aTransaction: OrderModel) {
    this.transactionToUpdate.emit(aTransaction);
  }

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }
}
