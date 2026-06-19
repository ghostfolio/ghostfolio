import { GfValueComponent } from '@ghostfolio/ui/value';

import { ChangeDetectionStrategy, Component, Inject } from '@angular/core';
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
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
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
  public settingsForm: FormGroup;

  public constructor(
    @Inject(MAT_DIALOG_DATA) public data: RuleSettingsDialogParams,
    public dialogRef: MatDialogRef<GfRuleSettingsDialogComponent>,
    private formBuilder: FormBuilder
  ) {
    this.settingsForm = this.formBuilder.group({
      thresholdMax: [this.data.settings.thresholdMax],
      thresholdMin: [this.data.settings.thresholdMin]
    });
  }

  public onSubmit() {
    this.dialogRef.close({
      ...this.data.settings,
      thresholdMax: this.settingsForm.get('thresholdMax')?.value,
      thresholdMin: this.settingsForm.get('thresholdMin')?.value
    });
  }
}
