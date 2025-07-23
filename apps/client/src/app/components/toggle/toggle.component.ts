import { ToggleOption } from '@ghostfolio/common/interfaces';

import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output
} from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatRadioModule } from '@angular/material/radio';

@Component({
  selector: 'gf-toggle',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MatRadioModule, ReactiveFormsModule],
  templateUrl: './toggle.component.html',
  styleUrls: ['./toggle.component.scss']
})
export class GfToggleComponent implements OnChanges {
  public static DEFAULT_DATE_RANGE_OPTIONS: ToggleOption[] = [
    { label: $localize`Today`, value: '1d' },
    { label: $localize`YTD`, value: 'ytd' },
    { label: $localize`1Y`, value: '1y' },
    { label: $localize`5Y`, value: '5y' },
    { label: $localize`Max`, value: 'max' }
  ];

  @Input() defaultValue: string;
  @Input() isLoading: boolean;
  @Input() options: ToggleOption[];

  @Output() change = new EventEmitter<Pick<ToggleOption, 'value'>>();

  public optionFormControl = new FormControl<string>(undefined);

  public ngOnChanges() {
    this.optionFormControl.setValue(this.defaultValue);
  }

  public onValueChange() {
    this.change.emit({ value: this.optionFormControl.value });
  }
}
