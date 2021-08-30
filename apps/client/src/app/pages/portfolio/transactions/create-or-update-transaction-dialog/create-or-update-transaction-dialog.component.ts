import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Inject,
  OnDestroy
} from '@angular/core';
import { FormControl, Validators } from '@angular/forms';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { LookupItem } from '@ghostfolio/api/app/symbol/interfaces/lookup-item.interface';
import { DataService } from '@ghostfolio/client/services/data.service';
import { Currency } from '@prisma/client';
import { EMPTY, Observable, Subject } from 'rxjs';
import {
  catchError,
  debounceTime,
  distinctUntilChanged,
  startWith,
  switchMap,
  takeUntil
} from 'rxjs/operators';

import { CreateOrUpdateTransactionDialogParams } from './interfaces/interfaces';

@Component({
  host: { class: 'h-100' },
  selector: 'gf-create-or-update-transaction-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['./create-or-update-transaction-dialog.scss'],
  templateUrl: 'create-or-update-transaction-dialog.html'
})
export class CreateOrUpdateTransactionDialog implements OnDestroy {
  public currencies: Currency[] = [];
  public currentMarketPrice = null;
  public filteredLookupItems: Observable<LookupItem[]>;
  public isLoading = false;
  public platforms: { id: string; name: string }[];
  public searchSymbolCtrl = new FormControl(
    this.data.transaction.symbol,
    Validators.required
  );

  private unsubscribeSubject = new Subject<void>();

  public constructor(
    private changeDetectorRef: ChangeDetectorRef,
    private dataService: DataService,
    public dialogRef: MatDialogRef<CreateOrUpdateTransactionDialog>,
    @Inject(MAT_DIALOG_DATA) public data: CreateOrUpdateTransactionDialogParams
  ) {}

  public ngOnInit() {
    const { currencies, platforms } = this.dataService.fetchInfo();

    this.currencies = currencies;
    this.platforms = platforms;

    this.filteredLookupItems = this.searchSymbolCtrl.valueChanges.pipe(
      startWith(''),
      debounceTime(400),
      distinctUntilChanged(),
      switchMap((aQuery: string) => {
        if (aQuery) {
          return this.dataService.fetchSymbols(aQuery);
        }

        return [];
      })
    );

    if (this.data.transaction.symbol) {
      this.dataService
        .fetchSymbolItem(this.data.transaction.symbol)
        .pipe(takeUntil(this.unsubscribeSubject))
        .subscribe(({ marketPrice }) => {
          this.currentMarketPrice = marketPrice;

          this.changeDetectorRef.markForCheck();
        });
    }
  }

  public applyCurrentMarketPrice() {
    this.data.transaction.unitPrice = this.currentMarketPrice;
  }

  public onBlurSymbol() {
    const symbol = this.searchSymbolCtrl.value;
    this.updateSymbol(symbol);
  }

  public onCancel(): void {
    this.dialogRef.close();
  }

  public onUpdateSymbol(event: MatAutocompleteSelectedEvent) {
    this.updateSymbol(event.option.value);
  }

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }

  private updateSymbol(symbol: string) {
    this.isLoading = true;

    this.data.transaction.symbol = symbol;

    this.dataService
      .fetchSymbolItem(this.data.transaction.symbol)
      .pipe(
        catchError(() => {
          this.data.transaction.currency = null;
          this.data.transaction.dataSource = null;
          this.data.transaction.unitPrice = null;

          this.isLoading = false;

          this.changeDetectorRef.markForCheck();

          return EMPTY;
        }),
        takeUntil(this.unsubscribeSubject)
      )
      .subscribe(({ currency, dataSource, marketPrice }) => {
        this.data.transaction.currency = currency;
        this.data.transaction.dataSource = dataSource;
        this.currentMarketPrice = marketPrice;

        this.isLoading = false;

        this.changeDetectorRef.markForCheck();
      });
  }
}
