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
  public readonly control = new FormControl<string | null>(null);

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

  public readonly selectedAccount = computed(() => {
    const selectedAccountId = this.selectedAccountId();

    return this.accounts().find(({ id }) => {
      return id === selectedAccountId;
    });
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

  private readonly selectedAccountId = signal<string | null>(null);

  public constructor() {
    // Register as the value accessor manually, because injecting NgControl
    // and providing NG_VALUE_ACCESSOR at the same time creates a cycle
    if (this.ngControl) {
      this.ngControl.valueAccessor = this;
    }

    this.control.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((accountId) => {
        this.selectedAccountId.set(accountId);
        this.onChange(accountId);
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

  public registerOnChange(fn: (accountId: string | null) => void) {
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

  public writeValue(accountId: string | null) {
    this.control.setValue(accountId ?? null, { emitEvent: false });
    this.selectedAccountId.set(accountId ?? null);
  }

  private onChange: (accountId: string | null) => void = () => {
    // ControlValueAccessor onChange callback
  };

  private onTouched = (): void => {
    // ControlValueAccessor onTouched callback
  };
}
