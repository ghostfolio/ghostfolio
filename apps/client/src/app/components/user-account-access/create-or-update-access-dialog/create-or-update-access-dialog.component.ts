import {
  ChangeDetectionStrategy,
  Component,
  Inject,
  OnDestroy
} from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { CreateAccessDto } from '@ghostfolio/api/app/access/create-access.dto';
import { Subject } from 'rxjs';

import { CreateOrUpdateAccessDialogParams } from './interfaces/interfaces';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'h-100' },
  selector: 'gf-create-or-update-access-dialog',
  styleUrls: ['./create-or-update-access-dialog.scss'],
  templateUrl: 'create-or-update-access-dialog.html'
})
export class CreateOrUpdateAccessDialog implements OnDestroy {
  public accessForm: FormGroup;

  private unsubscribeSubject = new Subject<void>();

  public constructor(
    @Inject(MAT_DIALOG_DATA) public data: CreateOrUpdateAccessDialogParams,
    public dialogRef: MatDialogRef<CreateOrUpdateAccessDialog>,
    private formBuilder: FormBuilder
  ) {}

  ngOnInit() {
    this.accessForm = this.formBuilder.group({
      alias: [this.data.access.alias],
      type: [this.data.access.type, Validators.required]
    });
  }

  public onCancel() {
    this.dialogRef.close();
  }

  public onSubmit() {
    const access: CreateAccessDto = {
      alias: this.accessForm.controls['alias'].value,
      type: this.accessForm.controls['type'].value
    };

    this.dialogRef.close({ access });
  }

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }
}
