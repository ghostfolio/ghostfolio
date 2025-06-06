import { GfSymbolModule } from '@ghostfolio/client/pipes/symbol/symbol.module';
import { DataService } from '@ghostfolio/client/services/data.service';
import { LookupItem } from '@ghostfolio/common/interfaces';
import { translate } from '@ghostfolio/ui/i18n';
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
import { Subject, tap } from 'rxjs';
import {
  debounceTime,
  distinctUntilChanged,
  filter,
  switchMap,
  takeUntil
} from 'rxjs/operators';

import { GfPremiumIndicatorComponent } from '../premium-indicator';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[attr.aria-describedBy]': 'describedBy',
    '[id]': 'id'
  },
  imports: [
    FormsModule,
    GfPremiumIndicatorComponent,
    GfSymbolModule,
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
  implements OnInit, OnDestroy
{
  @Input() public defaultLookupItems: LookupItem[] = [];
  @Input() public isLoading = false;

  @ViewChild('symbolAutocomplete') public symbolAutocomplete: MatAutocomplete;

  @Input() private includeIndices = false;

  @ViewChild(MatInput) private input: MatInput;

  public control = new FormControl();
  public lookupItems: (LookupItem & { assetSubClassString: string })[] = [];

  private unsubscribeSubject = new Subject<void>();

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

  public ngOnInit() {
    if (this.disabled) {
      this.control.disable();
    }

    if (this.defaultLookupItems?.length) {
      this.showDefaultOptions();
    }

    this.control.valueChanges
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe(() => {
        if (super.value) {
          super.value.dataSource = null;
        }
      });

    this.control.valueChanges
      .pipe(
        filter((query) => {
          if (query.length === 0) {
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
        takeUntil(this.unsubscribeSubject),
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

  public displayFn(aLookupItem: LookupItem) {
    return aLookupItem?.symbol ?? '';
  }

  public get empty() {
    return this.input?.empty;
  }

  public focus() {
    this.input.focus();
  }

  public isValueInOptions(value: string) {
    return this.lookupItems.some((item) => {
      return item.symbol === value;
    });
  }

  public ngDoCheck() {
    if (this.ngControl) {
      this.validateRequired();
      this.errorState = this.ngControl.invalid && this.ngControl.touched;
      this.stateChanges.next();
    }
  }

  public onUpdateSymbol(event: MatAutocompleteSelectedEvent) {
    super.value = {
      dataSource: event.option.value.dataSource,
      symbol: event.option.value.symbol
    } as LookupItem;
  }

  public set value(value: LookupItem) {
    this.control.setValue(value);
    super.value = value;
  }

  public ngOnDestroy() {
    super.ngOnDestroy();

    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
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
      this.ngControl.control.setErrors({ invalidData: true });
    }
  }
}
