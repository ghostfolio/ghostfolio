import { CreateTagDto } from '@ghostfolio/api/app/tag/create-tag.dto';
import { UpdateTagDto } from '@ghostfolio/api/app/tag/update-tag.dto';
import { validateObjectForForm } from '@ghostfolio/client/util/form.util';

import {
  ChangeDetectionStrategy,
  Component,
  Inject,
  OnDestroy
} from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Subject } from 'rxjs';

import { CreateOrUpdateTagDialogParams } from './interfaces/interfaces';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'h-100' },
  selector: 'gf-create-or-update-tag-dialog',
  styleUrls: ['./create-or-update-tag-dialog.scss'],
  templateUrl: 'create-or-update-tag-dialog.html'
})
export class CreateOrUpdateTagDialog implements OnDestroy {
  public tagForm: FormGroup;

  private unsubscribeSubject = new Subject<void>();

  public constructor(
    @Inject(MAT_DIALOG_DATA) public data: CreateOrUpdateTagDialogParams,
    public dialogRef: MatDialogRef<CreateOrUpdateTagDialog>,
    private formBuilder: FormBuilder
  ) {
    this.tagForm = this.formBuilder.group({
      name: [this.data.tag.name]
    });
  }

  public onCancel() {
    this.dialogRef.close();
  }

  public async onSubmit() {
    try {
      const tag: CreateTagDto | UpdateTagDto = {
        name: this.tagForm.get('name')?.value
      };

      if (this.data.tag.id) {
        (tag as UpdateTagDto).id = this.data.tag.id;
        await validateObjectForForm({
          classDto: UpdateTagDto,
          form: this.tagForm,
          object: tag
        });
      } else {
        await validateObjectForForm({
          classDto: CreateTagDto,
          form: this.tagForm,
          object: tag
        });
      }

      this.dialogRef.close(tag);
    } catch (error) {
      console.error(error);
    }
  }

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }
}
