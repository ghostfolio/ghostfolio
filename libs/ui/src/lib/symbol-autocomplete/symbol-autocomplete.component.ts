import { LookupItem } from '@ghostfolio/api/app/symbol/interfaces/lookup-item.interface';
import { DataService } from '@ghostfolio/client/services/data.service';
import { translate } from '@ghostfolio/ui/i18n';
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
import { FormControl, NgControl } from '@angular/forms';
import {
  MatAutocomplete,
  MatAutocompleteSelectedEvent
} from '@angular/material/autocomplete';
import { MatFormFieldControl } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { isString } from 'lodash';
import { Subject, tap } from 'rxjs';
import {
  debounceTime,
  distinctUntilChanged,
  filter,
  switchMap,
  takeUntil
} from 'rxjs/operators';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[attr.aria-describedBy]': 'describedBy',
    '[id]': 'id'
  },
  selector: 'gf-symbol-autocomplete',
  styleUrls: ['./symbol-autocomplete.component.scss'],
  templateUrl: 'symbol-autocomplete.component.html',
  providers: [
    {
      provide: MatFormFieldControl,
      useExisting: SymbolAutocompleteComponent
    }
  ]
})
export class SymbolAutocompleteComponent
  extends AbstractMatFormField<LookupItem>
  implements OnInit, OnDestroy
{
  @Input() private includeIndices = false;
  @Input() public isLoading = false;

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
          this.isLoading = true;

          this.changeDetectorRef.markForCheck();
        }),
        switchMap((query: string) => {
          return this.dataService.fetchSymbols({
            query,
            includeIndices: this.includeIndices
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
