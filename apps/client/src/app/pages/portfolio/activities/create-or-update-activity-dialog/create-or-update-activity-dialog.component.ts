import { CreateOrderDto } from '@ghostfolio/api/app/order/create-order.dto';
import { UpdateOrderDto } from '@ghostfolio/api/app/order/update-order.dto';
import { DataService } from '@ghostfolio/client/services/data.service';
import { validateObjectForForm } from '@ghostfolio/client/util/form.util';
import { getDateFormatString } from '@ghostfolio/common/helper';
import { translate } from '@ghostfolio/ui/i18n';

import { COMMA, ENTER } from '@angular/cdk/keycodes';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  Inject,
  OnDestroy,
  ViewChild
} from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { DateAdapter, MAT_DATE_LOCALE } from '@angular/material/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { AssetClass, AssetSubClass, Tag, Type } from '@prisma/client';
import { isUUID } from 'class-validator';
import { isAfter, isToday } from 'date-fns';
import { EMPTY, Observable, Subject, lastValueFrom, of } from 'rxjs';
import { catchError, delay, map, startWith, takeUntil } from 'rxjs/operators';

import { CreateOrUpdateActivityDialogParams } from './interfaces/interfaces';

@Component({
  host: { class: 'h-100' },
  selector: 'gf-create-or-update-activity-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['./create-or-update-activity-dialog.scss'],
  templateUrl: 'create-or-update-activity-dialog.html'
})
export class CreateOrUpdateActivityDialog implements OnDestroy {
  @ViewChild('symbolAutocomplete') symbolAutocomplete;
  @ViewChild('tagInput') tagInput: ElementRef<HTMLInputElement>;

  public activityForm: FormGroup;
  public assetClasses = Object.keys(AssetClass).map((assetClass) => {
    return { id: assetClass, label: translate(assetClass) };
  });
  public assetSubClasses = Object.keys(AssetSubClass).map((assetSubClass) => {
    return { id: assetSubClass, label: translate(assetSubClass) };
  });
  public currencies: string[] = [];
  public currentMarketPrice = null;
  public defaultDateFormat: string;
  public filteredTagsObservable: Observable<Tag[]> = of([]);
  public isLoading = false;
  public isToday = isToday;
  public mode: 'create' | 'update';
  public platforms: { id: string; name: string }[];
  public separatorKeysCodes: number[] = [COMMA, ENTER];
  public tagsAvailable: Tag[] = [];
  public total = 0;
  public typesTranslationMap = new Map<Type, string>();
  public Validators = Validators;

  private unsubscribeSubject = new Subject<void>();

  public constructor(
    private changeDetectorRef: ChangeDetectorRef,
    @Inject(MAT_DIALOG_DATA) public data: CreateOrUpdateActivityDialogParams,
    private dataService: DataService,
    private dateAdapter: DateAdapter<any>,
    public dialogRef: MatDialogRef<CreateOrUpdateActivityDialog>,
    private formBuilder: FormBuilder,
    @Inject(MAT_DATE_LOCALE) private locale: string
  ) {}

  public ngOnInit() {
    this.mode = this.data.activity.id ? 'update' : 'create';
    this.locale = this.data.user?.settings?.locale;
    this.dateAdapter.setLocale(this.locale);

    const { currencies, platforms, tags } = this.dataService.fetchInfo();

    this.currencies = currencies;
    this.defaultDateFormat = getDateFormatString(this.locale);
    this.platforms = platforms;
    this.tagsAvailable = tags.map((tag) => {
      return {
        ...tag,
        name: translate(tag.name)
      };
    });

    Object.keys(Type).forEach((type) => {
      this.typesTranslationMap[Type[type]] = translate(Type[type]);
    });

    this.activityForm = this.formBuilder.group({
      accountId: [
        this.data.accounts.length === 1 &&
        !this.data.activity?.accountId &&
        this.mode === 'create'
          ? this.data.accounts[0].id
          : this.data.activity?.accountId,
        Validators.required
      ],
      assetClass: [this.data.activity?.SymbolProfile?.assetClass],
      assetSubClass: [this.data.activity?.SymbolProfile?.assetSubClass],
      comment: [this.data.activity?.comment],
      currency: [
        this.data.activity?.SymbolProfile?.currency,
        Validators.required
      ],
      currencyOfUnitPrice: [
        this.data.activity?.SymbolProfile?.currency,
        Validators.required
      ],
      dataSource: [
        this.data.activity?.SymbolProfile?.dataSource,
        Validators.required
      ],
      date: [this.data.activity?.date, Validators.required],
      fee: [this.data.activity?.fee, Validators.required],
      feeInCustomCurrency: [this.data.activity?.fee, Validators.required],
      name: [this.data.activity?.SymbolProfile?.name, Validators.required],
      quantity: [this.data.activity?.quantity, Validators.required],
      searchSymbol: [
        !!this.data.activity?.SymbolProfile
          ? {
              dataSource: this.data.activity?.SymbolProfile?.dataSource,
              symbol: this.data.activity?.SymbolProfile?.symbol
            }
          : null,
        Validators.required
      ],
      tags: [
        this.data.activity?.tags?.map(({ id, name }) => {
          return {
            id,
            name: translate(name)
          };
        })
      ],
      type: [undefined, Validators.required], // Set after value changes subscription
      unitPrice: [this.data.activity?.unitPrice, Validators.required],
      unitPriceInCustomCurrency: [
        this.data.activity?.unitPrice,
        Validators.required
      ],
      updateAccountBalance: [false]
    });

    this.activityForm.valueChanges
      .pipe(
        // Slightly delay until the more specific form control value changes have
        // completed
        delay(300),
        takeUntil(this.unsubscribeSubject)
      )
      .subscribe(async () => {
        let exchangeRateOfUnitPrice = 1;

        this.activityForm.get('feeInCustomCurrency').setErrors(null);
        this.activityForm.get('unitPriceInCustomCurrency').setErrors(null);

        const currency = this.activityForm.get('currency').value;
        const currencyOfUnitPrice = this.activityForm.get(
          'currencyOfUnitPrice'
        ).value;
        const date = this.activityForm.get('date').value;

        if (
          currency &&
          currencyOfUnitPrice &&
          currency !== currencyOfUnitPrice &&
          date
        ) {
          try {
            const { marketPrice } = await lastValueFrom(
              this.dataService
                .fetchExchangeRateForDate({
                  date,
                  symbol: `${currencyOfUnitPrice}-${currency}`
                })
                .pipe(takeUntil(this.unsubscribeSubject))
            );

            exchangeRateOfUnitPrice = marketPrice;
          } catch {
            this.activityForm.get('unitPriceInCustomCurrency').setErrors({
              invalid: true
            });
          }
        }

        const feeInCustomCurrency =
          this.activityForm.get('feeInCustomCurrency').value *
          exchangeRateOfUnitPrice;

        const unitPriceInCustomCurrency =
          this.activityForm.get('unitPriceInCustomCurrency').value *
          exchangeRateOfUnitPrice;

        this.activityForm.get('fee').setValue(feeInCustomCurrency, {
          emitEvent: false
        });

        this.activityForm.get('unitPrice').setValue(unitPriceInCustomCurrency, {
          emitEvent: false
        });

        if (
          this.activityForm.get('type').value === 'BUY' ||
          this.activityForm.get('type').value === 'FEE' ||
          this.activityForm.get('type').value === 'ITEM'
        ) {
          this.total =
            this.activityForm.get('quantity').value *
              this.activityForm.get('unitPrice').value +
              this.activityForm.get('fee').value ?? 0;
        } else {
          this.total =
            this.activityForm.get('quantity').value *
              this.activityForm.get('unitPrice').value -
              this.activityForm.get('fee').value ?? 0;
        }

        this.changeDetectorRef.markForCheck();
      });

    this.activityForm.get('accountId').valueChanges.subscribe((accountId) => {
      const type = this.activityForm.get('type').value;

      if (
        type === 'FEE' ||
        type === 'INTEREST' ||
        type === 'ITEM' ||
        type === 'LIABILITY'
      ) {
        const currency =
          this.data.accounts.find(({ id }) => {
            return id === accountId;
          })?.currency ?? this.data.user.settings.baseCurrency;

        this.activityForm.get('currency').setValue(currency);
        this.activityForm.get('currencyOfUnitPrice').setValue(currency);

        if (['FEE', 'INTEREST'].includes(type)) {
          if (this.activityForm.get('accountId').value) {
            this.activityForm.get('updateAccountBalance').enable();
          } else {
            this.activityForm.get('updateAccountBalance').disable();
            this.activityForm.get('updateAccountBalance').setValue(false);
          }
        }
      }
    });

    this.activityForm.get('date').valueChanges.subscribe(() => {
      if (isToday(this.activityForm.get('date').value)) {
        this.activityForm.get('updateAccountBalance').enable();
      } else {
        this.activityForm.get('updateAccountBalance').disable();
        this.activityForm.get('updateAccountBalance').setValue(false);
      }

      this.changeDetectorRef.markForCheck();
    });

    this.activityForm.get('searchSymbol').valueChanges.subscribe(() => {
      if (this.activityForm.get('searchSymbol').invalid) {
        this.data.activity.SymbolProfile = null;
      } else if (
        ['BUY', 'DIVIDEND', 'SELL'].includes(
          this.activityForm.get('type').value
        )
      ) {
        this.activityForm
          .get('dataSource')
          .setValue(this.activityForm.get('searchSymbol').value.dataSource);

        this.updateSymbol();
      }

      this.changeDetectorRef.markForCheck();
    });

    this.filteredTagsObservable = this.activityForm.controls[
      'tags'
    ].valueChanges.pipe(
      startWith(this.activityForm.get('tags').value),
      map((aTags: Tag[] | null) => {
        return aTags ? this.filterTags(aTags) : this.tagsAvailable.slice();
      })
    );

    this.activityForm
      .get('type')
      .valueChanges.pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((type: Type) => {
        if (type === 'ITEM') {
          this.activityForm
            .get('accountId')
            .removeValidators(Validators.required);
          this.activityForm.get('accountId').updateValueAndValidity();

          const currency =
            this.data.accounts.find(({ id }) => {
              return id === this.activityForm.get('accountId').value;
            })?.currency ?? this.data.user.settings.baseCurrency;

          this.activityForm.get('currency').setValue(currency);
          this.activityForm.get('currencyOfUnitPrice').setValue(currency);

          this.activityForm
            .get('dataSource')
            .removeValidators(Validators.required);
          this.activityForm.get('dataSource').updateValueAndValidity();
          this.activityForm.get('feeInCustomCurrency').reset();
          this.activityForm.get('name').setValidators(Validators.required);
          this.activityForm.get('name').updateValueAndValidity();
          this.activityForm.get('quantity').setValue(1);
          this.activityForm
            .get('searchSymbol')
            .removeValidators(Validators.required);
          this.activityForm.get('searchSymbol').updateValueAndValidity();
          this.activityForm.get('updateAccountBalance').disable();
          this.activityForm.get('updateAccountBalance').setValue(false);
        } else if (
          type === 'FEE' ||
          type === 'INTEREST' ||
          type === 'LIABILITY'
        ) {
          this.activityForm
            .get('accountId')
            .removeValidators(Validators.required);
          this.activityForm.get('accountId').updateValueAndValidity();

          const currency =
            this.data.accounts.find(({ id }) => {
              return id === this.activityForm.get('accountId').value;
            })?.currency ?? this.data.user.settings.baseCurrency;

          this.activityForm.get('currency').setValue(currency);
          this.activityForm.get('currencyOfUnitPrice').setValue(currency);

          this.activityForm
            .get('dataSource')
            .removeValidators(Validators.required);
          this.activityForm.get('dataSource').updateValueAndValidity();

          if (
            (type === 'FEE' &&
              this.activityForm.get('feeInCustomCurrency').value === 0) ||
            type === 'INTEREST' ||
            type === 'LIABILITY'
          ) {
            this.activityForm.get('feeInCustomCurrency').reset();
          }

          this.activityForm.get('name').setValidators(Validators.required);
          this.activityForm.get('name').updateValueAndValidity();

          if (type === 'FEE') {
            this.activityForm.get('quantity').setValue(0);
          } else if (type === 'INTEREST' || type === 'LIABILITY') {
            this.activityForm.get('quantity').setValue(1);
          }

          this.activityForm
            .get('searchSymbol')
            .removeValidators(Validators.required);
          this.activityForm.get('searchSymbol').updateValueAndValidity();

          if (type === 'FEE') {
            this.activityForm.get('unitPriceInCustomCurrency').setValue(0);
          }

          if (
            ['FEE', 'INTEREST'].includes(type) &&
            this.activityForm.get('accountId').value
          ) {
            this.activityForm.get('updateAccountBalance').enable();
          } else {
            this.activityForm.get('updateAccountBalance').disable();
            this.activityForm.get('updateAccountBalance').setValue(false);
          }
        } else {
          this.activityForm.get('accountId').setValidators(Validators.required);
          this.activityForm.get('accountId').updateValueAndValidity();
          this.activityForm
            .get('dataSource')
            .setValidators(Validators.required);
          this.activityForm.get('dataSource').updateValueAndValidity();
          this.activityForm.get('name').removeValidators(Validators.required);
          this.activityForm.get('name').updateValueAndValidity();
          this.activityForm
            .get('searchSymbol')
            .setValidators(Validators.required);
          this.activityForm.get('searchSymbol').updateValueAndValidity();
          this.activityForm.get('updateAccountBalance').enable();
        }

        this.changeDetectorRef.markForCheck();
      });

    this.activityForm.get('type').setValue(this.data.activity?.type);

    if (this.data.activity?.id) {
      this.activityForm.get('searchSymbol').disable();
      this.activityForm.get('type').disable();
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
      currencyOfUnitPrice: this.activityForm.get('currency').value,
      unitPriceInCustomCurrency: this.currentMarketPrice
    });
  }

  public dateFilter(aDate: Date) {
    if (!aDate) {
      return true;
    }

    return isAfter(aDate, new Date(0));
  }

  public onAddTag(event: MatAutocompleteSelectedEvent) {
    this.activityForm.get('tags').setValue([
      ...(this.activityForm.get('tags').value ?? []),
      this.tagsAvailable.find(({ id }) => {
        return id === event.option.value;
      })
    ]);

    this.tagInput.nativeElement.value = '';
  }

  public onCancel() {
    this.dialogRef.close();
  }

  public onRemoveTag(aTag: Tag) {
    this.activityForm.get('tags').setValue(
      this.activityForm.get('tags').value.filter(({ id }) => {
        return id !== aTag.id;
      })
    );
  }

  public async onSubmit() {
    const activity: CreateOrderDto | UpdateOrderDto = {
      accountId: this.activityForm.get('accountId').value,
      assetClass: this.activityForm.get('assetClass').value,
      assetSubClass: this.activityForm.get('assetSubClass').value,
      comment: this.activityForm.get('comment').value || null,
      currency: this.activityForm.get('currency').value,
      customCurrency: this.activityForm.get('currencyOfUnitPrice').value,
      date: this.activityForm.get('date').value,
      dataSource: this.activityForm.get('dataSource').value,
      fee: this.activityForm.get('fee').value,
      quantity: this.activityForm.get('quantity').value,
      symbol:
        this.activityForm.get('searchSymbol').value?.symbol === undefined ||
        isUUID(this.activityForm.get('searchSymbol').value?.symbol)
          ? this.activityForm.get('name').value
          : this.activityForm.get('searchSymbol').value.symbol,
      tags: this.activityForm.get('tags').value,
      type: this.activityForm.get('type').value,
      unitPrice: this.activityForm.get('unitPrice').value
    };

    try {
      if (this.mode === 'create') {
        (activity as CreateOrderDto).updateAccountBalance =
          this.activityForm.get('updateAccountBalance').value;

        await validateObjectForForm({
          classDto: CreateOrderDto,
          form: this.activityForm,
          ignoreFields: ['dataSource', 'date'],
          object: activity
        });

        this.dialogRef.close(activity as CreateOrderDto);
      } else {
        (activity as UpdateOrderDto).id = this.data.activity.id;

        await validateObjectForForm({
          classDto: UpdateOrderDto,
          form: this.activityForm,
          ignoreFields: ['dataSource', 'date'],
          object: activity as UpdateOrderDto
        });

        this.dialogRef.close(activity as UpdateOrderDto);
      }
    } catch (error) {
      console.error(error);
    }
  }

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }

  private filterTags(aTags: Tag[]) {
    const tagIds = aTags.map(({ id }) => {
      return id;
    });

    return this.tagsAvailable.filter(({ id }) => {
      return !tagIds.includes(id);
    });
  }

  private updateSymbol() {
    this.isLoading = true;
    this.changeDetectorRef.markForCheck();

    this.dataService
      .fetchSymbolItem({
        dataSource: this.activityForm.get('dataSource').value,
        symbol: this.activityForm.get('searchSymbol').value.symbol
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
        this.activityForm.get('currency').setValue(currency);
        this.activityForm.get('currencyOfUnitPrice').setValue(currency);
        this.activityForm.get('dataSource').setValue(dataSource);

        this.currentMarketPrice = marketPrice;

        this.isLoading = false;

        this.changeDetectorRef.markForCheck();
      });
  }
}
