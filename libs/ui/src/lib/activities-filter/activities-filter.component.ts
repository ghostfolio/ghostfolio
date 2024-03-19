import { Filter, FilterGroup } from '@ghostfolio/common/interfaces';
import { translate } from '@ghostfolio/ui/i18n';

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
import { groupBy } from 'lodash';
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

  public filterGroups$: Subject<FilterGroup[]> = new BehaviorSubject([]);
  public filters$: Subject<Filter[]> = new BehaviorSubject([]);
  public filters: Observable<Filter[]> = this.filters$.asObservable();
  public searchControl = new FormControl<Filter | string>(undefined);
  public selectedFilters: Filter[] = [];
  public separatorKeysCodes: number[] = [ENTER, COMMA];

  private unsubscribeSubject = new Subject<void>();

  public constructor() {
    this.searchControl.valueChanges
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((filterOrSearchTerm) => {
        if (filterOrSearchTerm) {
          const searchTerm =
            typeof filterOrSearchTerm === 'string'
              ? filterOrSearchTerm
              : filterOrSearchTerm?.label;

          this.filterGroups$.next(this.getGroupedFilters(searchTerm));
        } else {
          this.filterGroups$.next(this.getGroupedFilters());
        }
      });
  }

  public ngOnChanges(changes: SimpleChanges) {
    if (changes.allFilters?.currentValue) {
      this.updateFilters();
    }
  }

  public onAddFilter({ input, value }: MatChipInputEvent) {
    if (value?.trim()) {
      this.updateFilters();
    }

    // Reset the input value
    if (input) {
      input.value = '';
    }

    this.searchControl.setValue(undefined);
  }

  public onRemoveFilter(aFilter: Filter) {
    this.selectedFilters = this.selectedFilters.filter((filter) => {
      return filter.id !== aFilter.id;
    });

    this.updateFilters();
  }

  public onSelectFilter(event: MatAutocompleteSelectedEvent) {
    this.selectedFilters.push(
      this.allFilters.find((filter) => {
        return filter.id === event.option.value;
      })
    );
    this.updateFilters();
    this.searchInput.nativeElement.value = '';
    this.searchControl.setValue(undefined);
  }

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }

  private getGroupedFilters(searchTerm?: string) {
    const filterGroupsMap = groupBy(
      this.allFilters
        .filter((filter) => {
          // Filter selected filters
          return !this.selectedFilters.some((selectedFilter) => {
            return selectedFilter.id === filter.id;
          });
        })
        .filter((filter) => {
          if (searchTerm) {
            // Filter by search term
            return filter.label
              .toLowerCase()
              .includes(searchTerm.toLowerCase());
          }

          return filter;
        })
        .sort((a, b) => a.label?.localeCompare(b.label)),
      (filter) => {
        return filter.type;
      }
    );

    const filterGroups: FilterGroup[] = [];

    for (const type of Object.keys(filterGroupsMap)) {
      filterGroups.push({
        name: <Filter['type']>translate(type),
        filters: filterGroupsMap[type]
      });
    }

    return filterGroups
      .sort((a, b) => a.name?.localeCompare(b.name))
      .map((filterGroup) => {
        return {
          ...filterGroup,
          filters: filterGroup.filters
        };
      });
  }

  private updateFilters() {
    this.filterGroups$.next(this.getGroupedFilters());

    // Emit an array with a new reference
    this.valueChanged.emit([...this.selectedFilters]);
  }
}
