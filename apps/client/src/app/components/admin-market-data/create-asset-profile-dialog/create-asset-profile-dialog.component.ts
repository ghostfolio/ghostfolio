import { AdminService } from '@ghostfolio/client/services/admin.service';
import { DataService } from '@ghostfolio/client/services/data.service';
import {
  DEFAULT_CURRENCY,
  ghostfolioPrefix,
  PROPERTY_CURRENCIES
} from '@ghostfolio/common/config';
import { GfSymbolAutocompleteComponent } from '@ghostfolio/ui/symbol-autocomplete';

import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit
} from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormControl,
  FormGroup,
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
import { Subject, switchMap, takeUntil } from 'rxjs';

import { CreateAssetProfileDialogMode } from './interfaces/interfaces';

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
export class GfCreateAssetProfileDialogComponent implements OnInit, OnDestroy {
  public createAssetProfileForm: FormGroup;
  public mode: CreateAssetProfileDialogMode;

  private customCurrencies: string[];
  private dataSourceForExchangeRates: DataSource;
  private unsubscribeSubject = new Subject<void>();

  public constructor(
    public readonly adminService: AdminService,
    private readonly changeDetectorRef: ChangeDetectorRef,
    private readonly dataService: DataService,
    public readonly dialogRef: MatDialogRef<GfCreateAssetProfileDialogComponent>,
    public readonly formBuilder: FormBuilder
  ) {}

  public ngOnInit() {
    this.initialize();

    this.createAssetProfileForm = this.formBuilder.group(
      {
        addCurrency: new FormControl(null, [
          this.iso4217CurrencyCodeValidator()
        ]),
        addSymbol: new FormControl(`${ghostfolioPrefix}_`, [
          Validators.required
        ]),
        searchSymbol: new FormControl(null, [Validators.required])
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
    this.mode = mode;
  }

  public onSubmit() {
    if (this.mode === 'auto') {
      this.dialogRef.close({
        dataSource:
          this.createAssetProfileForm.get('searchSymbol').value.dataSource,
        symbol: this.createAssetProfileForm.get('searchSymbol').value.symbol
      });
    } else if (this.mode === 'currency') {
      const currency = (
        this.createAssetProfileForm.get('addCurrency').value as string
      ).toUpperCase();

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
          takeUntil(this.unsubscribeSubject)
        )
        .subscribe(() => {
          this.dialogRef.close();
        });
    } else if (this.mode === 'manual') {
      this.dialogRef.close({
        dataSource: 'MANUAL',
        symbol: this.createAssetProfileForm.get('addSymbol').value
      });
    }
  }

  public get showCurrencyErrorMessage() {
    const addCurrencyFormControl =
      this.createAssetProfileForm.get('addCurrency');

    if (addCurrencyFormControl.hasError('invalidCurrency')) {
      return true;
    }

    return false;
  }

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }

  private atLeastOneValid(control: AbstractControl): ValidationErrors {
    const addCurrencyControl = control.get('addCurrency');
    const addSymbolControl = control.get('addSymbol');
    const searchSymbolControl = control.get('searchSymbol');

    if (
      addCurrencyControl.valid &&
      addSymbolControl.valid &&
      searchSymbolControl.valid
    ) {
      return { atLeastOneValid: true };
    }

    if (
      addCurrencyControl.valid ||
      !addCurrencyControl ||
      addSymbolControl.valid ||
      !addSymbolControl ||
      searchSymbolControl.valid ||
      !searchSymbolControl
    ) {
      return { atLeastOneValid: false };
    }

    return { atLeastOneValid: true };
  }

  private initialize() {
    this.adminService
      .fetchAdminData()
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe(({ dataProviders, settings }) => {
        this.customCurrencies = settings[PROPERTY_CURRENCIES] as string[];

        const { dataSource } = dataProviders.find(({ useForExchangeRates }) => {
          return useForExchangeRates;
        });

        this.dataSourceForExchangeRates = dataSource;

        this.changeDetectorRef.markForCheck();
      });
  }

  private iso4217CurrencyCodeValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!isISO4217CurrencyCode(control.value?.toUpperCase())) {
        return { invalidCurrency: true };
      }

      return null;
    };
  }
}
