import { NotificationService } from '@ghostfolio/client/core/notification/notification.service';
import { AdminService } from '@ghostfolio/client/services/admin.service';
import { DataService } from '@ghostfolio/client/services/data.service';
import { PROPERTY_CURRENCIES } from '@ghostfolio/common/config';

import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  ViewEncapsulation
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
import { Router } from '@angular/router';
import { uniq } from 'lodash';
import { Subject, takeUntil } from 'rxjs';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'h-100' },
  selector: 'gf-create-asset-profile-dialog',
  styleUrls: ['./create-asset-profile-dialog.component.scss'],
  templateUrl: 'create-asset-profile-dialog.html',
  encapsulation: ViewEncapsulation.None
})
export class CreateAssetProfileDialog implements OnInit, OnDestroy {
  public createAssetProfileForm: FormGroup;
  public mode: 'auto' | 'manual' | 'currency';
  public customCurrencies: string[];

  private unsubscribeSubject = new Subject<void>();

  public constructor(
    public readonly adminService: AdminService,
    public readonly dialogRef: MatDialogRef<CreateAssetProfileDialog>,
    public readonly formBuilder: FormBuilder,
    private dataService: DataService,
    private notificationService: NotificationService,
    private router: Router
  ) {}

  public ngOnInit() {
    this.fetchAdminData();
    this.createAssetProfileForm = this.formBuilder.group(
      {
        addSymbol: new FormControl(null, [Validators.required]),
        searchSymbol: new FormControl(null, [Validators.required]),
        addCurrency: new FormControl(null, [Validators.required])
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

  public onRadioChange(mode: 'auto' | 'manual' | 'currency') {
    this.mode = mode;
  }

  public onSubmit() {
    if (this.mode === 'auto') {
      this.dialogRef.close({
        dataSource:
          this.createAssetProfileForm.get('searchSymbol').value.dataSource,
        symbol: this.createAssetProfileForm.get('searchSymbol').value.symbol
      });
    } else if (this.mode === 'manual') {
      this.dialogRef.close({
        dataSource: 'MANUAL',
        symbol: this.createAssetProfileForm.get('addSymbol').value
      });
    } else {
      const currency = this.createAssetProfileForm.get('addCurrency').value;
      if (currency.length === 3) {
        const currencies = uniq([...this.customCurrencies, currency]);
        this.putAdminSetting({ key: PROPERTY_CURRENCIES, value: currencies });
        this.dialogRef.close();
        this.notificationService.alert({
          title: $localize`Currency added successfully!`
        });
      } else {
        this.notificationService.alert({
          title: $localize`${currency} is an invalid currency!`
        });
      }
    }
  }

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }

  private atLeastOneValid(control: AbstractControl): ValidationErrors {
    const addSymbolControl = control.get('addSymbol');
    const searchSymbolControl = control.get('searchSymbol');
    const addCurrencyControl = control.get('addCurrency');

    if (
      addSymbolControl.valid &&
      searchSymbolControl.valid &&
      addCurrencyControl.valid
    ) {
      return { atLeastOneValid: true };
    }

    if (
      addSymbolControl.valid ||
      !addSymbolControl ||
      searchSymbolControl.valid ||
      !searchSymbolControl ||
      addCurrencyControl.valid ||
      !addCurrencyControl
    ) {
      return { atLeastOneValid: false };
    }

    return { atLeastOneValid: true };
  }

  private fetchAdminData() {
    this.adminService
      .fetchAdminData()
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe(({ settings }) => {
        this.customCurrencies = settings[PROPERTY_CURRENCIES] as string[];
      });
  }

  private putAdminSetting({ key, value }: { key: string; value: any }) {
    this.dataService
      .putAdminSetting(key, {
        value: value || value === false ? JSON.stringify(value) : undefined
      })
      .pipe(takeUntil(this.unsubscribeSubject));
  }
}
