import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Inject,
  OnDestroy
} from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { CreateAccessDto } from '@ghostfolio/api/app/access/create-access.dto';
import { DataService } from '@ghostfolio/client/services/data.service';
import { StatusCodes } from 'http-status-codes';
import { EMPTY, Subject, catchError, takeUntil } from 'rxjs';

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
    private changeDetectorRef: ChangeDetectorRef,
    @Inject(MAT_DIALOG_DATA) public data: CreateOrUpdateAccessDialogParams,
    public dialogRef: MatDialogRef<CreateOrUpdateAccessDialog>,
    private dataService: DataService,
    private formBuilder: FormBuilder
  ) {}

  ngOnInit() {
    this.accessForm = this.formBuilder.group({
      alias: [this.data.access.alias],
      type: [this.data.access.type, Validators.required],
      userId: [this.data.access.grantee, Validators.required]
    });

    this.accessForm.get('type').valueChanges.subscribe((value) => {
      const userIdControl = this.accessForm.get('userId');

      if (value === 'PRIVATE') {
        userIdControl.setValidators(Validators.required);
      } else {
        userIdControl.clearValidators();
      }

      userIdControl.updateValueAndValidity();

      this.changeDetectorRef.markForCheck();
    });
  }

  public onCancel() {
    this.dialogRef.close();
  }

  public onSubmit() {
    const access: CreateAccessDto = {
      alias: this.accessForm.controls['alias'].value,
      granteeUserId: this.accessForm.controls['userId'].value,
      type: this.accessForm.controls['type'].value
    };

    this.dataService
      .postAccess(access)
      .pipe(
        catchError((error) => {
          if (error.status === StatusCodes.BAD_REQUEST) {
            alert($localize`Oops! Could not grant access.`);
          }

          return EMPTY;
        }),
        takeUntil(this.unsubscribeSubject)
      )
      .subscribe(() => {
        this.dialogRef.close({ access });
      });
  }

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }
}
