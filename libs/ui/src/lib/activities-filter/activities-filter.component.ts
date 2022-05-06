import { COMMA, ENTER } from '@angular/cdk/keycodes';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  ViewChild
} from '@angular/core';
import { FormControl } from '@angular/forms';
import {
  MatAutocomplete,
  MatAutocompleteSelectedEvent
} from '@angular/material/autocomplete';
import { MatChipInputEvent } from '@angular/material/chips';
import { Filter } from '@ghostfolio/common/interfaces';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'gf-activities-filter',
  styleUrls: ['./activities-filter.component.scss'],
  templateUrl: './activities-filter.component.html'
})
export class ActivitiesFilterComponent implements OnChanges, OnDestroy {
  @Input() allFilters: Filter[];
  @Input() isLoading: boolean;
  @Input() placeholder: string;

  @Output() valueChanged = new EventEmitter<Filter[]>();

  @ViewChild('autocomplete') matAutocomplete: MatAutocomplete;
  @ViewChild('searchInput') searchInput: ElementRef<HTMLInputElement>;

  public filters$: Subject<Filter[]> = new BehaviorSubject([]);
  public filters: Observable<Filter[]> = this.filters$.asObservable();
  public searchControl = new FormControl();
  public searchFilters: Filter[] = [];
  public separatorKeysCodes: number[] = [ENTER, COMMA];

  private unsubscribeSubject = new Subject<void>();

  public constructor() {
    this.searchControl.valueChanges
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((currentFilter) => {
        if (currentFilter) {
          this.filters$.next(
            this.allFilters.filter((filter) => filter.id === currentFilter.id)
          );
        } else {
          this.filters$.next(this.allFilters);
        }
      });
  }

  public ngOnChanges(changes: SimpleChanges) {
    if (changes.allFilters?.currentValue) {
      this.updateFilter();
    }
  }

  public onAddFilter({ input, value }: MatChipInputEvent): void {
    if (value?.trim()) {
      this.updateFilter();
    }

    // Reset the input value
    if (input) {
      input.value = '';
    }

    this.searchControl.setValue(null);
  }

  public onRemoveFilter(aFilter: Filter): void {
    this.searchFilters = this.searchFilters.filter((filter) => {
      return filter.id !== aFilter.id;
    });

    this.updateFilter();
  }

  public onSelectFilter(event: MatAutocompleteSelectedEvent): void {
    this.searchFilters.push(event.option.value);
    this.updateFilter();
    this.searchInput.nativeElement.value = '';
    this.searchControl.setValue(null);
  }

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }

  private updateFilter() {
    this.filters$.next(this.allFilters);

    // Emit an array with a new reference
    this.valueChanged.emit([...this.searchFilters]);
  }
}
