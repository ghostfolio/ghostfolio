import { AdminService } from '@ghostfolio/client/services/admin.service';
import { DataService } from '@ghostfolio/client/services/data.service';
import { PROPERTY_CURRENCIES } from '@ghostfolio/common/config';

import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy
} from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormControl,
  FormGroup,
  ValidationErrors,
  Validators
} from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { uniq } from 'lodash';
import { Subject, takeUntil } from 'rxjs';

import { CreateAssetProfileDialogMode } from './interfaces/interfaces';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'h-100' },
  selector: 'gf-create-asset-profile-dialog',
  styleUrls: ['./create-asset-profile-dialog.component.scss'],
  templateUrl: 'create-asset-profile-dialog.html'
})
export class CreateAssetProfileDialog implements  OnDestroy {
  public createAssetProfileForm: FormGroup;
  public mode: CreateAssetProfileDialogMode;

  private customCurrencies: string[];
  private unsubscribeSubject = new Subject<void>();

  public constructor(
    public readonly adminService: AdminService,
    private readonly changeDetectorRef: ChangeDetectorRef,
    private readonly dataService: DataService,
    public readonly dialogRef: MatDialogRef<CreateAssetProfileDialog>,
    public readonly formBuilder: FormBuilder
  ) {}

  public ngOnInit() {
    this.initializeCustomCurrencies();

    this.createAssetProfileForm = this.formBuilder.group(
      {
        addCurrency: new FormControl(null, [
          Validators.maxLength(3),
          Validators.minLength(3),
          Validators.required
        ]),
        addSymbol: new FormControl(null, [Validators.required]),
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
      const currency = this.createAssetProfileForm
        .get('addCurrency')
        .value.toUpperCase();

      const currencies = uniq([...this.customCurrencies, currency]);

      this.dataService
        .putAdminSetting(PROPERTY_CURRENCIES, {
          value: JSON.stringify(currencies)
        })
        .pipe(takeUntil(this.unsubscribeSubject))
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

    if (
      addCurrencyFormControl.hasError('maxlength') ||
      addCurrencyFormControl.hasError('minlength')
    ) {
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

  private initializeCustomCurrencies() {
    this.adminService
      .fetchAdminData()
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe(({ settings }) => {
        this.customCurrencies = settings[PROPERTY_CURRENCIES] as string[];

        this.changeDetectorRef.markForCheck();
      });
  }
}
