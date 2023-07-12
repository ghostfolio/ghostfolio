import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Inject,
  OnDestroy,
  OnInit
} from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
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
  public createAssetProfileForm: FormGroup;

  public constructor(
    public readonly adminService: AdminService,
    public readonly changeDetectorRef: ChangeDetectorRef,
    public readonly dialogRef: MatDialogRef<CreateAssetProfileDialog>,
    public readonly formBuilder: FormBuilder
  ) {}

  public ngOnInit() {
    this.createAssetProfileForm = this.formBuilder.group({
      searchSymbol: new FormControl(null, [Validators.required])
    });
  }

  public onCancel() {
    this.dialogRef.close();
  }

  public onSubmit() {
    this.dialogRef.close({
      dataSource:
        this.createAssetProfileForm.controls['searchSymbol'].value.dataSource,
      symbol: this.createAssetProfileForm.controls['searchSymbol'].value.symbol
    });
  }

  public ngOnDestroy() {}
}
