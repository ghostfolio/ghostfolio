import { COMMA, ENTER } from '@angular/cdk/keycodes';
import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  CUSTOM_ELEMENTS_SCHEMA,
  effect,
  ElementRef,
  EventEmitter,
  Input,
  OnInit,
  Output,
  signal,
  ViewChild
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  MatAutocompleteModule,
  MatAutocompleteSelectedEvent
} from '@angular/material/autocomplete';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { Tag } from '@prisma/client';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    MatAutocompleteModule,
    MatFormFieldModule,
    MatInputModule,
    MatChipsModule,
    MatIconModule
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  selector: 'gf-tags-selector',
  styleUrls: ['./tags-selector.component.scss'],
  templateUrl: 'tags-selector.component.html'
})
export class GfTagsSelectorComponent implements OnInit {
  @Input() tags: Tag[];
  @Input() tagsAvailable: Tag[];

  @Output() tagsChanged = new EventEmitter<Tag[]>();

  @ViewChild('tagInput') tagInput: ElementRef<HTMLInputElement>;

  public readonly tagsSelected = signal<Tag[]>([]);
  public readonly separatorKeysCodes: number[] = [COMMA, ENTER];
  public readonly tagsUnselected = computed(() => {
    const tags = this.tagsSelected();
    return tags ? this.filterTags(tags) : this.tagsAvailable.slice();
  });

  public constructor() {
    effect(() => {
      if (this.tagsSelected()) {
        this.tagsChanged.emit(this.tagsSelected());
      }
    });
  }

  public ngOnInit() {
    this.tagsSelected.set(this.tags);
  }

  public onAddTag(event: MatAutocompleteSelectedEvent) {
    const tag = this.tagsAvailable.find(({ id }) => {
      return id === event.option.value;
    });
    this.tagsSelected.update((tags) => {
      return [...(tags ?? []), tag];
    });
    this.tagInput.nativeElement.value = '';
  }

  public onRemoveTag(tag: Tag) {
    this.tagsSelected.update((tags) => {
      return tags.filter(({ id }) => {
        return id !== tag.id;
      });
    });
  }

  private filterTags(tagsSelected: Tag[]) {
    const tagIds = tagsSelected.map(({ id }) => {
      return id;
    });

    return this.tagsAvailable.filter(({ id }) => {
      return !tagIds.includes(id);
    });
  }
}
