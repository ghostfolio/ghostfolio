import { FocusMonitor } from '@angular/cdk/a11y';
import { coerceBooleanProperty } from '@angular/cdk/coercion';
import {
  Component,
  DoCheck,
  ElementRef,
  HostBinding,
  HostListener,
  Input,
  OnDestroy
} from '@angular/core';
import { ControlValueAccessor, NgControl, Validators } from '@angular/forms';
import { MatFormFieldControl } from '@angular/material/form-field';
import { Subject } from 'rxjs';

@Component({
  template: ''
})
export abstract class AbstractMatFormField<T>
  implements ControlValueAccessor, DoCheck, MatFormFieldControl<T>, OnDestroy
{
  @HostBinding()
  public id = `${this.controlType}-${AbstractMatFormField.nextId++}`;

  @HostBinding('attr.aria-describedBy') public describedBy = '';

  public readonly autofilled: boolean;
  public errorState: boolean;
  public focused = false;
  public readonly stateChanges = new Subject<void>();
  public readonly userAriaDescribedBy: string;

  protected onChange?: (value: T) => void;
  protected onTouched?: () => void;

  private static nextId: number = 0;

  protected constructor(
    protected _elementRef: ElementRef,
    protected _focusMonitor: FocusMonitor,
    public readonly ngControl: NgControl
  ) {
    if (this.ngControl) {
      this.ngControl.valueAccessor = this;
    }

    _focusMonitor
      .monitor(this._elementRef.nativeElement, true)
      .subscribe((origin) => {
        this.focused = !!origin;
        this.stateChanges.next();
      });
  }

  private _controlType: string;

  public get controlType(): string {
    return this._controlType;
  }

  protected set controlType(value: string) {
    this._controlType = value;
    this.id = `${this._controlType}-${AbstractMatFormField.nextId++}`;
  }

  private _value: T;

  public get value(): T {
    return this._value;
  }

  public set value(value: T) {
    this._value = value;

    if (this.onChange) {
      this.onChange(value);
    }
  }

  public get empty(): boolean {
    return !this._value;
  }

  public _placeholder: string = '';

  public get placeholder() {
    return this._placeholder;
  }

  @Input()
  public set placeholder(placeholder: string) {
    this._placeholder = placeholder;
    this.stateChanges.next();
  }

  public _required: boolean = false;

  public get required() {
    return (
      this._required ||
      this.ngControl.control?.hasValidator(Validators.required)
    );
  }

  @Input()
  public set required(required: any) {
    this._required = coerceBooleanProperty(required);
    this.stateChanges.next();
  }

  public _disabled: boolean = false;

  public get disabled() {
    if (this.ngControl && this.ngControl.disabled !== null) {
      return this.ngControl.disabled;
    }

    return this._disabled;
  }

  @Input()
  public set disabled(disabled: any) {
    this._disabled = coerceBooleanProperty(disabled);

    if (this.focused) {
      this.focused = false;
      this.stateChanges.next();
    }
  }

  public abstract focus(): void;

  public get shouldLabelFloat(): boolean {
    return this.focused || !this.empty;
  }

  public ngDoCheck() {
    if (this.ngControl) {
      this.errorState = this.ngControl.invalid && this.ngControl.touched;
      this.stateChanges.next();
    }
  }

  public ngOnDestroy() {
    this.stateChanges.complete();
    this._focusMonitor.stopMonitoring(this._elementRef.nativeElement);
  }

  public registerOnChange(fn: (_: T) => void) {
    this.onChange = fn;
  }

  public registerOnTouched(fn: () => void) {
    this.onTouched = fn;
  }

  public setDescribedByIds(ids: string[]) {
    this.describedBy = ids.join(' ');
  }

  public writeValue(value: T) {
    this.value = value;
  }

  @HostListener('focusout')
  public onBlur() {
    this.focused = false;

    if (this.onTouched) {
      this.onTouched();
    }

    this.stateChanges.next();
  }

  public onContainerClick() {
    if (!this.focused) {
      this.focus();
    }
  }
}
