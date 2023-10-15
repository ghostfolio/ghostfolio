import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Inject,
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
import { AdminService } from '@ghostfolio/client/services/admin.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'h-100' },
  selector: 'gf-create-asset-profile-dialog',
  templateUrl: 'create-asset-profile-dialog.html'
})
export class CreateAssetProfileDialog implements OnInit, OnDestroy {
  private atLeastOneValid = (control: AbstractControl): ValidationErrors | null => {
    const addSymbolControl = control.get('addSymbol');
    const searchSymbolControl = control.get('searchSymbol');
  
    if (addSymbolControl.valid && searchSymbolControl.valid) {
      return { atLeastOneValid: true };
    }
  
    if (
      !searchSymbolControl ||
      !addSymbolControl ||
      searchSymbolControl.valid ||
      addSymbolControl.valid
    ) {
      return  { atLeastOneValid: false };
    }
  
    return { atLeastOneValid: true };
  };

  public createAssetProfileForm: FormGroup;
  public selectedOption: string;

  public constructor(
    public readonly adminService: AdminService,
    public readonly changeDetectorRef: ChangeDetectorRef,
    public readonly dialogRef: MatDialogRef<CreateAssetProfileDialog>,
    public readonly formBuilder: FormBuilder
  ) {}

  public ngOnInit() {
    this.createAssetProfileForm = this.formBuilder.group(
      {
        searchSymbol: new FormControl(null, [Validators.required]),
        addSymbol: new FormControl(null, [Validators.required])
      },
      {
        validators: this.atLeastOneValid
      }
    );

    this.selectedOption = 'auto';
  }

  public onCancel() {
    this.dialogRef.close();
  }

  public onRadioChange(option: string) {
    this.selectedOption = option;
  }

  public onSubmit() {
    this.selectedOption === 'auto'
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
}


