import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';

import { AlertDialogParams } from './interfaces/interfaces';

@Component({
  imports: [MatButtonModule, MatDialogModule],
  selector: 'gf-alert-dialog',
  styleUrls: ['./alert-dialog.scss'],
  templateUrl: './alert-dialog.html'
})
export class GfAlertDialogComponent {
  public discardLabel: string;
  public message?: string;
  public title: string;

  protected readonly dialogRef =
    inject<MatDialogRef<GfAlertDialogComponent>>(MatDialogRef);

  public initialize({ discardLabel, message, title }: AlertDialogParams) {
    this.discardLabel = discardLabel;
    this.message = message;
    this.title = title;
  }
}
