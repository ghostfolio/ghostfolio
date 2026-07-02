import { GfValueComponent } from '@ghostfolio/ui/value';

import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
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
  protected readonly settingsForm: FormGroup;

  protected readonly data = inject<RuleSettingsDialogParams>(MAT_DIALOG_DATA);
  protected readonly dialogRef =
    inject<MatDialogRef<GfRuleSettingsDialogComponent>>(MatDialogRef);
  private readonly formBuilder = inject(FormBuilder);

  public constructor() {
    this.settingsForm = this.formBuilder.group({
      thresholdMax: [this.data.settings?.thresholdMax],
      thresholdMin: [this.data.settings?.thresholdMin]
    });
  }

  protected onSubmit() {
    this.dialogRef.close({
      ...this.data.settings,
      thresholdMax: this.settingsForm.get('thresholdMax')?.value,
      thresholdMin: this.settingsForm.get('thresholdMin')?.value
    });
  }
}
