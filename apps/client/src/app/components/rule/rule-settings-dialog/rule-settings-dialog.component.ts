import { XRayRulesSettings } from '@ghostfolio/common/types';

import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef
} from '@angular/material/dialog';
import { MatSliderModule } from '@angular/material/slider';

import { IRuleSettingsDialogParams } from './interfaces/interfaces';

@Component({
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatDialogModule,
    MatSliderModule
  ],
  selector: 'gf-rule-settings-dialog',
  standalone: true,
  styleUrls: ['./rule-settings-dialog.scss'],
  templateUrl: './rule-settings-dialog.html'
})
export class GfRuleSettingsDialogComponent {
  public settings: XRayRulesSettings['AccountClusterRiskCurrentInvestment'];

  public constructor(
    @Inject(MAT_DIALOG_DATA) public data: IRuleSettingsDialogParams,
    public dialogRef: MatDialogRef<GfRuleSettingsDialogComponent>
  ) {}
}
