import { CreatePlatformDto } from '@ghostfolio/api/app/platform/create-platform.dto';
import { UpdatePlatformDto } from '@ghostfolio/api/app/platform/update-platform.dto';
import { validateObjectForForm } from '@ghostfolio/client/util/form.util';

import {
  ChangeDetectionStrategy,
  Component,
  Inject,
  OnDestroy
} from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Subject } from 'rxjs';

import { CreateOrUpdatePlatformDialogParams } from './interfaces/interfaces';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'h-100' },
  selector: 'gf-create-or-update-platform-dialog',
  styleUrls: ['./create-or-update-platform-dialog.scss'],
  templateUrl: 'create-or-update-platform-dialog.html',
  standalone: false
})
export class CreateOrUpdatePlatformDialog implements OnDestroy {
  public platformForm: FormGroup;

  private unsubscribeSubject = new Subject<void>();

  public constructor(
    @Inject(MAT_DIALOG_DATA) public data: CreateOrUpdatePlatformDialogParams,
    public dialogRef: MatDialogRef<CreateOrUpdatePlatformDialog>,
    private formBuilder: FormBuilder
  ) {
    this.platformForm = this.formBuilder.group({
      name: [this.data.platform.name, Validators.required],
      url: [this.data.platform.url ?? 'https://', Validators.required]
    });
  }

  public onCancel() {
    this.dialogRef.close();
  }

  public async onSubmit() {
    try {
      const platform: CreatePlatformDto | UpdatePlatformDto = {
        name: this.platformForm.get('name')?.value,
        url: this.platformForm.get('url')?.value
      };

      if (this.data.platform.id) {
        (platform as UpdatePlatformDto).id = this.data.platform.id;
        await validateObjectForForm({
          classDto: UpdatePlatformDto,
          form: this.platformForm,
          object: platform
        });
      } else {
        await validateObjectForForm({
          classDto: CreatePlatformDto,
          form: this.platformForm,
          object: platform
        });
      }

      this.dialogRef.close(platform);
    } catch (error) {
      console.error(error);
    }
  }

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }
}
