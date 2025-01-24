import { CommonModule } from '@angular/common';
import { Component, HostListener } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';

import { ConfirmationDialogType } from './confirmation-dialog.type';
import { IConfirmDialogParams } from './interfaces/interfaces';

@Component({
  imports: [CommonModule, MatButtonModule, MatDialogModule],
  selector: 'gf-confirmation-dialog',
  styleUrls: ['./confirmation-dialog.scss'],
  templateUrl: './confirmation-dialog.html'
})
export class GfConfirmationDialogComponent {
  public confirmLabel: string;
  public confirmType: ConfirmationDialogType;
  public discardLabel: string;
  public message: string;
  public title: string;

  public constructor(
    public dialogRef: MatDialogRef<GfConfirmationDialogComponent>
  ) {}

  @HostListener('window:keyup', ['$event'])
  public keyEvent(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      this.dialogRef.close('confirm');
    }
  }

  public initialize(aParams: IConfirmDialogParams) {
    this.confirmLabel = aParams.confirmLabel;
    this.confirmType = aParams.confirmType;
    this.discardLabel = aParams.discardLabel;
    this.message = aParams.message;
    this.title = aParams.title;
  }
}
