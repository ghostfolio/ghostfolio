import { COMMA, ENTER } from '@angular/cdk/keycodes';
import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  effect,
  ElementRef,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output,
  signal,
  ViewChild
} from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import {
  MatAutocompleteModule,
  MatAutocompleteSelectedEvent
} from '@angular/material/autocomplete';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Tag } from '@prisma/client';
import { BehaviorSubject, Subject, takeUntil } from 'rxjs';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    MatAutocompleteModule,
    MatChipsModule,
    MatFormFieldModule,
    MatInputModule,
    ReactiveFormsModule
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  selector: 'gf-tags-selector',
  styleUrls: ['./tags-selector.component.scss'],
  templateUrl: 'tags-selector.component.html'
})
export class GfTagsSelectorComponent implements OnInit, OnDestroy {
  @Input() tags: Tag[];
  @Input() tagsAvailable: Tag[];
  @Input() withoutHint: boolean;

  @Output() tagsChanged = new EventEmitter<Tag[]>();

  @ViewChild('tagInput') tagInput: ElementRef<HTMLInputElement>;

  public filteredOptions: Subject<Tag[]> = new BehaviorSubject([]);
  public readonly tagInputControl = new FormControl('');
  public readonly tagsSelected = signal<Tag[]>([]);
  public readonly separatorKeysCodes: number[] = [COMMA, ENTER];

  private unsubscribeSubject = new Subject<void>();

  public constructor() {
    effect(() => {
      if (this.tagsSelected()) {
        this.tagsChanged.emit(this.tagsSelected());
      }
    });
    this.tagInputControl.valueChanges
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((value) => {
        this.filteredOptions.next(this.filterTags(value));
      });
  }

  public ngOnInit() {
    this.tagsSelected.set(this.tags);
    this.updateFilters();
  }

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }

  public onAddTag(event: MatAutocompleteSelectedEvent) {
    const tag = this.tagsAvailable.find(({ id }) => {
      return id === event.option.value;
    });
    this.tagsSelected.update((tags) => {
      return [...(tags ?? []), tag];
    });
    this.tagInput.nativeElement.value = '';
    this.tagInputControl.setValue(undefined);
  }

  public onRemoveTag(tag: Tag) {
    this.tagsSelected.update((tags) => {
      return tags.filter(({ id }) => {
        return id !== tag.id;
      });
    });
    this.updateFilters();
  }

  private filterTags(query: string = ''): Tag[] {
    const tags = this.tagsSelected() ?? [];
    const tagIds = tags.map(({ id }) => {
      return id;
    });

    return this.tagsAvailable.filter(({ id, name }) => {
      return (
        !tagIds.includes(id) && name.toLowerCase().includes(query.toLowerCase())
      );
    });
  }

  private updateFilters() {
    this.filteredOptions.next(this.filterTags());
  }
}
