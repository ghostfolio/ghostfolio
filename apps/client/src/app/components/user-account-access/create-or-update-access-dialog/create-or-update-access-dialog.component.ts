import { CreateAccessDto } from '@ghostfolio/api/app/access/create-access.dto';
import { NotificationService } from '@ghostfolio/client/core/notification/notification.service';
import { DataService } from '@ghostfolio/client/services/data.service';
import { validateObjectForForm } from '@ghostfolio/client/util/form.util';

import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Inject,
  OnDestroy
} from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
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
    @Inject(MAT_DIALOG_DATA) private data: CreateOrUpdateAccessDialogParams,
    public dialogRef: MatDialogRef<CreateOrUpdateAccessDialog>,
    private dataService: DataService,
    private formBuilder: FormBuilder,
    private notificationService: NotificationService
  ) {}

  ngOnInit() {
    this.accessForm = this.formBuilder.group({
      alias: [this.data.access.alias],
      permissions: [this.data.access.permissions[0], Validators.required],
      type: [this.data.access.type, Validators.required],
      granteeUserId: [this.data.access.grantee, Validators.required]
    });

    this.accessForm.get('type').valueChanges.subscribe((accessType) => {
      const granteeUserIdControl = this.accessForm.get('granteeUserId');
      const permissionsControl = this.accessForm.get('permissions');

      if (accessType === 'PRIVATE') {
        granteeUserIdControl.setValidators(Validators.required);
        permissionsControl.setValidators(Validators.required);
      } else {
        granteeUserIdControl.clearValidators();
      }

      granteeUserIdControl.updateValueAndValidity();
      permissionsControl.updateValueAndValidity();

      this.changeDetectorRef.markForCheck();
    });
  }

  public onCancel() {
    this.dialogRef.close();
  }

  public async onSubmit() {
    const access: CreateAccessDto = {
      alias: this.accessForm.get('alias').value,
      granteeUserId: this.accessForm.get('granteeUserId').value,
      permissions: [this.accessForm.get('permissions').value]
    };

    try {
      await validateObjectForForm({
        classDto: CreateAccessDto,
        form: this.accessForm,
        object: access
      });

      this.dataService
        .postAccess(access)
        .pipe(
          catchError((error) => {
            if (error.status === StatusCodes.BAD_REQUEST) {
              this.notificationService.alert({
                title: $localize`Oops! Could not grant access.`
              });
            }

            return EMPTY;
          }),
          takeUntil(this.unsubscribeSubject)
        )
        .subscribe(() => {
          this.dialogRef.close(access);
        });
    } catch (error) {
      console.error(error);
    }
  }

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }
}
