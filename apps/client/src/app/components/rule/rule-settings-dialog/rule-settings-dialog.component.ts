import { XRayRulesSettings } from '@ghostfolio/common/interfaces';
import { GfValueComponent } from '@ghostfolio/ui/value';

import { CommonModule } from '@angular/common';
import { Component, Inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
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
    FormsModule,
    GfValueComponent,
    MatButtonModule,
    MatDialogModule,
    MatSliderModule
  ],
  selector: 'gf-rule-settings-dialog',
  styleUrls: ['./rule-settings-dialog.scss'],
  templateUrl: './rule-settings-dialog.html'
})
export class GfRuleSettingsDialogComponent implements OnInit {
  public hasChanges = false;
  public settings: XRayRulesSettings['AccountClusterRiskCurrentInvestment'];

  private originalSettings: XRayRulesSettings['AccountClusterRiskCurrentInvestment'];

  public constructor(
    @Inject(MAT_DIALOG_DATA) public data: RuleSettingsDialogParams,
    public dialogRef: MatDialogRef<GfRuleSettingsDialogComponent>
  ) {}

  public ngOnInit() {
    this.originalSettings = {
      ...this.data.settings
    };
    this.settings = this.data.settings;
  }

  public onChange() {
    this.hasChanges =
      this.settings.thresholdMin !== this.originalSettings.thresholdMin ||
      this.settings.thresholdMax !== this.originalSettings.thresholdMax;
  }
}
