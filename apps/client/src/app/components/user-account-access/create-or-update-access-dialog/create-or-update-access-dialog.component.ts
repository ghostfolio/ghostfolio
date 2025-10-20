import { CreateAccessDto } from '@ghostfolio/api/app/access/create-access.dto';
import { UpdateAccessDto } from '@ghostfolio/api/app/access/update-access.dto';
import { NotificationService } from '@ghostfolio/client/core/notification/notification.service';
import { DataService } from '@ghostfolio/client/services/data.service';
import { validateObjectForForm } from '@ghostfolio/client/util/form.util';

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
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { StatusCodes } from 'http-status-codes';
import { EMPTY, Subject, catchError, takeUntil } from 'rxjs';

import { CreateOrUpdateAccessDialogParams } from './interfaces/interfaces';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'h-100' },
  imports: [
    FormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    ReactiveFormsModule
  ],
  selector: 'gf-create-or-update-access-dialog',
  styleUrls: ['./create-or-update-access-dialog.scss'],
  templateUrl: 'create-or-update-access-dialog.html'
})
export class GfCreateOrUpdateAccessDialogComponent
  implements OnDestroy, OnInit
{
  public accessForm: FormGroup;
  public mode: 'create' | 'update';

  private unsubscribeSubject = new Subject<void>();

  public constructor(
    private changeDetectorRef: ChangeDetectorRef,
    @Inject(MAT_DIALOG_DATA) private data: CreateOrUpdateAccessDialogParams,
    public dialogRef: MatDialogRef<GfCreateOrUpdateAccessDialogComponent>,
    private dataService: DataService,
    private formBuilder: FormBuilder,
    private notificationService: NotificationService
  ) {
    this.mode = this.data.access?.id ? 'update' : 'create';
  }

  public ngOnInit() {
    const isPublic = this.data.access.type === 'PUBLIC';

    this.accessForm = this.formBuilder.group({
      alias: [this.data.access.alias],
      granteeUserId: [
        this.data.access.grantee,
        isPublic ? null : Validators.required
      ],
      permissions: [this.data.access.permissions[0], Validators.required],
      type: [
        { disabled: this.mode === 'update', value: this.data.access.type },
        Validators.required
      ]
    });

    this.accessForm.get('type').valueChanges.subscribe((accessType) => {
      const granteeUserIdControl = this.accessForm.get('granteeUserId');
      const permissionsControl = this.accessForm.get('permissions');

      if (accessType === 'PRIVATE') {
        granteeUserIdControl.setValidators(Validators.required);
      } else {
        granteeUserIdControl.clearValidators();
        granteeUserIdControl.setValue(null);
        permissionsControl.setValue(this.data.access.permissions[0]);
      }

      granteeUserIdControl.updateValueAndValidity();

      this.changeDetectorRef.markForCheck();
    });
  }

  public onCancel() {
    this.dialogRef.close();
  }

  public async onSubmit() {
    if (this.mode === 'create') {
      await this.createAccess();
    } else {
      await this.updateAccess();
    }
  }

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }

  private async createAccess() {
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

  private async updateAccess() {
    const access: UpdateAccessDto = {
      alias: this.accessForm.get('alias').value,
      granteeUserId: this.accessForm.get('granteeUserId').value,
      id: this.data.access.id,
      permissions: [this.accessForm.get('permissions').value]
    };

    try {
      await validateObjectForForm({
        classDto: UpdateAccessDto,
        form: this.accessForm,
        object: access
      });

      this.dataService
        .putAccess(access)
        .pipe(
          catchError(({ status }) => {
            if (status.status === StatusCodes.BAD_REQUEST) {
              this.notificationService.alert({
                title: $localize`Oops! Could not update access.`
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
}
