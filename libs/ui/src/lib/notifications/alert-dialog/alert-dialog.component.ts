import { Clipboard } from '@angular/cdk/clipboard';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';

import { AlertDialogParams } from './interfaces/interfaces';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatButtonModule, MatDialogModule],
  selector: 'gf-alert-dialog',
  styleUrls: ['./alert-dialog.scss'],
  templateUrl: './alert-dialog.html'
})
export class GfAlertDialogComponent {
  public copyValue?: string;
  public discardLabel: string;
  public message?: string;
  public title: string;

  protected readonly dialogRef =
    inject<MatDialogRef<GfAlertDialogComponent>>(MatDialogRef);

  private readonly clipboard = inject(Clipboard);

  public initialize({
    copyValue,
    discardLabel,
    message,
    title
  }: AlertDialogParams) {
    this.copyValue = copyValue;
    this.discardLabel = discardLabel;
    this.message = message;
    this.title = title;
  }

  public onCopyToClipboard() {
    if (this.copyValue) {
      this.clipboard.copy(this.copyValue);
    }

    this.dialogRef.close('copy');
  }
}
