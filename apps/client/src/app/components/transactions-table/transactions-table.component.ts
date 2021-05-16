import { COMMA, ENTER } from '@angular/cdk/keycodes';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  ViewChild
} from '@angular/core';
import { FormControl } from '@angular/forms';
import {
  MatAutocomplete,
  MatAutocompleteSelectedEvent
} from '@angular/material/autocomplete';
import { MatChipInputEvent } from '@angular/material/chips';
import { MatDialog } from '@angular/material/dialog';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { ActivatedRoute, Router } from '@angular/router';
import { DEFAULT_DATE_FORMAT } from '@ghostfolio/common/config';
import { OrderWithAccount } from '@ghostfolio/common/types';
import { format } from 'date-fns';
import { BehaviorSubject, Observable, Subject, Subscription } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { PositionDetailDialog } from '../position/position-detail-dialog/position-detail-dialog.component';

const SEARCH_PLACEHOLDER = 'Search for account, currency, symbol or type...';
const SEARCH_STRING_SEPARATOR = ',';

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

  @ViewChild('autocomplete') matAutocomplete: MatAutocomplete;
  @ViewChild('searchInput') searchInput: ElementRef<HTMLInputElement>;
  @ViewChild(MatSort) sort: MatSort;

  public dataSource: MatTableDataSource<OrderWithAccount> = new MatTableDataSource();
  public defaultDateFormat = DEFAULT_DATE_FORMAT;
  public displayedColumns = [];
  public filteredTransactions$: Subject<string[]> = new BehaviorSubject([]);
  public filteredTransactions: Observable<
    string[]
  > = this.filteredTransactions$.asObservable();
  public isLoading = true;
  public placeholder = '';
  public routeQueryParams: Subscription;
  public searchControl = new FormControl();
  public searchKeywords: string[] = [];
  public separatorKeysCodes: number[] = [ENTER, COMMA];

  private allFilteredTransactions: string[];
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

    this.searchControl.valueChanges.subscribe((keyword) => {
      if (keyword) {
        const filterValue = keyword.toLowerCase();
        this.filteredTransactions$.next(
          this.allFilteredTransactions.filter(
            (filter) => filter.toLowerCase().indexOf(filterValue) === 0
          )
        );
      } else {
        this.filteredTransactions$.next(this.allFilteredTransactions);
      }
    });
  }

  public addKeyword({ input, value }: MatChipInputEvent): void {
    if (value?.trim()) {
      this.searchKeywords.push(value.trim());
      this.updateFilter();
    }

    // Reset the input value
    if (input) {
      input.value = '';
    }

    this.searchControl.setValue(null);
  }

  public removeKeyword(keyword: string): void {
    const index = this.searchKeywords.indexOf(keyword);

    if (index >= 0) {
      this.searchKeywords.splice(index, 1);
      this.updateFilter();
    }
  }

  public keywordSelected(event: MatAutocompleteSelectedEvent): void {
    this.searchKeywords.push(event.option.viewValue);
    this.updateFilter();
    this.searchInput.nativeElement.value = '';
    this.searchControl.setValue(null);
  }

  public ngOnInit() {}

  public ngOnChanges() {
    this.displayedColumns = [
      'date',
      'type',
      'symbol',
      'currency',
      'quantity',
      'unitPrice',
      'fee',
      'account'
    ];

    if (this.showActions) {
      this.displayedColumns.push('actions');
    }

    this.isLoading = true;

    if (this.transactions) {
      this.dataSource = new MatTableDataSource(this.transactions);
      this.dataSource.filterPredicate = (data, filter) => {
        const dataString = this.getFilterableValues(data)
          .join(' ')
          .toLowerCase();
        let contains = true;
        for (const singleFilter of filter.split(SEARCH_STRING_SEPARATOR)) {
          contains =
            contains && dataString.includes(singleFilter.trim().toLowerCase());
        }
        return contains;
      };
      this.dataSource.sort = this.sort;
      this.updateFilter();
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

  private updateFilter() {
    this.dataSource.filter = this.searchKeywords.join(SEARCH_STRING_SEPARATOR);
    const lowercaseSearchKeywords = this.searchKeywords.map((keyword) =>
      keyword.trim().toLowerCase()
    );

    this.placeholder =
      lowercaseSearchKeywords.length <= 0 ? SEARCH_PLACEHOLDER : '';

    this.allFilteredTransactions = this.getSearchableFieldValues(
      this.transactions
    ).filter((item) => {
      return !lowercaseSearchKeywords.includes(item.trim().toLowerCase());
    });

    this.filteredTransactions$.next(this.allFilteredTransactions);
  }

  private getSearchableFieldValues(transactions: OrderWithAccount[]): string[] {
    const fieldValues = new Set<string>();

    for (const transaction of transactions) {
      this.getFilterableValues(transaction, fieldValues);
    }

    return [...fieldValues]
      .filter((item) => {
        return item !== undefined;
      })
      .sort((a, b) => {
        const aFirstChar = a.charAt(0);
        const bFirstChar = b.charAt(0);
        const isANumber = aFirstChar >= '0' && aFirstChar <= '9';
        const isBNumber = bFirstChar >= '0' && bFirstChar <= '9';

        // Sort priority: text, followed by numbers
        if (isANumber && !isBNumber) {
          return 1;
        } else if (!isANumber && isBNumber) {
          return -1;
        } else {
          return a.toLowerCase() < b.toLowerCase() ? -1 : 1;
        }
      });
  }

  private getFilterableValues(
    transaction: OrderWithAccount,
    fieldValues: Set<string> = new Set<string>()
  ): string[] {
    fieldValues.add(transaction.currency);
    fieldValues.add(transaction.symbol);
    fieldValues.add(transaction.type);
    fieldValues.add(transaction.Account?.name);
    fieldValues.add(transaction.Account?.Platform?.name);
    fieldValues.add(format(transaction.date, 'yyyy'));

    return [...fieldValues].filter((item) => {
      return item !== undefined;
    });
  }
}
