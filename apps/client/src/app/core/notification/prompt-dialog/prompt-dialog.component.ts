import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

@Component({
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule
  ],
  selector: 'gf-prompt-dialog',
  standalone: true,
  templateUrl: './prompt-dialog.html'
})
export class GfPromptDialogComponent {
  public confirmLabel: string;
  public defaultValue: string;
  public discardLabel: string;
  public title: string;
  public value: string;
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
    this.title = aParams.title;
    this.valueLabel = aParams.valueLabel;
    this.value = this.defaultValue;
  }
}
