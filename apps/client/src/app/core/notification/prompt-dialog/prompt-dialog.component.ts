import { Component } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

@Component({
  imports: [
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    ReactiveFormsModule
  ],
  selector: 'gf-prompt-dialog',
  templateUrl: './prompt-dialog.html'
})
export class GfPromptDialogComponent {
  public confirmLabel: string;
  public defaultValue: string;
  public discardLabel: string;
  public formControl = new FormControl('');
  public title: string;
  public valueLabel: string;

  public constructor(public dialogRef: MatDialogRef<GfPromptDialogComponent>) {}

  public initialize(aParams: {
    confirmLabel?: string;
    defaultValue?: string;
    discardLabel?: string;
    title: string;
    valueLabel?: string;
  }) {
    this.confirmLabel = aParams.confirmLabel;
    this.defaultValue = aParams.defaultValue;
    this.discardLabel = aParams.discardLabel;
    this.formControl.setValue(aParams.defaultValue);
    this.title = aParams.title;
    this.valueLabel = aParams.valueLabel;
  }
}
