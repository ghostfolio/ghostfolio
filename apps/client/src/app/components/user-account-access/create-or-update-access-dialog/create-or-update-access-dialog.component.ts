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
export class GfCreateOrUpdateAccessDialog implements OnInit, OnDestroy {
  public accessForm: FormGroup;
  public isEditMode: boolean;

  private unsubscribeSubject = new Subject<void>();

  public constructor(
    private changeDetectorRef: ChangeDetectorRef,
    @Inject(MAT_DIALOG_DATA) private data: CreateOrUpdateAccessDialogParams,
    public dialogRef: MatDialogRef<GfCreateOrUpdateAccessDialog>,
    private dataService: DataService,
    private formBuilder: FormBuilder,
    private notificationService: NotificationService
  ) {
    this.isEditMode = !!data.accessId;
  }

  public ngOnInit() {
    console.log('Dialog init - Edit mode:', this.isEditMode);
    console.log('Dialog data:', this.data);

    this.accessForm = this.formBuilder.group({
      alias: [this.data.access.alias],
      permissions: [this.data.access.permissions[0], Validators.required],
      type: [
        { value: this.data.access.type, disabled: this.isEditMode },
        Validators.required
      ],
      granteeUserId: [this.data.access.grantee, Validators.required]
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

    // Initial validation setup based on current type
    if (this.accessForm.get('type').value === 'PUBLIC') {
      const granteeUserIdControl = this.accessForm.get('granteeUserId');
      granteeUserIdControl.clearValidators();
      granteeUserIdControl.setValue(null);
      granteeUserIdControl.updateValueAndValidity();
    }
  }

  public onCancel() {
    this.dialogRef.close();
  }

  public async onSubmit() {
    if (!this.accessForm.valid) {
      console.error('Form is invalid:', this.accessForm.errors);
      return;
    }

    if (this.isEditMode) {
      await this.updateAccess();
    } else {
      await this.createAccess();
    }
  }

  private async createAccess() {
    console.log('Creating access...');
    const access: CreateAccessDto = {
      alias: this.accessForm.get('alias').value,
      granteeUserId: this.accessForm.get('granteeUserId').value,
      permissions: [this.accessForm.get('permissions').value]
    };

    console.log('Access data:', access);

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
    console.log('Updating access...');
    const access: UpdateAccessDto = {
      alias: this.accessForm.get('alias').value,
      granteeUserId: this.accessForm.get('granteeUserId').value,
      permissions: [this.accessForm.get('permissions').value]
    };

    console.log('Access data:', access);
    console.log('Access ID:', this.data.accessId);

    try {
      await validateObjectForForm({
        classDto: UpdateAccessDto,
        form: this.accessForm,
        object: access
      });

      this.dataService
        .putAccess(this.data.accessId, access)
        .pipe(
          catchError((error) => {
            if (error.status === StatusCodes.BAD_REQUEST) {
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

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }
}
