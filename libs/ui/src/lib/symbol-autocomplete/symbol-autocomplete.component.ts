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
import { isString } from 'lodash';
import { Observable, Subject, of, tap } from 'rxjs';
import {
  debounceTime,
  distinctUntilChanged,
  filter,
  switchMap
} from 'rxjs/operators';

import { DataService } from '../../../../../apps/client/src/app/services/data.service';
import { AbstractMatFormField } from '../abstract-mat-form-field';

@Component({
  host: {
    '[attr.aria-describedBy]': 'describedBy',
    '[id]': 'id'
  },
  selector: 'gf-symbol-autocomplete',
  changeDetection: ChangeDetectionStrategy.OnPush,
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
  public control = new FormControl();
  filteredLookupItemsObservable: Observable<LookupItem[]> = of([]);
  public filteredLookupItems: LookupItem[] = [];
  @Input()
  public isLoading: boolean = false;
  @ViewChild('symbolAutocomplete') symbolAutocomplete: MatAutocomplete;
  @ViewChild(MatInput, { static: false })
  private input: MatInput;
  private unsubscribeSubject = new Subject<void>();

  constructor(
    public readonly _elementRef: ElementRef,
    public readonly _focusMonitor: FocusMonitor,
    public readonly changeDetectorRef: ChangeDetectorRef,
    public readonly dataService: DataService,
    public readonly ngControl: NgControl
  ) {
    super(_elementRef, _focusMonitor, ngControl);

    this.controlType = 'symbol-autocomplete';
  }

  public set value(value: LookupItem) {
    this.control.setValue(value);
    super.value = value;
  }

  public get empty(): boolean {
    return this.input?.empty;
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

  public ngOnDestroy(): void {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
    super.ngOnDestroy();
  }

  public ngDoCheck(): void {
    if (this.ngControl) {
      this.validateRequired();
      this.validateSelection();
      this.errorState = this.ngControl.invalid && this.ngControl.touched;
      this.stateChanges.next();
    }
  }

  public focus(): void {
    this.input.focus();
  }

  public displayFn(aLookupItem: LookupItem) {
    return aLookupItem?.symbol ?? '';
  }

  public onUpdateSymbol(event: MatAutocompleteSelectedEvent) {
    super.value = {
      dataSource: event.option.value.dataSource,
      symbol: event.option.value.symbol
    } as LookupItem;
  }

  public isValueInOptions(value: string): boolean {
    return this.filteredLookupItems.some((item) => item.symbol === value);
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
