import { Filter, FilterGroup } from '@ghostfolio/common/interfaces';
import { GfSymbolPipe } from '@ghostfolio/common/pipes';

import { COMMA, ENTER } from '@angular/cdk/keycodes';
import { CommonModule } from '@angular/common';
import {
  CUSTOM_ELEMENTS_SCHEMA,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Input,
  OnChanges,
  SimpleChanges,
  ViewChild,
  input,
  output
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import {
  MatAutocomplete,
  MatAutocompleteModule,
  MatAutocompleteSelectedEvent
} from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatChipInputEvent, MatChipsModule } from '@angular/material/chips';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { closeOutline, searchOutline } from 'ionicons/icons';
import { groupBy } from 'lodash';
import { BehaviorSubject } from 'rxjs';

import { translate } from '../i18n';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    GfSymbolPipe,
    IonIcon,
    MatAutocompleteModule,
    MatButtonModule,
    MatChipsModule,
    MatInputModule,
    MatProgressSpinnerModule,
    ReactiveFormsModule
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  selector: 'gf-activities-filter',
  styleUrls: ['./activities-filter.component.scss'],
  templateUrl: './activities-filter.component.html'
})
export class GfActivitiesFilterComponent implements OnChanges {
  @Input() allFilters: Filter[];

  @ViewChild('autocomplete') protected matAutocomplete: MatAutocomplete;
  @ViewChild('searchInput') protected searchInput: ElementRef<HTMLInputElement>;

  public readonly isLoading = input.required<boolean>();
  public readonly placeholder = input.required<string>();
  public readonly valueChanged = output<Filter[]>();

  protected readonly filterGroups$ = new BehaviorSubject<FilterGroup[]>([]);
  protected readonly searchControl = new FormControl<Filter | string | null>(
    null
  );
  protected selectedFilters: Filter[] = [];
  protected readonly separatorKeysCodes: number[] = [ENTER, COMMA];

  public constructor() {
    this.searchControl.valueChanges
      .pipe(takeUntilDestroyed())
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

    addIcons({ closeOutline, searchOutline });
  }

  public ngOnChanges(changes: SimpleChanges) {
    if (changes.allFilters?.currentValue) {
      this.updateFilters();
    }
  }

  public onAddFilter({ chipInput, value }: MatChipInputEvent) {
    if (value?.trim()) {
      this.updateFilters();
    }

    // Reset the input value
    if (chipInput.inputElement) {
      chipInput.inputElement.value = '';
    }

    this.searchControl.setValue(null);
  }

  public onRemoveFilter(aFilter: Filter) {
    this.selectedFilters = this.selectedFilters.filter(({ id }) => {
      return id !== aFilter.id;
    });

    this.updateFilters();
  }

  public onSelectFilter(event: MatAutocompleteSelectedEvent) {
    const filter = this.allFilters.find(({ id }) => {
      return id === event.option.value;
    });

    if (filter) {
      this.selectedFilters.push(filter);
    }

    this.updateFilters();
    this.searchInput.nativeElement.value = '';
    this.searchControl.setValue(null);
  }

  private getGroupedFilters(searchTerm?: string) {
    const filterGroupsMap = groupBy(
      this.allFilters
        .filter((filter) => {
          // Filter selected filters
          return !this.selectedFilters.some(({ id }) => {
            return id === filter.id;
          });
        })
        .filter((filter) => {
          if (searchTerm) {
            // Filter by search term
            return filter.label
              ?.toLowerCase()
              .includes(searchTerm.toLowerCase());
          }

          return filter;
        })
        .sort((a, b) => (a.label ?? '').localeCompare(b.label ?? '')),
      ({ type }) => {
        return type;
      }
    );

    const filterGroups: FilterGroup[] = [];

    for (const type of Object.keys(filterGroupsMap)) {
      filterGroups.push({
        name: translate(type) as Filter['type'],
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
