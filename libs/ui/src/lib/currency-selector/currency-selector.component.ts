import { AbstractMatFormField } from '@ghostfolio/ui/shared/abstract-mat-form-field';

import { FocusMonitor } from '@angular/cdk/a11y';
import {
  CUSTOM_ELEMENTS_SCHEMA,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  Input,
  OnDestroy,
  OnInit,
  ViewChild
} from '@angular/core';
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
  MatAutocompleteSelectedEvent
} from '@angular/material/autocomplete';
import {
  MatFormFieldControl,
  MatFormFieldModule
} from '@angular/material/form-field';
import { MatInput, MatInputModule } from '@angular/material/input';
import { Subject } from 'rxjs';
import { map, startWith, takeUntil } from 'rxjs/operators';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[attr.aria-describedBy]': 'describedBy',
    '[id]': 'id'
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
  styleUrls: ['./currency-selector.component.scss'],
  templateUrl: 'currency-selector.component.html'
})
export class GfCurrencySelectorComponent
  extends AbstractMatFormField<string>
  implements OnInit, OnDestroy
{
  @Input() private currencies: string[] = [];
  @Input() private formControlName: string;

  @ViewChild(MatInput) private input: MatInput;

  @ViewChild('currencyAutocomplete')
  public currencyAutocomplete: MatAutocomplete;

  public control = new FormControl();
  public filteredCurrencies: string[] = [];

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
        this.value = this.currencies.find((value) => {
          return value === control.value;
        });
      }
    }

    this.control.valueChanges
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe(() => {
        if (super.value) {
          super.value = null;
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
    super.value = event.option.value;
  }

  public set value(value: string) {
    this.control.setValue(value);
    super.value = value;
  }

  public ngOnDestroy() {
    super.ngOnDestroy();

    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }

  private filter(value: string) {
    const filterValue = value?.toLowerCase();

    return this.currencies.filter((currency) => {
      return currency.toLowerCase().startsWith(filterValue);
    });
  }

  private validateRequired() {
    const requiredCheck = super.required ? !super.value : false;

    if (requiredCheck) {
      this.ngControl.control.setErrors({ invalidData: true });
    }
  }
}
