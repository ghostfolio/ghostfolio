import { GfValueComponent } from '@ghostfolio/ui/value';

import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef
} from '@angular/material/dialog';
import { MatSliderModule } from '@angular/material/slider';

import { RuleSettingsDialogParams } from './interfaces/interfaces';

@Component({
  imports: [
    CommonModule,
    GfValueComponent,
    MatButtonModule,
    MatDialogModule,
    MatSliderModule,
    ReactiveFormsModule
  ],
  selector: 'gf-rule-settings-dialog',
  styleUrls: ['./rule-settings-dialog.scss'],
  templateUrl: './rule-settings-dialog.html'
})
export class GfRuleSettingsDialogComponent {
  public thresholdMaxFormControl = new FormControl<number>(
    this.data.settings.thresholdMax
  );
  public thresholdMinFormControl = new FormControl<number>(
    this.data.settings.thresholdMin
  );

  public constructor(
    @Inject(MAT_DIALOG_DATA) public data: RuleSettingsDialogParams,
    public dialogRef: MatDialogRef<GfRuleSettingsDialogComponent>
  ) {}

  public onSave() {
    this.dialogRef.close({
      thresholdMax: this.thresholdMaxFormControl.value,
      thresholdMin: this.thresholdMinFormControl.value
    });
  }
}
