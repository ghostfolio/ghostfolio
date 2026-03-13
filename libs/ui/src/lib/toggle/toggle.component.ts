import { ToggleOption } from '@ghostfolio/common/interfaces';

import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnChanges,
  output
} from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatRadioModule } from '@angular/material/radio';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MatRadioModule, ReactiveFormsModule],
  selector: 'gf-toggle',
  styleUrls: ['./toggle.component.scss'],
  templateUrl: './toggle.component.html'
})
export class GfToggleComponent implements OnChanges {
  @Input() defaultValue: string;
  @Input() isLoading: boolean;
  @Input() options: ToggleOption[] = [];

  public optionFormControl = new FormControl<string | null>(null);

  protected readonly valueChange = output<Pick<ToggleOption, 'value'>>();

  public ngOnChanges() {
    this.optionFormControl.setValue(this.defaultValue);
  }

  public onValueChange() {
    const value = this.optionFormControl.value;

    if (value !== null) {
      this.valueChange.emit({ value });
    }
  }
}
