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
  ViewChild
} from '@angular/core';
import { FormControl } from '@angular/forms';
import {
  MatAutocomplete,
  MatAutocompleteSelectedEvent
} from '@angular/material/autocomplete';
import { MatChipInputEvent } from '@angular/material/chips';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'gf-activities-filter',
  styleUrls: ['./activities-filter.component.scss'],
  templateUrl: './activities-filter.component.html'
})
export class ActivitiesFilterComponent implements OnChanges, OnDestroy {
  @Input() allFilters: string[];
  @Input() placeholder: string;

  @Output() valueChanged = new EventEmitter<string[]>();

  @ViewChild('autocomplete') matAutocomplete: MatAutocomplete;
  @ViewChild('searchInput') searchInput: ElementRef<HTMLInputElement>;

  public filters$: Subject<string[]> = new BehaviorSubject([]);
  public filters: Observable<string[]> = this.filters$.asObservable();
  public searchControl = new FormControl();
  public searchKeywords: string[] = [];
  public separatorKeysCodes: number[] = [ENTER, COMMA];

  private unsubscribeSubject = new Subject<void>();

  public constructor() {
    this.searchControl.valueChanges
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((keyword) => {
        if (keyword) {
          const filterValue = keyword.toLowerCase();
          this.filters$.next(
            this.allFilters.filter(
              (filter) => filter.toLowerCase().indexOf(filterValue) === 0
            )
          );
        } else {
          this.filters$.next(this.allFilters);
        }
      });
  }

  public ngOnChanges() {
    if (this.allFilters) {
      this.updateFilter();
    }
  }

  public addKeyword({ input, value }: MatChipInputEvent): void {
    if (value?.trim()) {
      this.searchKeywords.push(value.trim());
      this.updateFilter();
    }

    // Reset the input value
    if (input) {
      input.value = '';
    }

    this.searchControl.setValue(null);
  }

  public keywordSelected(event: MatAutocompleteSelectedEvent): void {
    this.searchKeywords.push(event.option.viewValue);
    this.updateFilter();
    this.searchInput.nativeElement.value = '';
    this.searchControl.setValue(null);
  }

  public removeKeyword(keyword: string): void {
    const index = this.searchKeywords.indexOf(keyword);

    if (index >= 0) {
      this.searchKeywords.splice(index, 1);
      this.updateFilter();
    }
  }

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }

  private updateFilter() {
    this.filters$.next(this.allFilters);

    this.valueChanged.emit(this.searchKeywords);
  }
}
