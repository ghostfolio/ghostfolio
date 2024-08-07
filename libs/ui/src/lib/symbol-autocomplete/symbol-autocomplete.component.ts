import { LookupItem } from '@ghostfolio/api/app/symbol/interfaces/lookup-item.interface';
import { GfSymbolModule } from '@ghostfolio/client/pipes/symbol/symbol.module';
import { DataService } from '@ghostfolio/client/services/data.service';
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
import { combineLatest, Subject, tap } from 'rxjs';
import {
  debounceTime,
  distinctUntilChanged,
  filter,
  map,
  startWith,
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
  standalone: true,
  styleUrls: ['./symbol-autocomplete.component.scss'],
  templateUrl: 'symbol-autocomplete.component.html'
})
export class GfSymbolAutocompleteComponent
  extends AbstractMatFormField<LookupItem>
  implements OnInit, OnDestroy
{
  @Input() private includeIndices = false;
  @Input() public isLoadingLocal = false;
  @Input() public isLoadingRemote = false;

  @ViewChild(MatInput) private input: MatInput;

  @ViewChild('symbolAutocomplete') public symbolAutocomplete: MatAutocomplete;

  public control = new FormControl();
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
      this.control.disable();
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
        debounceTime(400),
        distinctUntilChanged(),
        filter((query) => {
          return isString(query) && query.length > 1;
        }),
        takeUntil(this.unsubscribeSubject),
        tap(() => {
          this.isLoadingRemote = true;
          this.isLoadingLocal = true;

          this.changeDetectorRef.markForCheck();
        }),
        switchMap((query: string) =>
          combineLatest([
            this.dataService
              .fetchPortfolioLookup({
                query
              })
              .pipe(startWith(undefined)),
            this.dataService
              .fetchSymbols({
                query,
                includeIndices: this.includeIndices
              })
              .pipe(startWith(undefined))
          ])
        )
      )
      .subscribe((filteredLookupItems) => {
        const [localItems, remoteItems]: [LookupItem[], LookupItem[]] =
          filteredLookupItems;
        const uniqueItems = [
          ...new Map(
            (localItems ?? [])
              .concat(remoteItems ?? [])
              .map((item) => [item.symbol, item])
          ).values()
        ];
        this.filteredLookupItems = uniqueItems.map((lookupItem) => {
          return {
            ...lookupItem,
            assetSubClassString: translate(lookupItem.assetSubClass)
          };
        });

        if (localItems !== undefined) {
          this.isLoadingLocal = false;
        }
        if (remoteItems !== undefined) {
          this.isLoadingRemote = false;
        }

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

  private validateRequired() {
    const requiredCheck = super.required
      ? !super.value?.dataSource || !super.value?.symbol
      : false;
    if (requiredCheck) {
      this.ngControl.control.setErrors({ invalidData: true });
    }
  }
}
