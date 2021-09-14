import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Inject,
  OnDestroy,
  ViewChild
} from '@angular/core';
import { FormControl, Validators } from '@angular/forms';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { LookupItem } from '@ghostfolio/api/app/symbol/interfaces/lookup-item.interface';
import { DataService } from '@ghostfolio/client/services/data.service';
import { Currency } from '@prisma/client';
import { isString } from 'lodash';
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
  @ViewChild('autocomplete') autocomplete;

  public currencies: Currency[] = [];
  public currentMarketPrice = null;
  public filteredLookupItems: Observable<LookupItem[]>;
  public isLoading = false;
  public platforms: { id: string; name: string }[];
  public searchSymbolCtrl = new FormControl(
    {
      dataSource: this.data.transaction.dataSource,
      name: this.data.transaction.symbol
    },
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
      switchMap((query: string) => {
        if (isString(query)) {
          return this.dataService.fetchSymbols(query);
        }

        return [];
      })
    );

    if (this.data.transaction.symbol) {
      this.dataService
        .fetchSymbolItem({
          dataSource: this.data.transaction.dataSource,
          symbol: this.data.transaction.symbol
        })
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

  public displayFn(aLookupItem: LookupItem) {
    return aLookupItem?.name ?? '';
  }

  public onBlurSymbol() {
    this.data.transaction.currency = null;
    this.data.transaction.dataSource = null;

    if (this.autocomplete.isOpen) {
      this.searchSymbolCtrl.setErrors({ incorrect: true });
    } else {
      this.data.transaction.unitPrice = null;
    }

    this.changeDetectorRef.markForCheck();
  }

  public onCancel(): void {
    this.dialogRef.close();
  }

  public onUpdateSymbol(event: MatAutocompleteSelectedEvent) {
    this.data.transaction.dataSource = event.option.value.dataSource;
    this.updateSymbol(event.option.value.symbol);
  }

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }

  private updateSymbol(symbol: string) {
    this.isLoading = true;

    this.searchSymbolCtrl.setErrors(null);

    this.data.transaction.symbol = symbol;

    this.dataService
      .fetchSymbolItem({
        dataSource: this.data.transaction.dataSource,
        symbol: this.data.transaction.symbol
      })
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
