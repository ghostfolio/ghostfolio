import { CreateOrderDto } from '@ghostfolio/api/app/order/create-order.dto';
import { UpdateOrderDto } from '@ghostfolio/api/app/order/update-order.dto';
import { UserService } from '@ghostfolio/client/services/user/user.service';
import { getDateFormatString } from '@ghostfolio/common/helper';
import { LookupItem } from '@ghostfolio/common/interfaces';
import { hasPermission, permissions } from '@ghostfolio/common/permissions';
import { GfEntityLogoComponent } from '@ghostfolio/ui/entity-logo';
import { translate } from '@ghostfolio/ui/i18n';
import { GfSymbolAutocompleteComponent } from '@ghostfolio/ui/symbol-autocomplete';
import { GfTagsSelectorComponent } from '@ghostfolio/ui/tags-selector';
import { GfValueComponent } from '@ghostfolio/ui/value';

import { NgClass } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Inject,
  OnDestroy
} from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { DateAdapter, MAT_DATE_LOCALE } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { IonIcon } from '@ionic/angular/standalone';
import { AssetClass, AssetSubClass, Tag, Type } from '@prisma/client';
import { isAfter, isToday } from 'date-fns';
import { addIcons } from 'ionicons';
import { calendarClearOutline, refreshOutline } from 'ionicons/icons';
import { EMPTY, Subject } from 'rxjs';
import { catchError, delay, takeUntil } from 'rxjs/operators';

import { DataService } from '../../../../services/data.service';
import { validateObjectForForm } from '../../../../util/form.util';
import { CreateOrUpdateActivityDialogParams } from './interfaces/interfaces';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'h-100' },
  imports: [
    GfEntityLogoComponent,
    GfSymbolAutocompleteComponent,
    GfTagsSelectorComponent,
    GfValueComponent,
    IonIcon,
    MatButtonModule,
    MatCheckboxModule,
    MatDatepickerModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    NgClass,
    ReactiveFormsModule
  ],
  selector: 'gf-create-or-update-activity-dialog',
  styleUrls: ['./create-or-update-activity-dialog.scss'],
  templateUrl: 'create-or-update-activity-dialog.html'
})
export class CreateOrUpdateActivityDialog implements OnDestroy {
  public activityForm: FormGroup;
  public assetClasses = Object.keys(AssetClass).map((assetClass) => {
    return { id: assetClass, label: translate(assetClass) };
  });
  public assetSubClasses = Object.keys(AssetSubClass).map((assetSubClass) => {
    return { id: assetSubClass, label: translate(assetSubClass) };
  });
  public currencies: string[] = [];
  public currencyOfAssetProfile: string;
  public currentMarketPrice = null;
  public defaultDateFormat: string;
  public defaultLookupItems: LookupItem[] = [];
  public hasPermissionToCreateOwnTag: boolean;
  public isLoading = false;
  public isToday = isToday;
  public mode: 'create' | 'update';
  public platforms: { id: string; name: string }[];
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
    @Inject(MAT_DATE_LOCALE) private locale: string,
    private userService: UserService
  ) {
    addIcons({ calendarClearOutline, refreshOutline });
  }

  public ngOnInit() {
    this.currencyOfAssetProfile = this.data.activity?.SymbolProfile?.currency;
    this.hasPermissionToCreateOwnTag =
      this.data.user?.settings?.isExperimentalFeatures &&
      hasPermission(this.data.user?.permissions, permissions.createOwnTag);
    this.locale = this.data.user?.settings?.locale;
    this.mode = this.data.activity?.id ? 'update' : 'create';

    this.dateAdapter.setLocale(this.locale);

    const { currencies, platforms } = this.dataService.fetchInfo();

    this.currencies = currencies;
    this.defaultDateFormat = getDateFormatString(this.locale);
    this.platforms = platforms;

    this.dataService
      .fetchPortfolioHoldings()
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe(({ holdings }) => {
        this.defaultLookupItems = holdings
          .filter(({ assetSubClass }) => {
            return !['CASH'].includes(assetSubClass);
          })
          .sort((a, b) => {
            return a.name?.localeCompare(b.name);
          })
          .map(
            ({
              assetClass,
              assetSubClass,
              currency,
              dataSource,
              name,
              symbol
            }) => {
              return {
                assetClass,
                assetSubClass,
                currency,
                dataSource,
                name,
                symbol,
                dataProviderInfo: {
                  isPremium: false
                }
              };
            }
          );

        this.changeDetectorRef.markForCheck();
      });

    this.tagsAvailable =
      this.data.user?.tags?.map((tag) => {
        return {
          ...tag,
          name: translate(tag.name)
        };
      }) ?? [];

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
        this.data.activity?.currency ??
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
        this.data.activity?.SymbolProfile
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
        if (
          ['BUY', 'FEE', 'ITEM'].includes(this.activityForm.get('type').value)
        ) {
          this.total =
            this.activityForm.get('quantity').value *
              this.activityForm.get('unitPrice').value +
            (this.activityForm.get('fee').value ?? 0);
        } else {
          this.total =
            this.activityForm.get('quantity').value *
              this.activityForm.get('unitPrice').value -
            (this.activityForm.get('fee').value ?? 0);
        }

        this.changeDetectorRef.markForCheck();
      });

    this.activityForm.get('accountId').valueChanges.subscribe((accountId) => {
      const type = this.activityForm.get('type').value;

      if (['FEE', 'INTEREST', 'ITEM', 'LIABILITY'].includes(type)) {
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
        this.updateAssetProfile();
      }

      this.changeDetectorRef.markForCheck();
    });

    this.activityForm.get('tags').valueChanges.subscribe((tags: Tag[]) => {
      const newTag = tags.find(({ id }) => {
        return id === undefined;
      });

      if (newTag && this.hasPermissionToCreateOwnTag) {
        this.dataService
          .postTag({ ...newTag, userId: this.data.user.id })
          .pipe(takeUntil(this.unsubscribeSubject))
          .subscribe((tag) => {
            this.activityForm.get('tags').setValue(
              tags.map((currentTag) => {
                if (currentTag.id === undefined) {
                  return tag;
                }

                return currentTag;
              })
            );

            this.userService
              .get(true)
              .pipe(takeUntil(this.unsubscribeSubject))
              .subscribe();
          });
      }
    });

    this.activityForm
      .get('type')
      .valueChanges.pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((type: Type) => {
        if (
          type === 'ITEM' ||
          (this.activityForm.get('dataSource').value === 'MANUAL' &&
            type === 'BUY')
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
          this.activityForm.get('fee').setValue(0);
          this.activityForm.get('name').setValidators(Validators.required);
          this.activityForm.get('name').updateValueAndValidity();
          this.activityForm.get('quantity').setValue(1);
          this.activityForm
            .get('searchSymbol')
            .removeValidators(Validators.required);
          this.activityForm.get('searchSymbol').updateValueAndValidity();
          this.activityForm.get('updateAccountBalance').disable();
          this.activityForm.get('updateAccountBalance').setValue(false);
        } else if (['FEE', 'INTEREST', 'LIABILITY'].includes(type)) {
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

          if (['INTEREST', 'LIABILITY'].includes(type)) {
            this.activityForm.get('fee').setValue(0);
          }

          this.activityForm.get('name').setValidators(Validators.required);
          this.activityForm.get('name').updateValueAndValidity();

          if (type === 'FEE') {
            this.activityForm.get('quantity').setValue(0);
          } else if (['INTEREST', 'LIABILITY'].includes(type)) {
            this.activityForm.get('quantity').setValue(1);
          }

          this.activityForm
            .get('searchSymbol')
            .removeValidators(Validators.required);
          this.activityForm.get('searchSymbol').updateValueAndValidity();

          if (type === 'FEE') {
            this.activityForm.get('unitPrice').setValue(0);
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
      unitPrice: this.currentMarketPrice
    });
  }

  public dateFilter(aDate: Date) {
    if (!aDate) {
      return true;
    }

    return isAfter(aDate, new Date(0));
  }

  public onCancel() {
    this.dialogRef.close();
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
        (['FEE', 'INTEREST', 'ITEM', 'LIABILITY'].includes(
          this.activityForm.get('type').value
        )
          ? undefined
          : this.activityForm.get('searchSymbol')?.value?.symbol) ??
        this.activityForm.get('name')?.value,
      tags: this.activityForm.get('tags').value,
      type: this.activityForm.get('type').value,
      unitPrice: this.activityForm.get('unitPrice').value
    };

    try {
      if (this.mode === 'create') {
        activity.updateAccountBalance = this.activityForm.get(
          'updateAccountBalance'
        ).value;

        await validateObjectForForm({
          classDto: CreateOrderDto,
          form: this.activityForm,
          ignoreFields: ['dataSource', 'date'],
          object: activity
        });

        if (activity.type === 'ITEM') {
          // Transform deprecated type ITEM
          activity.dataSource = 'MANUAL';
          activity.type = 'BUY';
        }

        this.dialogRef.close(activity);
      } else {
        (activity as UpdateOrderDto).id = this.data.activity?.id;

        await validateObjectForForm({
          classDto: UpdateOrderDto,
          form: this.activityForm,
          ignoreFields: ['dataSource', 'date'],
          object: activity as UpdateOrderDto
        });

        if (activity.type === 'ITEM') {
          // Transform deprecated type ITEM
          activity.dataSource = 'MANUAL';
          activity.type = 'BUY';
        }

        this.dialogRef.close(activity as UpdateOrderDto);
      }
    } catch (error) {
      console.error(error);
    }
  }

  public onTagsChanged(tags: Tag[]) {
    this.activityForm.get('tags').setValue(tags);
  }

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }

  private updateAssetProfile() {
    this.isLoading = true;
    this.changeDetectorRef.markForCheck();

    this.dataService
      .fetchSymbolItem({
        dataSource: this.activityForm.get('searchSymbol').value.dataSource,
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
        if (this.mode === 'create') {
          this.activityForm.get('currency').setValue(currency);
          this.activityForm.get('currencyOfUnitPrice').setValue(currency);
          this.activityForm.get('dataSource').setValue(dataSource);
        }

        this.currencyOfAssetProfile = currency;
        this.currentMarketPrice = marketPrice;

        this.isLoading = false;

        this.changeDetectorRef.markForCheck();
      });
  }
}
