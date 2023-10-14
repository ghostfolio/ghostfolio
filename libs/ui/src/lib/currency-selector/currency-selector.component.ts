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
import { FormControl, NgControl } from '@angular/forms';
import {
  MatAutocomplete,
  MatAutocompleteSelectedEvent
} from '@angular/material/autocomplete';
import { MatFormFieldControl } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { Subject, of, tap } from 'rxjs';
import {
  debounceTime,
  distinctUntilChanged,
  switchMap,
  takeUntil
} from 'rxjs/operators';
import { Currency } from '@ghostfolio/common/interfaces/currency.interface';
import { AbstractMatFormField } from '../symbol-autocomplete/abstract-mat-form-field';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[attr.aria-describedBy]': 'describedBy',
    '[id]': 'id'
  },
  selector: 'gf-currency-autocomplete',
  styleUrls: ['./currency-selector.component.scss'],
  templateUrl: 'currency-selector.component.html',
  providers: [
    {
      provide: MatFormFieldControl,
      useExisting: CurrencySelectorComponent
    }
  ]
})
export class CurrencySelectorComponent
  extends AbstractMatFormField<Currency>
  implements OnInit, OnDestroy
{
  @Input() private currencies: Currency[] = [];
  @Input() public isLoading = false;

  @ViewChild(MatInput, { static: false }) private input: MatInput;

  @ViewChild('currencyAutocomplete')
  public currencyAutocomplete: MatAutocomplete;

  public control = new FormControl();
  public filteredCurrencies: Currency[] = [];

  private unsubscribeSubject = new Subject<void>();

  public constructor(
    public readonly _elementRef: ElementRef,
    public readonly _focusMonitor: FocusMonitor,
    public readonly changeDetectorRef: ChangeDetectorRef,
    public readonly ngControl: NgControl
  ) {
    super(_elementRef, _focusMonitor, ngControl);

    this.controlType = 'currency-autocomplete';
  }

  public ngOnInit() {
    if (this.disabled) {
      this.control.disable();
    }

    this.control.valueChanges
      .pipe(
        debounceTime(400),
        distinctUntilChanged(),
        takeUntil(this.unsubscribeSubject),
        tap(() => {
          this.isLoading = true;

          this.changeDetectorRef.markForCheck();
        }),
        switchMap((query) => {
          return of(
            this.currencies.filter((currency) =>
              currency.label.toLowerCase().includes(query?.toLowerCase() || '')
            ) || []
          );
        })
      )
      .subscribe((filteredCurrencies: Currency[]) => {
        this.filteredCurrencies = filteredCurrencies;

        this.isLoading = false;

        this.changeDetectorRef.markForCheck();
      });
  }

  public displayFn(currency: string) {
    return currency;
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
      value: event.option.value
    } as Currency;
  }

  public set value(value: Currency) {
    this.control.setValue(value);
    super.value = value;
  }

  public ngOnDestroy() {
    super.ngOnDestroy();

    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }

  private validateRequired() {
    const requiredCheck = super.required
      ? !super.value?.value &&
        !this.currencies
          .map((currency) => currency.value)
          .includes(super.value.value)
      : false;
    if (requiredCheck) {
      this.ngControl.control.setErrors({ invalidData: true });
    }
  }
}
