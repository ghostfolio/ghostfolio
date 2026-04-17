import { XRayRulesSettings } from '@ghostfolio/common/interfaces';
import { GfValueComponent } from '@ghostfolio/ui/value';

import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
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
    ReactiveFormsModule,
    GfValueComponent,
    MatButtonModule,
    MatDialogModule,
    MatSliderModule
  ],
  selector: 'gf-rule-settings-dialog',
  styleUrls: ['./rule-settings-dialog.scss'],
  templateUrl: './rule-settings-dialog.html'
})
export class GfRuleSettingsDialogComponent {
  public form: FormGroup;
  public settings: XRayRulesSettings['AccountClusterRiskCurrentInvestment'];

  public constructor(
    @Inject(MAT_DIALOG_DATA) public data: RuleSettingsDialogParams,
    public dialogRef: MatDialogRef<GfRuleSettingsDialogComponent>,
    private formBuilder: FormBuilder
  ) {
    this.form = this.formBuilder.group({
      thresholdMax: [this.data.settings?.thresholdMax],
      thresholdMin: [this.data.settings?.thresholdMin]
    });
  }

  public onSave() {
    this.dialogRef.close({
      ...this.data.settings,
      ...this.form.value
    });
  }
}
