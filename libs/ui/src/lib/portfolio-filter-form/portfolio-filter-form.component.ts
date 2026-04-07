import { getAssetProfileIdentifier } from '@ghostfolio/common/helper';
import { Filter, PortfolioPosition } from '@ghostfolio/common/interfaces';
import { GfSymbolPipe } from '@ghostfolio/common/pipes';
import { AccountWithPlatform } from '@ghostfolio/common/types';

import {
  CUSTOM_ELEMENTS_SCHEMA,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  OnChanges,
  OnInit,
  forwardRef,
  inject,
  input,
  model
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  ControlValueAccessor,
  FormBuilder,
  FormControl,
  FormGroup,
  FormsModule,
  NG_VALUE_ACCESSOR,
  ReactiveFormsModule
} from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';

import { GfEntityLogoComponent } from '../entity-logo/entity-logo.component';
import { PortfolioFilterFormValue } from './interfaces';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    GfEntityLogoComponent,
    GfSymbolPipe,
    MatFormFieldModule,
    MatSelectModule,
    ReactiveFormsModule
  ],
  providers: [
    {
      multi: true,
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => GfPortfolioFilterFormComponent)
    }
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  selector: 'gf-portfolio-filter-form',
  styleUrls: ['./portfolio-filter-form.component.scss'],
  templateUrl: './portfolio-filter-form.component.html'
})
export class GfPortfolioFilterFormComponent
  implements ControlValueAccessor, OnChanges, OnInit
{
  public readonly accounts = input<AccountWithPlatform[]>([]);
  public readonly assetClasses = input<Filter[]>([]);
  public readonly disabled = model(false);
  public readonly holdings = input<PortfolioPosition[]>([]);
  public readonly tags = input<Filter[]>([]);

  public filterForm: FormGroup<{
    account: FormControl<string | null>;
    assetClass: FormControl<string | null>;
    holding: FormControl<PortfolioPosition | null>;
    tag: FormControl<string | null>;
  }>;

  private readonly changeDetectorRef = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly formBuilder = inject(FormBuilder);

  public constructor() {
    this.filterForm = this.formBuilder.group({
      account: new FormControl<string | null>(null),
      assetClass: new FormControl<string | null>(null),
      holding: new FormControl<PortfolioPosition | null>(null),
      tag: new FormControl<string | null>(null)
    });
  }

  public ngOnInit() {
    this.filterForm.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => {
        this.onChange(value as PortfolioFilterFormValue);
        this.onTouched();
      });
  }

  public hasFilters() {
    const formValue = this.filterForm.value;

    return Object.values(formValue).some((value) => {
      return !!value;
    });
  }

  public holdingComparisonFunction(
    option: PortfolioPosition,
    value: PortfolioPosition
  ) {
    if (value === null) {
      return false;
    }

    return (
      getAssetProfileIdentifier(option) === getAssetProfileIdentifier(value)
    );
  }

  public ngOnChanges() {
    if (this.disabled()) {
      this.filterForm.disable({ emitEvent: false });
    } else {
      this.filterForm.enable({ emitEvent: false });
    }

    const tagControl = this.filterForm.get('tag');

    if (this.tags().length === 0) {
      tagControl?.disable({ emitEvent: false });
    } else if (!this.disabled()) {
      tagControl?.enable({ emitEvent: false });
    }

    this.changeDetectorRef.markForCheck();
  }

  public registerOnChange(fn: (value: PortfolioFilterFormValue) => void) {
    this.onChange = fn;
  }

  public registerOnTouched(fn: () => void) {
    this.onTouched = fn;
  }

  public setDisabledState(isDisabled: boolean) {
    this.disabled.set(isDisabled);

    if (this.disabled()) {
      this.filterForm.disable({ emitEvent: false });
    } else {
      this.filterForm.enable({ emitEvent: false });
    }

    this.changeDetectorRef.markForCheck();
  }

  public writeValue(value: PortfolioFilterFormValue | null) {
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

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private onChange = (_value: PortfolioFilterFormValue): void => {
    // ControlValueAccessor onChange callback
  };

  private onTouched = (): void => {
    // ControlValueAccessor onTouched callback
  };
}
