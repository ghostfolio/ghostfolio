import {
  getCountryCodeFromCurrency,
  getEmojiFlag
} from '@ghostfolio/common/helper';

import { FocusMonitor } from '@angular/cdk/a11y';
import {
  CUSTOM_ELEMENTS_SCHEMA,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  DoCheck,
  ElementRef,
  OnInit,
  ViewChild,
  inject,
  input,
  viewChild
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  FormControl,
  FormGroupDirective,
  FormsModule,
  NgControl,
  ReactiveFormsModule
} from '@angular/forms';
import {
  MatAutocomplete,
  MatAutocompleteModule,
  MatAutocompleteOrigin,
  MatAutocompleteTrigger,
  MatOption
} from '@angular/material/autocomplete';
import {
  MAT_FORM_FIELD,
  MatFormFieldControl,
  MatFormFieldModule
} from '@angular/material/form-field';
import { MatInput, MatInputModule } from '@angular/material/input';
import { map, startWith } from 'rxjs/operators';

import { AbstractMatFormField } from '../shared/abstract-mat-form-field';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[attr.aria-describedBy]': 'describedBy',
    '[id]': 'id',
    class: 'align-items-center d-flex'
  },
  imports: [
    FormsModule,
    MatAutocompleteModule,
    MatFormFieldModule,
    MatInputModule,
    ReactiveFormsModule
  ],
  providers: [
    {
      provide: MatFormFieldControl,
      useExisting: GfCurrencySelectorComponent
    }
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  selector: 'gf-currency-selector',
  templateUrl: 'currency-selector.component.html'
})
export class GfCurrencySelectorComponent
  extends AbstractMatFormField<string | null>
  implements DoCheck, OnInit
{
  @ViewChild('currencyAutocomplete')
  public currencyAutocomplete: MatAutocomplete;

  public readonly control = new FormControl<string | null>(null);
  public readonly currencies = input.required<string[]>();
  public filteredCurrencies: string[] = [];
  public readonly formControlName = input.required<string>();

  private readonly autocompleteTrigger = viewChild.required(
    MatAutocompleteTrigger
  );
  private readonly destroyRef = inject(DestroyRef);
  private readonly formField = inject(MAT_FORM_FIELD);
  private readonly input = viewChild.required(MatInput);
  private lastSelectedCurrency: string | null = null;

  public constructor(
    public override readonly _elementRef: ElementRef,
    public override readonly _focusMonitor: FocusMonitor,
    public readonly changeDetectorRef: ChangeDetectorRef,
    private readonly formGroupDirective: FormGroupDirective,
    public override readonly ngControl: NgControl
  ) {
    super(_elementRef, _focusMonitor, ngControl);

    this.controlType = 'currency-selector';
  }

  public get autocompleteOrigin(): MatAutocompleteOrigin {
    return { elementRef: this.formField.getConnectedOverlayOrigin() };
  }

  public get emojiFlagOfSelectedCurrency() {
    const selectedCurrency = this.currencies().find((currency) => {
      return currency === this.control.value;
    });

    return this.getEmojiFlagFromCurrency(selectedCurrency);
  }

  public override get empty() {
    return !this.control.value;
  }

  public override set value(value: string | null) {
    this.control.setValue(value);
    super.value = value;

    this.lastSelectedCurrency = value;
  }

  public focus() {
    this.input().focus();
  }

  public getEmojiFlagFromCurrency(aCurrency = '') {
    return getEmojiFlag(getCountryCodeFromCurrency(aCurrency));
  }

  public ngOnInit() {
    if (this.disabled) {
      this.control.disable();
    }

    const formGroup = this.formGroupDirective.form;

    if (formGroup) {
      const control = formGroup.get(this.formControlName());

      if (control) {
        this.value =
          this.currencies().find((value) => {
            return value === control.value;
          }) ?? null;
      }
    }

    this.control.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        if (super.value) {
          super.value = null;
        }
      });

    this.control.valueChanges
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        startWith(''),
        map((value) => {
          return value ? this.filter(value) : this.currencies().slice();
        })
      )
      .subscribe((values) => {
        this.filteredCurrencies = values;
      });
  }

  public override ngDoCheck() {
    if (this.ngControl) {
      this.validateRequired();
      this.errorState = !!(this.ngControl.invalid && this.ngControl.touched);
      this.stateChanges.next();
    }
  }

  public override onBlur() {
    // Typing clears the selected currency, so restore the last selection once
    // the user leaves the field without picking an option. The panel is still
    // open while an option is being clicked, in which case the selection
    // itself provides the new value.
    if (!super.value && !this.autocompleteTrigger().panelOpen) {
      this.value = this.lastSelectedCurrency;

      this.changeDetectorRef.markForCheck();
    }

    super.onBlur();
  }

  public onUpdateCurrency({ option }: { option: MatOption<string> }) {
    super.value = option.value;

    this.lastSelectedCurrency = option.value;
  }

  private filter(value: string) {
    const filterValue = value.toLowerCase();

    return this.currencies().filter((currency) => {
      return currency.toLowerCase().startsWith(filterValue);
    });
  }

  private validateRequired() {
    const requiredCheck = super.required ? !super.value : false;

    if (requiredCheck) {
      this.ngControl.control?.setErrors({ invalidData: true });
    }
  }
}
