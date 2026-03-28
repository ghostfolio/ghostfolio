import { XRayRulesSettings } from '@ghostfolio/common/interfaces';
import { GfValueComponent } from '@ghostfolio/ui/value';

import { CommonModule } from '@angular/common';
import { Component, Inject, OnInit } from '@angular/core';
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
export class GfRuleSettingsDialogComponent implements OnInit {
  public settings: XRayRulesSettings['AccountClusterRiskCurrentInvestment'];
  public thresholdMaxControl: FormControl<number>;
  public thresholdMinControl: FormControl<number>;

  public constructor(
    @Inject(MAT_DIALOG_DATA) public data: RuleSettingsDialogParams,
    public dialogRef: MatDialogRef<GfRuleSettingsDialogComponent>
  ) {}

  public get isDirty(): boolean {
    return this.thresholdMinControl.dirty || this.thresholdMaxControl.dirty;
  }

  public ngOnInit() {
    this.thresholdMinControl = new FormControl<number>(
      this.data.settings.thresholdMin,
      { nonNullable: true }
    );

    this.thresholdMaxControl = new FormControl<number>(
      this.data.settings.thresholdMax,
      { nonNullable: true }
    );
  }

  public onSave() {
    this.dialogRef.close({
      ...this.data.settings,
      thresholdMax: this.thresholdMaxControl.value,
      thresholdMin: this.thresholdMinControl.value
    });
  }
}
