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
  ValidatorFn,
  Validators
} from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { CreateAssetProfileDialogParams } from '@ghostfolio/client/components/admin-market-data/create-asset-profile-dialog/interfaces/interfaces';
import { AdminService } from '@ghostfolio/client/services/admin.service';
import { AdminMarketDataItem } from '@ghostfolio/common/interfaces';

@Component({
  host: { class: 'h-100' },
  selector: 'gf-create-asset-profile-dialog',
  templateUrl: 'create-asset-profile-dialog.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CreateAssetProfileDialog implements OnInit, OnDestroy {
  public createAssetProfileForm: FormGroup;

  public constructor(
    public readonly adminService: AdminService,
    public readonly changeDetectorRef: ChangeDetectorRef,
    public readonly dialogRef: MatDialogRef<CreateAssetProfileDialog>,
    public readonly formBuilder: FormBuilder
  ) {}

  ngOnInit() {
    this.createAssetProfileForm = this.formBuilder.group({
      searchSymbol: new FormControl(null, [Validators.required])
    });
  }

  ngOnDestroy(): void {}

  onSubmit() {
    this.dialogRef.close({
      dataSource:
        this.createAssetProfileForm.controls['searchSymbol'].value.dataSource,
      symbol: this.createAssetProfileForm.controls['searchSymbol'].value.symbol
    });
  }

  onCancel() {
    this.dialogRef.close();
  }
}
