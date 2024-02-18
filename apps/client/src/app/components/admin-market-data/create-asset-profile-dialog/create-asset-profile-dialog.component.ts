import { AdminService } from '@ghostfolio/client/services/admin.service';

import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit
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

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'h-100' },
  selector: 'gf-create-asset-profile-dialog',
  styleUrls: ['./create-asset-profile-dialog.component.scss'],
  templateUrl: 'create-asset-profile-dialog.html'
})
export class CreateAssetProfileDialog implements OnInit, OnDestroy {
  public createAssetProfileForm: FormGroup;
  public mode: 'auto' | 'manual';

  public constructor(
    public readonly adminService: AdminService,
    public readonly dialogRef: MatDialogRef<CreateAssetProfileDialog>,
    public readonly formBuilder: FormBuilder
  ) {}

  public ngOnInit() {
    this.createAssetProfileForm = this.formBuilder.group(
      {
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

  public onRadioChange(mode: 'auto' | 'manual') {
    this.mode = mode;
  }

  public onSubmit() {
    this.mode === 'auto'
      ? this.dialogRef.close({
          dataSource:
            this.createAssetProfileForm.controls['searchSymbol'].value
              .dataSource,
          symbol:
            this.createAssetProfileForm.controls['searchSymbol'].value.symbol
        })
      : this.dialogRef.close({
          dataSource: 'MANUAL',
          symbol: this.createAssetProfileForm.controls['addSymbol'].value
        });
  }

  public ngOnDestroy() {}

  private atLeastOneValid(control: AbstractControl): ValidationErrors {
    const addSymbolControl = control.get('addSymbol');
    const searchSymbolControl = control.get('searchSymbol');

    if (addSymbolControl.valid && searchSymbolControl.valid) {
      return { atLeastOneValid: true };
    }

    if (
      addSymbolControl.valid ||
      !addSymbolControl ||
      searchSymbolControl.valid ||
      !searchSymbolControl
    ) {
      return { atLeastOneValid: false };
    }

    return { atLeastOneValid: true };
  }
}
