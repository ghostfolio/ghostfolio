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
import { FormControl, NgControl, Validators } from '@angular/forms';
import {
  MatAutocomplete,
  MatAutocompleteSelectedEvent
} from '@angular/material/autocomplete';
import { MatFormFieldControl } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { LookupItem } from '@ghostfolio/api/app/symbol/interfaces/lookup-item.interface';
import { DataService } from '@ghostfolio/client/services/data.service';
import { isString } from 'lodash';
import { Observable, Subject, of, tap } from 'rxjs';
import {
  debounceTime,
  distinctUntilChanged,
  filter,
  switchMap
} from 'rxjs/operators';

import { AbstractMatFormField } from './abstract-mat-form-field';

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
  @Input() public isLoading = false;

  @ViewChild(MatInput, { static: false }) private input: MatInput;

  @ViewChild('symbolAutocomplete') public symbolAutocomplete: MatAutocomplete;

  public control = new FormControl();
  public filteredLookupItems: LookupItem[] = [];
  public filteredLookupItemsObservable: Observable<LookupItem[]> = of([]);

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

  public ngOnInit(): void {
    super.required = this.ngControl.control?.hasValidator(Validators.required);

    if (this.disabled) {
      this.control.disable();
    }

    this.control.valueChanges
      .pipe(
        debounceTime(400),
        distinctUntilChanged(),
        filter((query) => isString(query) && query.length > 1),
        tap(() => (this.isLoading = true)),
        switchMap((query: string) => this.dataService.fetchSymbols(query))
      )
      .subscribe((filteredLookupItems) => {
        this.isLoading = false;
        this.filteredLookupItems = filteredLookupItems;
        this.changeDetectorRef.markForCheck();
      });
  }

  public displayFn(aLookupItem: LookupItem) {
    return aLookupItem?.symbol ?? '';
  }

  public get empty(): boolean {
    return this.input?.empty;
  }

  public focus(): void {
    this.input.focus();
  }

  public isValueInOptions(value: string): boolean {
    return this.filteredLookupItems.some((item) => {
      return item.symbol === value;
    });
  }

  public ngDoCheck(): void {
    if (this.ngControl) {
      this.validateRequired();
      this.validateSelection();
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

  public ngOnDestroy(): void {
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

  private validateSelection() {
    const error =
      !this.isValueInOptions(this.input?.value) ||
      this.input?.value !== super.value?.symbol;
    if (error) {
      this.ngControl.control.setErrors({ invalidData: true });
    }
  }
}
