import {
  DEFAULT_CURRENCY,
  ghostfolioPrefix,
  PROPERTY_CURRENCIES
} from '@ghostfolio/common/config';
import type { AssetProfileIdentifier } from '@ghostfolio/common/interfaces';
import { AdminService, DataService } from '@ghostfolio/ui/services';
import { GfSymbolAutocompleteComponent } from '@ghostfolio/ui/symbol-autocomplete';

import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  inject,
  OnInit
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormBuilder,
  FormControl,
  FormsModule,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';
import { DataSource } from '@prisma/client';
import { isISO4217CurrencyCode } from 'class-validator';
import { switchMap } from 'rxjs';

import type {
  CreateAssetProfileDialogMode,
  CreateAssetProfileForm
} from './interfaces/interfaces';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'h-100' },
  imports: [
    FormsModule,
    GfSymbolAutocompleteComponent,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatRadioModule,
    ReactiveFormsModule
  ],
  selector: 'gf-create-asset-profile-dialog',
  styleUrls: ['./create-asset-profile-dialog.component.scss'],
  templateUrl: 'create-asset-profile-dialog.html'
})
export class GfCreateAssetProfileDialogComponent implements OnInit {
  protected createAssetProfileForm: CreateAssetProfileForm;
  protected readonly ghostfolioPrefix = `${ghostfolioPrefix}_`;
  protected mode: CreateAssetProfileDialogMode;

  private customCurrencies: string[];
  private dataSourceForExchangeRates: DataSource;

  private readonly adminService = inject(AdminService);
  private readonly changeDetectorRef = inject(ChangeDetectorRef);
  private readonly dataService = inject(DataService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly dialogRef =
    inject<MatDialogRef<GfCreateAssetProfileDialogComponent>>(MatDialogRef);
  private readonly formBuilder = inject(FormBuilder);

  protected get showCurrencyErrorMessage() {
    const addCurrencyFormControl =
      this.createAssetProfileForm.controls.addCurrency;

    if (addCurrencyFormControl.hasError('invalidCurrency')) {
      return true;
    }

    return false;
  }

  public ngOnInit() {
    this.initialize();

    this.createAssetProfileForm = this.formBuilder.group(
      {
        addCurrency: new FormControl<string | null>(null, [
          this.iso4217CurrencyCodeValidator()
        ]),
        addSymbol: new FormControl<string | null>(null, [Validators.required]),
        searchSymbol: new FormControl<AssetProfileIdentifier | null>(null, [
          Validators.required
        ])
      },
      {
        validators: this.atLeastOneValid
      }
    );

    this.mode = 'auto';
  }

  public onCancel() {
    this.dialogRef.close();
  }

  public onRadioChange(mode: CreateAssetProfileDialogMode) {
    this.createAssetProfileForm.reset();

    this.mode = mode;
  }

  public onSubmit() {
    if (this.mode === 'auto') {
      this.dialogRef.close({
        addAssetProfile: true,
        dataSource:
          this.createAssetProfileForm.controls.searchSymbol.value?.dataSource,
        symbol: this.createAssetProfileForm.controls.searchSymbol.value?.symbol
      });
    } else if (this.mode === 'currency') {
      const currency = this.createAssetProfileForm.controls.addCurrency.value;

      const currencies = Array.from(
        new Set([...this.customCurrencies, currency])
      ).sort();

      this.dataService
        .putAdminSetting(PROPERTY_CURRENCIES, {
          value: JSON.stringify(currencies)
        })
        .pipe(
          switchMap(() => {
            return this.adminService.gatherSymbol({
              dataSource: this.dataSourceForExchangeRates,
              symbol: `${DEFAULT_CURRENCY}${currency}`
            });
          }),
          takeUntilDestroyed(this.destroyRef)
        )
        .subscribe(() => {
          this.dialogRef.close({
            addAssetProfile: false,
            dataSource: this.dataSourceForExchangeRates,
            symbol: `${DEFAULT_CURRENCY}${currency}`
          });
        });
    } else if (this.mode === 'manual') {
      this.dialogRef.close({
        addAssetProfile: true,
        dataSource: 'MANUAL',
        symbol: `${this.ghostfolioPrefix}${this.createAssetProfileForm.controls.addSymbol.value}`
      });
    }
  }

  private atLeastOneValid(control: CreateAssetProfileForm): ValidationErrors {
    const addCurrencyControl = control.controls.addCurrency;
    const addSymbolControl = control.controls.addSymbol;
    const searchSymbolControl = control.controls.searchSymbol;

    if (
      addCurrencyControl.valid &&
      addSymbolControl.valid &&
      searchSymbolControl.valid
    ) {
      return { atLeastOneValid: true };
    }

    if (
      addCurrencyControl.valid ||
      addSymbolControl.valid ||
      searchSymbolControl.valid
    ) {
      return { atLeastOneValid: false };
    }

    return { atLeastOneValid: true };
  }

  private initialize() {
    this.adminService
      .fetchAdminData()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ dataProviders, settings }) => {
        this.customCurrencies = settings[PROPERTY_CURRENCIES] as string[];

        const { dataSource } =
          dataProviders.find(({ useForExchangeRates }) => {
            return useForExchangeRates;
          }) ?? {};

        if (dataSource) {
          this.dataSourceForExchangeRates = dataSource;
        }

        this.changeDetectorRef.markForCheck();
      });
  }

  private iso4217CurrencyCodeValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (
        control.value !== control.value?.toUpperCase() ||
        !isISO4217CurrencyCode(control.value)
      ) {
        return { invalidCurrency: true };
      }

      return null;
    };
  }
}
