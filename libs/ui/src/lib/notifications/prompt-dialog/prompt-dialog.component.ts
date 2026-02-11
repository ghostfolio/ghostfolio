import { Component, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

import { PromptDialogParams } from './interfaces/interfaces';

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
  public defaultValue?: string;
  public discardLabel: string;
  public formControl = new FormControl('');
  public title: string;
  public valueLabel?: string;

  protected readonly dialogRef =
    inject<MatDialogRef<GfPromptDialogComponent>>(MatDialogRef);

  public initialize({
    confirmLabel,
    defaultValue,
    discardLabel,
    title,
    valueLabel
  }: PromptDialogParams) {
    this.confirmLabel = confirmLabel;
    this.defaultValue = defaultValue;
    this.discardLabel = discardLabel;
    this.formControl.setValue(defaultValue ?? null);
    this.title = title;
    this.valueLabel = valueLabel;
  }
}
