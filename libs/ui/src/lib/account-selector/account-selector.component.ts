import { AccountWithPlatform } from '@ghostfolio/common/types';
import { GfEntityLogoComponent } from '@ghostfolio/ui/entity-logo';

import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  OnInit,
  signal
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  ControlValueAccessor,
  FormControl,
  NgControl,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { ErrorStateMatcher } from '@angular/material/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';

export type AccountSelectorValue = string | string[] | null;

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'd-block' },
  imports: [
    GfEntityLogoComponent,
    MatFormFieldModule,
    MatSelectModule,
    ReactiveFormsModule
  ],
  selector: 'gf-account-selector',
  templateUrl: './account-selector.component.html'
})
export class GfAccountSelectorComponent
  implements ControlValueAccessor, OnInit
{
  public readonly accounts = input.required<AccountWithPlatform[]>();
  public readonly control = new FormControl<AccountSelectorValue>(null);

  public readonly errorStateMatcher: ErrorStateMatcher = {
    isErrorState: () => {
      const control = this.ngControl?.control;

      return !!(control?.invalid && (control.dirty || control.touched));
    }
  };

  public readonly hasHint = input(true);
  public readonly hasNullOption = input(false);
  public readonly isRequired = signal(false);
  public readonly label = input.required<string>();

  /**
   * Allows the selection of multiple accounts. The value is an array of
   * account ids in this case. Must not be changed after initialization.
   */
  public readonly multiple = input(false);

  public readonly selectedAccounts = computed(() => {
    const selectedAccountIds = this.selectedAccountIds();

    return this.sortedAccounts().filter(({ id }) => {
      return selectedAccountIds.includes(id);
    });
  });

  public readonly selectedAccount = computed(() => {
    return this.selectedAccounts()[0];
  });

  public readonly selectedAccountNames = computed(() => {
    return this.selectedAccounts()
      .map(({ name }) => {
        return name;
      })
      .join(', ');
  });

  public readonly sortedAccounts = computed(() => {
    return [...this.accounts()].sort((a, b) => {
      return (a.name ?? '')
        .toLowerCase()
        .localeCompare((b.name ?? '').toLowerCase());
    });
  });

  private readonly ngControl = inject(NgControl, {
    optional: true,
    self: true
  });

  private readonly selectedAccountIds = signal<string[]>([]);

  public constructor() {
    // Register as the value accessor manually, because injecting NgControl
    // and providing NG_VALUE_ACCESSOR at the same time creates a cycle
    if (this.ngControl) {
      this.ngControl.valueAccessor = this;
    }

    this.control.valueChanges.pipe(takeUntilDestroyed()).subscribe((value) => {
      this.selectedAccountIds.set(this.getAccountIds(value));
      this.onChange(value);
    });
  }

  public ngOnInit() {
    this.isRequired.set(
      this.ngControl?.control?.hasValidator(Validators.required) ?? false
    );
  }

  public onPanelClosed() {
    this.onTouched();
  }

  public registerOnChange(fn: (value: AccountSelectorValue) => void) {
    this.onChange = fn;
  }

  public registerOnTouched(fn: () => void) {
    this.onTouched = fn;
  }

  public setDisabledState(isDisabled: boolean) {
    if (isDisabled) {
      this.control.disable({ emitEvent: false });
    } else {
      this.control.enable({ emitEvent: false });
    }
  }

  public writeValue(value: AccountSelectorValue) {
    const accountIds = this.getAccountIds(value);

    this.control.setValue(
      this.multiple() ? accountIds : (accountIds[0] ?? null),
      { emitEvent: false }
    );
    this.selectedAccountIds.set(accountIds);
  }

  private getAccountIds(value: AccountSelectorValue) {
    if (Array.isArray(value)) {
      return value;
    }

    return value ? [value] : [];
  }

  private onChange: (value: AccountSelectorValue) => void = () => {
    // ControlValueAccessor onChange callback
  };

  private onTouched = (): void => {
    // ControlValueAccessor onTouched callback
  };
}
