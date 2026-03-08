import { LookupItem } from '@ghostfolio/common/interfaces';
import { GfSymbolPipe } from '@ghostfolio/common/pipes';
import { DataService } from '@ghostfolio/ui/services';

import { FocusMonitor } from '@angular/cdk/a11y';
import {
  CUSTOM_ELEMENTS_SCHEMA,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DoCheck,
  DestroyRef,
  ElementRef,
  Input,
  inject,
  OnChanges,
  OnInit,
  SimpleChanges,
  viewChild
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  FormControl,
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
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { isString } from 'lodash';
import { tap } from 'rxjs';
import {
  debounceTime,
  distinctUntilChanged,
  filter,
  switchMap
} from 'rxjs/operators';

import { translate } from '../i18n';
import { GfPremiumIndicatorComponent } from '../premium-indicator';
import { AbstractMatFormField } from '../shared/abstract-mat-form-field';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[attr.aria-describedBy]': 'describedBy',
    '[id]': 'id'
  },
  imports: [
    FormsModule,
    GfPremiumIndicatorComponent,
    GfSymbolPipe,
    MatAutocompleteModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    ReactiveFormsModule
  ],
  providers: [
    {
      provide: MatFormFieldControl,
      useExisting: GfSymbolAutocompleteComponent
    }
  ],
  selector: 'gf-symbol-autocomplete',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  styleUrls: ['./symbol-autocomplete.component.scss'],
  templateUrl: 'symbol-autocomplete.component.html'
})
export class GfSymbolAutocompleteComponent
  extends AbstractMatFormField<LookupItem>
  implements DoCheck, OnChanges, OnInit
{
  @Input() public defaultLookupItems: LookupItem[] = [];
  @Input() public isLoading = false;

  @Input() private includeIndices = false;

  public readonly control = new FormControl();
  public lookupItems: (LookupItem & { assetSubClassString: string })[] = [];

  protected readonly symbolAutocomplete =
    viewChild.required<MatAutocomplete>('symbolAutocomplete');

  private readonly destroyRef = inject(DestroyRef);
  private readonly input = viewChild.required(MatInput);

  public constructor(
    public readonly _elementRef: ElementRef,
    public readonly _focusMonitor: FocusMonitor,
    public readonly changeDetectorRef: ChangeDetectorRef,
    public readonly dataService: DataService,
    public readonly ngControl: NgControl
  ) {
    super(_elementRef, _focusMonitor, ngControl);

    this.controlType = 'symbol-autocomplete';
  }

  public get empty() {
    return this.input().empty;
  }

  public set value(value: LookupItem) {
    this.control.setValue(value);
    super.value = value;
  }

  public ngOnInit() {
    if (this.disabled) {
      this.control.disable();
    }

    this.control.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        if (super.value) {
          super.value.dataSource = null;
        }
      });

    this.control.valueChanges
      .pipe(
        filter((query) => {
          if (query?.length === 0) {
            this.showDefaultOptions();

            return false;
          }

          return isString(query);
        }),
        tap(() => {
          this.isLoading = true;

          this.changeDetectorRef.markForCheck();
        }),
        debounceTime(400),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef),
        switchMap((query: string) => {
          return this.dataService.fetchSymbols({
            query,
            includeIndices: this.includeIndices
          });
        })
      )
      .subscribe((filteredLookupItems) => {
        this.lookupItems = filteredLookupItems.map((lookupItem) => {
          return {
            ...lookupItem,
            assetSubClassString: translate(lookupItem.assetSubClass)
          };
        });

        this.isLoading = false;

        this.changeDetectorRef.markForCheck();
      });
  }

  public ngOnChanges(changes: SimpleChanges) {
    if (changes['defaultLookupItems'] && this.defaultLookupItems?.length) {
      this.showDefaultOptions();
    }
  }

  public displayFn(aLookupItem: LookupItem) {
    return aLookupItem?.symbol ?? '';
  }

  public focus() {
    this.input().focus();
  }

  public isValueInOptions(value: string) {
    return this.lookupItems.some((item) => {
      return item.symbol === value;
    });
  }

  public ngDoCheck() {
    if (this.ngControl) {
      this.validateRequired();
      this.errorState = !!(this.ngControl.invalid && this.ngControl.touched);
      this.stateChanges.next();
    }
  }

  public onUpdateSymbol(event: MatAutocompleteSelectedEvent) {
    super.value = {
      dataSource: event.option.value.dataSource,
      symbol: event.option.value.symbol
    } as LookupItem;
  }

  private showDefaultOptions() {
    this.lookupItems = this.defaultLookupItems.map((lookupItem) => {
      return {
        ...lookupItem,
        assetSubClassString: translate(lookupItem.assetSubClass)
      };
    });

    this.changeDetectorRef.markForCheck();
  }

  private validateRequired() {
    const requiredCheck = super.required
      ? !super.value?.dataSource || !super.value?.symbol
      : false;
    if (requiredCheck) {
      this.ngControl.control?.setErrors({ invalidData: true });
    }
  }
}
