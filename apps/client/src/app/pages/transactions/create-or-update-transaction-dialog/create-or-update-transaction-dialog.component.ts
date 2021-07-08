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
import { Currency } from '@prisma/client';
import { Observable, Subject } from 'rxjs';
import {
  debounceTime,
  distinctUntilChanged,
  startWith,
  switchMap,
  takeUntil
} from 'rxjs/operators';

import { DataService } from '../../../services/data.service';
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

  ngOnInit() {
    this.dataService
      .fetchInfo()
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe(({ currencies, platforms }) => {
        this.currencies = currencies;
        this.platforms = platforms;

        this.changeDetectorRef.markForCheck();
      });

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

  public onCancel(): void {
    this.dialogRef.close();
  }

  public onUpdateSymbol(event: MatAutocompleteSelectedEvent) {
    this.isLoading = true;
    this.data.transaction.symbol = event.option.value;

    this.dataService
      .fetchSymbolItem(this.data.transaction.symbol)
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe(({ currency, dataSource, marketPrice }) => {
        this.data.transaction.currency = currency;
        this.data.transaction.dataSource = dataSource;
        this.currentMarketPrice = marketPrice;

        this.isLoading = false;

        this.changeDetectorRef.markForCheck();
      });
  }

  public onUpdateSymbolByTyping(value: string) {
    this.data.transaction.currency = null;
    this.data.transaction.dataSource = null;
    this.data.transaction.unitPrice = null;

    this.data.transaction.symbol = value;
  }

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }
}
