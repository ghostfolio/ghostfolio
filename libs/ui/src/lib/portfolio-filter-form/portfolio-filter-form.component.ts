import { GfSymbolModule } from '@ghostfolio/client/pipes/symbol/symbol.module';
import { getAssetProfileIdentifier } from '@ghostfolio/common/helper';
import { Filter, PortfolioPosition } from '@ghostfolio/common/interfaces';
import { AccountWithValue } from '@ghostfolio/common/types';

import {
  CUSTOM_ELEMENTS_SCHEMA,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  forwardRef
} from '@angular/core';
import {
  ControlValueAccessor,
  FormBuilder,
  FormControl,
  FormGroup,
  FormsModule,
  NG_VALUE_ACCESSOR,
  ReactiveFormsModule
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { Subject, takeUntil } from 'rxjs';

import { GfEntityLogoComponent } from '../entity-logo/entity-logo.component';
import { PortfolioFilterFormValue } from './interfaces';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    GfEntityLogoComponent,
    GfSymbolModule,
    MatButtonModule,
    MatFormFieldModule,
    MatSelectModule,
    ReactiveFormsModule
  ],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => GfPortfolioFilterFormComponent),
      multi: true
    }
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  selector: 'gf-portfolio-filter-form',
  styleUrls: ['./portfolio-filter-form.component.scss'],
  templateUrl: './portfolio-filter-form.component.html'
})
export class GfPortfolioFilterFormComponent
  implements ControlValueAccessor, OnInit, OnChanges, OnDestroy
{
  @Input() accounts: AccountWithValue[] = [];
  @Input() assetClasses: Filter[] = [];
  @Input() holdings: PortfolioPosition[] = [];
  @Input() tags: Filter[] = [];
  @Input() disabled = false;

  @Output() applyFilters = new EventEmitter<void>();
  @Output() resetFilters = new EventEmitter<void>();

  public filterForm: FormGroup;

  private onChange: (value: PortfolioFilterFormValue) => void = () => {
    // ControlValueAccessor callback - implemented by parent
  };
  private onTouched: () => void = () => {
    // ControlValueAccessor callback - implemented by parent
  };
  private unsubscribeSubject = new Subject<void>();

  public constructor(
    private changeDetectorRef: ChangeDetectorRef,
    private formBuilder: FormBuilder
  ) {
    // Create form with initial state (will be updated in ngOnChanges)
    this.filterForm = this.formBuilder.group({
      account: new FormControl<string>(null),
      assetClass: new FormControl<string>(null),
      holding: new FormControl<PortfolioPosition>(null),
      tag: new FormControl<string>(null)
    });
  }

  public ngOnInit() {
    // Subscribe to form changes to notify parent component
    this.filterForm.valueChanges
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((value) => {
        this.onChange(value as PortfolioFilterFormValue);
        this.onTouched();
      });
  }

  public ngOnChanges() {
    // Update form disabled state
    if (this.disabled) {
      this.filterForm.disable({ emitEvent: false });
    } else {
      this.filterForm.enable({ emitEvent: false });
    }

    // Disable tag field if no tags available
    if (this.tags.length === 0) {
      this.filterForm.get('tag')?.disable({ emitEvent: false });
    }

    this.changeDetectorRef.markForCheck();
  }

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }

  // ControlValueAccessor implementation
  public writeValue(value: PortfolioFilterFormValue | null): void {
    if (value) {
      this.filterForm.setValue(
        {
          account: value.account ?? null,
          assetClass: value.assetClass ?? null,
          holding: value.holding ?? null,
          tag: value.tag ?? null
        },
        { emitEvent: false }
      );
    } else {
      this.filterForm.reset({}, { emitEvent: false });
    }
  }

  public registerOnChange(fn: (value: PortfolioFilterFormValue) => void): void {
    this.onChange = fn;
  }

  public registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  public setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;

    // Update form disabled state manually since this is called by ControlValueAccessor
    if (this.disabled) {
      this.filterForm.disable({ emitEvent: false });
    } else {
      this.filterForm.enable({ emitEvent: false });
    }

    this.changeDetectorRef.markForCheck();
  }

  // Helper methods
  public hasFilters(): boolean {
    const formValue = this.filterForm.value;
    return Object.values(formValue).some((value) => !!value);
  }

  public holdingComparisonFunction(
    option: PortfolioPosition,
    value: PortfolioPosition
  ): boolean {
    if (value === null) {
      return false;
    }

    return (
      getAssetProfileIdentifier(option) === getAssetProfileIdentifier(value)
    );
  }

  public onApplyFilters(): void {
    this.filterForm.markAsPristine();
    this.onChange(this.filterForm.value as PortfolioFilterFormValue);
    this.applyFilters.emit();
  }

  public onResetFilters(): void {
    this.filterForm.reset({}, { emitEvent: true });
    this.resetFilters.emit();
  }
}
