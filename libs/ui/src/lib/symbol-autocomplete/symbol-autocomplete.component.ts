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
  MatAutocompleteModule,
  MatAutocompleteSelectedEvent
} from '@angular/material/autocomplete';
import {
  MatFormFieldControl,
  MatFormFieldModule
} from '@angular/material/form-field';
import { MatInput, MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectChange, MatSelectModule } from '@angular/material/select';
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
    MatSelectModule,
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
  @Input() public isLoading = false;
  @Input() public isAutocomplete = false;
  @Input() public defaultLookupItems: LookupItem[] = [];

  @ViewChild(MatInput) private input: MatInput;

  public selectControl = new FormControl();
  public inputControl = new FormControl();

  public filteredLookupItems: (LookupItem & { assetSubClassString: string })[] =
    [];

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
      this.selectControl.disable();
      this.inputControl.disable();
    }

    this.inputControl.valueChanges
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe(() => {
        if (super.value) {
          super.value.dataSource = null;
        }
      });

    this.inputControl.valueChanges
      .pipe(
        filter((query) => {
          return isString(query) && query.length > 1;
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
            query
          });
        })
      )
      .subscribe((filteredLookupItems) => {
        this.filteredLookupItems = filteredLookupItems.map((lookupItem) => {
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
    return this.filteredLookupItems.some((item) => {
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

  public onShowAutocomplete(event: KeyboardEvent) {
    if (event.key.length === 1) {
      this.inputControl.setValue(event.key);
      this.isAutocomplete = true;

      this.changeDetectorRef.markForCheck();
    }
  }

  public onSelectUpdateSymbol(event: MatSelectChange) {
    super.value = {
      dataSource: event.source.value.dataSource,
      symbol: event.source.value.symbol
    } as LookupItem;
  }

  public onAutocompleteUpdateSymbol(event: MatAutocompleteSelectedEvent) {
    super.value = {
      dataSource: event.option.value.dataSource,
      symbol: event.option.value.symbol
    } as LookupItem;
  }

  public set value(value: LookupItem) {
    this.inputControl.setValue(value);
    super.value = value;
  }

  public ngOnDestroy() {
    super.ngOnDestroy();

    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
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
