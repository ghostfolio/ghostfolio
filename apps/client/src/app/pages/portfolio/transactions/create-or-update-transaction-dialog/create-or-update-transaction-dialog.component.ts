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
import { CreateOrderDto } from '@ghostfolio/api/app/order/create-order.dto';
import { UpdateOrderDto } from '@ghostfolio/api/app/order/update-order.dto';
import { LookupItem } from '@ghostfolio/api/app/symbol/interfaces/lookup-item.interface';
import { DataService } from '@ghostfolio/client/services/data.service';
import { Type } from '@prisma/client';
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

  public accountIdCtrl = new FormControl({}, Validators.required);
  public currencyCtrl = new FormControl({}, Validators.required);
  public currencies: string[] = [];
  public currentMarketPrice = null;
  public dataSourceCtrl = new FormControl({}, Validators.required);
  public dateCtrl = new FormControl({}, Validators.required);
  public feeCtrl = new FormControl({}, Validators.required);
  public filteredLookupItems: LookupItem[];
  public filteredLookupItemsObservable: Observable<LookupItem[]>;
  public isLoading = false;
  public nameCtrl = new FormControl({}, Validators.required);
  public platforms: { id: string; name: string }[];
  public quantityCtrl = new FormControl({}, Validators.required);
  public searchSymbolCtrl = new FormControl({}, Validators.required);
  public showAccountIdCtrl = true;
  public showNameCtrl = true;
  public showSearchSymbolCtrl = true;
  public typeCtrl = new FormControl({}, Validators.required);
  public unitPriceCtrl = new FormControl({}, Validators.required);

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

    this.filteredLookupItemsObservable =
      this.searchSymbolCtrl.valueChanges.pipe(
        startWith(''),
        debounceTime(400),
        distinctUntilChanged(),
        switchMap((query: string) => {
          if (isString(query)) {
            const filteredLookupItemsObservable =
              this.dataService.fetchSymbols(query);

            filteredLookupItemsObservable.subscribe((filteredLookupItems) => {
              this.filteredLookupItems = filteredLookupItems;
            });

            return filteredLookupItemsObservable;
          }

          return [];
        })
      );

    this.typeCtrl.valueChanges.subscribe((type: Type) => {
      if (type === 'ITEM') {
        this.accountIdCtrl.removeValidators(Validators.required);
        this.accountIdCtrl.updateValueAndValidity();
        this.currencyCtrl.setValue(this.data.user.settings.baseCurrency);
        this.dataSourceCtrl.removeValidators(Validators.required);
        this.dataSourceCtrl.updateValueAndValidity();
        this.nameCtrl.setValidators(Validators.required);
        this.nameCtrl.updateValueAndValidity();
        this.quantityCtrl.setValue(1);
        this.searchSymbolCtrl.removeValidators(Validators.required);
        this.searchSymbolCtrl.updateValueAndValidity();
        this.showAccountIdCtrl = false;
        this.showNameCtrl = true;
        this.showSearchSymbolCtrl = false;
      } else {
        this.accountIdCtrl.setValidators(Validators.required);
        this.accountIdCtrl.updateValueAndValidity();
        this.currencyCtrl.setValue(undefined);
        this.dataSourceCtrl.setValidators(Validators.required);
        this.dataSourceCtrl.updateValueAndValidity();
        this.nameCtrl.removeValidators(Validators.required);
        this.nameCtrl.updateValueAndValidity();
        this.quantityCtrl.setValue(undefined);
        this.searchSymbolCtrl.setValidators(Validators.required);
        this.searchSymbolCtrl.updateValueAndValidity();
        this.showAccountIdCtrl = true;
        this.showNameCtrl = false;
        this.showSearchSymbolCtrl = true;
      }

      this.changeDetectorRef.markForCheck();
    });

    this.accountIdCtrl.setValue(this.data.activity?.accountId);
    this.currencyCtrl.setValue(this.data.activity?.currency);
    this.dataSourceCtrl.setValue(this.data.activity?.dataSource);
    this.dateCtrl.setValue(this.data.activity?.date);
    this.feeCtrl.setValue(this.data.activity?.fee);
    this.nameCtrl.setValue(this.data.activity?.SymbolProfile?.name);
    this.quantityCtrl.setValue(this.data.activity?.quantity);
    this.searchSymbolCtrl.setValue({
      dataSource: this.data.activity?.dataSource,
      symbol: this.data.activity?.symbol
    });
    this.typeCtrl.setValue(this.data.activity?.type);
    this.unitPriceCtrl.setValue(this.data.activity?.unitPrice);

    if (this.data.activity?.id) {
      this.searchSymbolCtrl.disable();
      this.typeCtrl.disable();
    }

    if (this.data.activity?.symbol) {
      this.dataService
        .fetchSymbolItem({
          dataSource: this.data.activity?.dataSource,
          symbol: this.data.activity?.symbol
        })
        .pipe(takeUntil(this.unsubscribeSubject))
        .subscribe(({ marketPrice }) => {
          this.currentMarketPrice = marketPrice;

          this.changeDetectorRef.markForCheck();
        });
    }
  }

  public applyCurrentMarketPrice() {
    this.unitPriceCtrl.setValue(this.currentMarketPrice);
  }

  public displayFn(aLookupItem: LookupItem) {
    return aLookupItem?.symbol ?? '';
  }

  public onBlurSymbol() {
    const currentLookupItem = this.filteredLookupItems.find((lookupItem) => {
      return lookupItem.symbol === this.data.activity.symbol;
    });

    if (currentLookupItem) {
      this.updateSymbol(currentLookupItem.symbol);
    } else {
      this.searchSymbolCtrl.setErrors({ incorrect: true });

      this.data.activity.currency = null;
      this.data.activity.dataSource = null;
      this.data.activity.symbol = null;
    }

    this.changeDetectorRef.markForCheck();
  }

  public onCancel(): void {
    this.dialogRef.close();
  }

  public onSubmit() {
    const activity: CreateOrderDto | UpdateOrderDto = {
      accountId: this.accountIdCtrl.value,
      currency: this.currencyCtrl.value,
      date: this.dateCtrl.value,
      dataSource: this.dataSourceCtrl.value,
      fee: this.feeCtrl.value,
      quantity: this.quantityCtrl.value,
      symbol: this.searchSymbolCtrl.value.symbol ?? this.nameCtrl.value,
      type: this.typeCtrl.value,
      unitPrice: this.unitPriceCtrl.value
    };

    if (this.data.activity.id) {
      (activity as UpdateOrderDto).id = this.data.activity.id;
    }

    this.dialogRef.close({ activity });
  }

  public onUpdateSymbol(event: MatAutocompleteSelectedEvent) {
    this.dataSourceCtrl.setValue(event.option.value.dataSource);
    this.updateSymbol(event.option.value.symbol);
  }

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }

  private updateSymbol(symbol: string) {
    this.isLoading = true;

    this.searchSymbolCtrl.setErrors(null);

    this.searchSymbolCtrl.setValue({ symbol });

    this.changeDetectorRef.markForCheck();

    this.dataService
      .fetchSymbolItem({
        dataSource: this.dataSourceCtrl.value,
        symbol: this.searchSymbolCtrl.value.symbol
      })
      .pipe(
        catchError(() => {
          this.data.activity.currency = null;
          this.data.activity.dataSource = null;
          this.data.activity.unitPrice = null;

          this.isLoading = false;

          this.changeDetectorRef.markForCheck();

          return EMPTY;
        }),
        takeUntil(this.unsubscribeSubject)
      )
      .subscribe(({ currency, dataSource, marketPrice }) => {
        this.currencyCtrl.setValue(currency);
        this.dataSourceCtrl.setValue(dataSource);

        this.currentMarketPrice = marketPrice;

        this.isLoading = false;

        this.changeDetectorRef.markForCheck();
      });
  }
}
