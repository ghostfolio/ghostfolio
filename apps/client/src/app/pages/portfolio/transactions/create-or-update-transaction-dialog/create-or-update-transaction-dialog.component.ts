import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Inject,
  OnDestroy,
  ViewChild
} from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { DateAdapter, MAT_DATE_LOCALE } from '@angular/material/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { CreateOrderDto } from '@ghostfolio/api/app/order/create-order.dto';
import { UpdateOrderDto } from '@ghostfolio/api/app/order/update-order.dto';
import { LookupItem } from '@ghostfolio/api/app/symbol/interfaces/lookup-item.interface';
import { DataService } from '@ghostfolio/client/services/data.service';
import { AssetClass, AssetSubClass, Type } from '@prisma/client';
import { isUUID } from 'class-validator';
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

  public activityForm: FormGroup;
  public assetClasses = Object.keys(AssetClass);
  public assetSubClasses = Object.keys(AssetSubClass);
  public currencies: string[] = [];
  public currentMarketPrice = null;
  public filteredLookupItems: LookupItem[];
  public filteredLookupItemsObservable: Observable<LookupItem[]>;
  public isLoading = false;
  public platforms: { id: string; name: string }[];
  public total = 0;
  public Validators = Validators;

  private unsubscribeSubject = new Subject<void>();

  public constructor(
    private changeDetectorRef: ChangeDetectorRef,
    @Inject(MAT_DIALOG_DATA) public data: CreateOrUpdateTransactionDialogParams,
    private dataService: DataService,
    private dateAdapter: DateAdapter<any>,
    public dialogRef: MatDialogRef<CreateOrUpdateTransactionDialog>,
    private formBuilder: FormBuilder,
    @Inject(MAT_DATE_LOCALE) private locale: string
  ) {}

  public ngOnInit() {
    this.locale = this.data.user?.settings?.locale;
    this.dateAdapter.setLocale(this.locale);

    const { currencies, platforms } = this.dataService.fetchInfo();

    this.currencies = currencies;
    this.platforms = platforms;

    this.activityForm = this.formBuilder.group({
      accountId: [this.data.activity?.accountId, Validators.required],
      assetClass: [this.data.activity?.SymbolProfile?.assetClass],
      assetSubClass: [this.data.activity?.SymbolProfile?.assetSubClass],
      currency: [
        this.data.activity?.SymbolProfile?.currency,
        Validators.required
      ],
      dataSource: [
        this.data.activity?.SymbolProfile?.dataSource,
        Validators.required
      ],
      date: [this.data.activity?.date, Validators.required],
      fee: [this.data.activity?.fee, Validators.required],
      name: [this.data.activity?.SymbolProfile?.name, Validators.required],
      quantity: [this.data.activity?.quantity, Validators.required],
      searchSymbol: [
        {
          dataSource: this.data.activity?.SymbolProfile?.dataSource,
          symbol: this.data.activity?.SymbolProfile?.symbol
        },
        Validators.required
      ],
      tags: [this.data.activity?.tags],
      type: [undefined, Validators.required], // Set after value changes subscription
      unitPrice: [this.data.activity?.unitPrice, Validators.required]
    });

    this.activityForm.valueChanges
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe(() => {
        if (
          this.activityForm.controls['type'].value === 'BUY' ||
          this.activityForm.controls['type'].value === 'ITEM'
        ) {
          this.total =
            this.activityForm.controls['quantity'].value *
              this.activityForm.controls['unitPrice'].value +
              this.activityForm.controls['fee'].value ?? 0;
        } else {
          this.total =
            this.activityForm.controls['quantity'].value *
              this.activityForm.controls['unitPrice'].value -
              this.activityForm.controls['fee'].value ?? 0;
        }
      });

    this.filteredLookupItemsObservable = this.activityForm.controls[
      'searchSymbol'
    ].valueChanges.pipe(
      startWith(''),
      debounceTime(400),
      distinctUntilChanged(),
      switchMap((query: string) => {
        if (isString(query)) {
          const filteredLookupItemsObservable =
            this.dataService.fetchSymbols(query);

          filteredLookupItemsObservable
            .pipe(takeUntil(this.unsubscribeSubject))
            .subscribe((filteredLookupItems) => {
              this.filteredLookupItems = filteredLookupItems;
            });

          return filteredLookupItemsObservable;
        }

        return [];
      })
    );

    this.activityForm.controls['type'].valueChanges
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((type: Type) => {
        if (type === 'ITEM') {
          this.activityForm.controls['accountId'].removeValidators(
            Validators.required
          );
          this.activityForm.controls['accountId'].updateValueAndValidity();
          this.activityForm.controls['currency'].setValue(
            this.data.user.settings.baseCurrency
          );
          this.activityForm.controls['dataSource'].removeValidators(
            Validators.required
          );
          this.activityForm.controls['dataSource'].updateValueAndValidity();
          this.activityForm.controls['name'].setValidators(Validators.required);
          this.activityForm.controls['name'].updateValueAndValidity();
          this.activityForm.controls['quantity'].setValue(1);
          this.activityForm.controls['searchSymbol'].removeValidators(
            Validators.required
          );
          this.activityForm.controls['searchSymbol'].updateValueAndValidity();
        } else {
          this.activityForm.controls['accountId'].setValidators(
            Validators.required
          );
          this.activityForm.controls['accountId'].updateValueAndValidity();
          this.activityForm.controls['dataSource'].setValidators(
            Validators.required
          );
          this.activityForm.controls['dataSource'].updateValueAndValidity();
          this.activityForm.controls['name'].removeValidators(
            Validators.required
          );
          this.activityForm.controls['name'].updateValueAndValidity();
          this.activityForm.controls['searchSymbol'].setValidators(
            Validators.required
          );
          this.activityForm.controls['searchSymbol'].updateValueAndValidity();
        }
      });

    this.activityForm.controls['type'].setValue(this.data.activity?.type);

    if (this.data.activity?.id) {
      this.activityForm.controls['searchSymbol'].disable();
      this.activityForm.controls['type'].disable();
    }

    if (this.data.activity?.SymbolProfile?.symbol) {
      this.dataService
        .fetchSymbolItem({
          dataSource: this.data.activity?.SymbolProfile?.dataSource,
          symbol: this.data.activity?.SymbolProfile?.symbol
        })
        .pipe(takeUntil(this.unsubscribeSubject))
        .subscribe(({ marketPrice }) => {
          this.currentMarketPrice = marketPrice;

          this.changeDetectorRef.markForCheck();
        });
    }
  }

  public applyCurrentMarketPrice() {
    this.activityForm.patchValue({
      unitPrice: this.currentMarketPrice
    });
  }

  public displayFn(aLookupItem: LookupItem) {
    return aLookupItem?.symbol ?? '';
  }

  public onBlurSymbol() {
    const currentLookupItem = this.filteredLookupItems.find((lookupItem) => {
      return (
        lookupItem.symbol ===
        this.activityForm.controls['searchSymbol'].value.symbol
      );
    });

    if (currentLookupItem) {
      this.updateSymbol(currentLookupItem.symbol);
    } else {
      this.activityForm.controls['searchSymbol'].setErrors({ incorrect: true });

      this.data.activity.SymbolProfile = null;
    }

    this.changeDetectorRef.markForCheck();
  }

  public onCancel(): void {
    this.dialogRef.close();
  }

  public onSubmit() {
    const activity: CreateOrderDto | UpdateOrderDto = {
      accountId: this.activityForm.controls['accountId'].value,
      assetClass: this.activityForm.controls['assetClass'].value,
      assetSubClass: this.activityForm.controls['assetSubClass'].value,
      currency: this.activityForm.controls['currency'].value,
      date: this.activityForm.controls['date'].value,
      dataSource: this.activityForm.controls['dataSource'].value,
      fee: this.activityForm.controls['fee'].value,
      quantity: this.activityForm.controls['quantity'].value,
      symbol:
        this.activityForm.controls['searchSymbol'].value.symbol === undefined ||
        isUUID(this.activityForm.controls['searchSymbol'].value.symbol)
          ? this.activityForm.controls['name'].value
          : this.activityForm.controls['searchSymbol'].value.symbol,
      tags: this.activityForm.controls['tags'].value,
      type: this.activityForm.controls['type'].value,
      unitPrice: this.activityForm.controls['unitPrice'].value
    };

    if (this.data.activity.id) {
      (activity as UpdateOrderDto).id = this.data.activity.id;
    }

    this.dialogRef.close({ activity });
  }

  public onUpdateSymbol(event: MatAutocompleteSelectedEvent) {
    this.activityForm.controls['dataSource'].setValue(
      event.option.value.dataSource
    );
    this.updateSymbol(event.option.value.symbol);
  }

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }

  private updateSymbol(symbol: string) {
    this.isLoading = true;

    this.activityForm.controls['searchSymbol'].setErrors(null);
    this.activityForm.controls['searchSymbol'].setValue({ symbol });

    this.changeDetectorRef.markForCheck();

    this.dataService
      .fetchSymbolItem({
        dataSource: this.activityForm.controls['dataSource'].value,
        symbol: this.activityForm.controls['searchSymbol'].value.symbol
      })
      .pipe(
        catchError(() => {
          this.data.activity.SymbolProfile = null;

          this.isLoading = false;

          this.changeDetectorRef.markForCheck();

          return EMPTY;
        }),
        takeUntil(this.unsubscribeSubject)
      )
      .subscribe(({ currency, dataSource, marketPrice }) => {
        this.activityForm.controls['currency'].setValue(currency);
        this.activityForm.controls['dataSource'].setValue(dataSource);

        this.currentMarketPrice = marketPrice;

        this.isLoading = false;

        this.changeDetectorRef.markForCheck();
      });
  }
}
