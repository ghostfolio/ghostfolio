import { Clipboard } from '@angular/cdk/clipboard';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import ms from 'ms';

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
  private readonly snackBar = inject(MatSnackBar);

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

      this.snackBar.open(
        '✅ ' + $localize`The value has been copied to the clipboard`,
        undefined,
        {
          duration: ms('3 seconds')
        }
      );
    }
  }
}
