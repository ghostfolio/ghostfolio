import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';

import { IAlertDialogParams } from './interfaces/interfaces';

@Component({
  imports: [MatButtonModule, MatDialogModule],
  selector: 'gf-alert-dialog',
  styleUrls: ['./alert-dialog.scss'],
  templateUrl: './alert-dialog.html'
})
export class GfAlertDialogComponent {
  public discardLabel: string;
  public message: string;
  public title: string;

  public constructor(public dialogRef: MatDialogRef<GfAlertDialogComponent>) {}

  public initialize(aParams: IAlertDialogParams) {
    this.discardLabel = aParams.discardLabel;
    this.message = aParams.message;
    this.title = aParams.title;
  }
}
