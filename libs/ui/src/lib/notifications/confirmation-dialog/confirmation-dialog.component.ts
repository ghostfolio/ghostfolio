import { ConfirmationDialogType } from '@ghostfolio/common/enums';

import { Component, HostListener, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';

import { ConfirmDialogParams } from './interfaces/interfaces';

@Component({
  imports: [MatButtonModule, MatDialogModule],
  selector: 'gf-confirmation-dialog',
  styleUrls: ['./confirmation-dialog.scss'],
  templateUrl: './confirmation-dialog.html'
})
export class GfConfirmationDialogComponent {
  public confirmLabel: string;
  public confirmType: ConfirmationDialogType;
  public discardLabel: string;
  public message?: string;
  public title: string;

  protected readonly dialogRef =
    inject<MatDialogRef<GfConfirmationDialogComponent>>(MatDialogRef);

  @HostListener('window:keyup', ['$event'])
  public keyEvent(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      this.dialogRef.close('confirm');
    }
  }

  public initialize({
    confirmLabel,
    confirmType,
    discardLabel,
    message,
    title
  }: ConfirmDialogParams) {
    this.confirmLabel = confirmLabel;
    this.confirmType = confirmType;
    this.discardLabel = discardLabel;
    this.message = message;
    this.title = title;
  }
}
