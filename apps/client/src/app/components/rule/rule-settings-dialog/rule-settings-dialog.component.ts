import { XRayRulesSettings } from '@ghostfolio/common/interfaces';
import { GfValueComponent } from '@ghostfolio/ui/value';

import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { RuleSettingsDialogInput } from './interfaces';

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
  public settingsForm: FormGroup;

  public constructor(
    @Inject(MAT_DIALOG_DATA) public data: RuleSettingsDialogInput,
    public dialogRef: MatDialogRef<GfRuleSettingsDialogComponent>
  ) {
    this.settingsForm = new FormGroup({
      thresholdMin: new FormControl(data.settings?.thresholdMin ?? null),
      thresholdMax: new FormControl(data.settings?.thresholdMax ?? null)
    });
  }

  public get updatedSettings(): XRayRulesSettings {
    return {
      ...this.data.settings,
      ...(this.settingsForm.value as Partial<XRayRulesSettings>)
    };
  }
}
