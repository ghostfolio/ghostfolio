import { Currency } from '@ghostfolio/common/interfaces';
import { AbstractMatFormField } from '@ghostfolio/ui/shared/abstract-mat-form-field';

import { FocusMonitor } from '@angular/cdk/a11y';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  Input,
  OnDestroy,
  OnInit,
  ViewChild
} from '@angular/core';
import { FormControl, FormGroupDirective, NgControl } from '@angular/forms';
import {
  MatAutocomplete,
  MatAutocompleteSelectedEvent
} from '@angular/material/autocomplete';
import { MatFormFieldControl } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { Subject } from 'rxjs';
import { map, startWith, takeUntil } from 'rxjs/operators';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[attr.aria-describedBy]': 'describedBy',
    '[id]': 'id'
  },
  providers: [
    {
      provide: MatFormFieldControl,
      useExisting: CurrencySelectorComponent
    }
  ],
  selector: 'gf-currency-selector',
  styleUrls: ['./currency-selector.component.scss'],
  templateUrl: 'currency-selector.component.html'
})
export class CurrencySelectorComponent
  extends AbstractMatFormField<Currency>
  implements OnInit, OnDestroy
{
  @Input() private currencies: Currency[] = [];
  @Input() private formControlName: string;

  @ViewChild(MatInput) private input: MatInput;

  @ViewChild('currencyAutocomplete')
  public currencyAutocomplete: MatAutocomplete;

  public control = new FormControl();
  public filteredCurrencies: Currency[] = [];

  private unsubscribeSubject = new Subject<void>();

  public constructor(
    public readonly _elementRef: ElementRef,
    public readonly _focusMonitor: FocusMonitor,
    public readonly changeDetectorRef: ChangeDetectorRef,
    private readonly formGroupDirective: FormGroupDirective,
    public readonly ngControl: NgControl
  ) {
    super(_elementRef, _focusMonitor, ngControl);

    this.controlType = 'currency-selector';
  }

  public ngOnInit() {
    if (this.disabled) {
      this.control.disable();
    }

    const formGroup = this.formGroupDirective.form;

    if (formGroup) {
      const control = formGroup.get(this.formControlName);

      if (control) {
        this.value = this.currencies.find(({ value }) => {
          return value === control.value;
        });
      }
    }

    this.control.valueChanges
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe(() => {
        if (super.value?.value) {
          super.value.value = null;
        }
      });

    this.control.valueChanges
      .pipe(
        takeUntil(this.unsubscribeSubject),
        startWith(''),
        map((value) => {
          return value ? this.filter(value) : this.currencies.slice();
        })
      )
      .subscribe((values) => {
        this.filteredCurrencies = values;
      });
  }

  public displayFn(currency: Currency) {
    return currency?.label ?? '';
  }

  public get empty() {
    return this.input?.empty;
  }

  public focus() {
    this.input.focus();
  }

  public ngDoCheck() {
    if (this.ngControl) {
      this.validateRequired();
      this.errorState = this.ngControl.invalid && this.ngControl.touched;
      this.stateChanges.next();
    }
  }

  public onUpdateCurrency(event: MatAutocompleteSelectedEvent) {
    super.value = {
      label: event.option.value.label,
      value: event.option.value.value
    } as Currency;
  }

  public set value(value: Currency) {
    const newValue =
      typeof value === 'object' && value !== null ? { ...value } : value;
    this.control.setValue(newValue);
    super.value = newValue;
  }

  public ngOnDestroy() {
    super.ngOnDestroy();

    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }

  private filter(value: Currency | string) {
    const filterValue =
      typeof value === 'string'
        ? value?.toLowerCase()
        : value?.value.toLowerCase();

    return this.currencies.filter((currency) => {
      return currency.value.toLowerCase().startsWith(filterValue);
    });
  }

  private validateRequired() {
    const requiredCheck = super.required
      ? !super.value?.label || !super.value?.value
      : false;

    if (requiredCheck) {
      this.ngControl.control.setErrors({ invalidData: true });
    }
  }
}
