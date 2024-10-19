import { PortfolioReportRule } from '@ghostfolio/common/interfaces';

import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

import { IRuleSettingsDialogParams } from './interfaces/interfaces';

@Component({
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule
  ],
  selector: 'gf-rule-settings-dialog',
  standalone: true,
  styleUrls: ['./rule-settings-dialog.scss'],
  templateUrl: './rule-settings-dialog.html'
})
export class GfRuleSettingsDialogComponent {
  public settings: PortfolioReportRule['settings'];

  public constructor(
    @Inject(MAT_DIALOG_DATA) public data: IRuleSettingsDialogParams,
    public dialogRef: MatDialogRef<GfRuleSettingsDialogComponent>
  ) {
    this.settings = this.data.rule.settings;
  }
}
