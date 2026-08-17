import { ToggleOption } from '@ghostfolio/common/types';

import {
  ChangeDetectionStrategy,
  Component,
  effect,
  input,
  output
} from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatRadioModule } from '@angular/material/radio';
import { IonIcon } from '@ionic/angular/standalone';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonIcon, MatRadioModule, ReactiveFormsModule],
  selector: 'gf-toggle',
  styleUrls: ['./toggle.component.scss'],
  templateUrl: './toggle.component.html'
})
export class GfToggleComponent {
  public readonly defaultValue = input.required<string>();
  public readonly isDisabled = input<boolean>(false);
  public readonly isLoading = input<boolean>(false);
  public readonly options = input<ToggleOption[]>([]);

  protected readonly optionFormControl = new FormControl<string | null>(null);
  protected readonly valueChange = output<Pick<ToggleOption, 'value'>>();

  public constructor() {
    effect(() => {
      this.optionFormControl.setValue(this.defaultValue());
    });
  }

  public onValueChange() {
    const value = this.optionFormControl.value;

    if (value !== null) {
      this.valueChange.emit({ value });
    }
  }
}
