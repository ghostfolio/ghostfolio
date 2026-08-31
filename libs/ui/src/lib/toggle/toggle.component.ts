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
export class GfToggleComponent<T extends string = string> {
  public readonly defaultValue = input.required<T>();
  public readonly isDisabled = input<boolean>(false);
  public readonly isLoading = input<boolean>(false);
  public readonly options = input<ToggleOption<T>[]>([]);

  public readonly valueChange = output<Pick<ToggleOption<T>, 'value'>>();

  protected readonly optionFormControl = new FormControl<T | null>(null);

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
