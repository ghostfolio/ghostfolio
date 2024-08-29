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
  model,
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
  standalone: true,
  styleUrls: ['./tags-selector.component.scss'],
  templateUrl: 'tags-selector.component.html'
})
export class GfTagsSelectorComponent implements OnInit {
  @Input() tags: Tag[];
  @Input() tagsAvailable: Tag[];

  @Output() tagsChanged = new EventEmitter<Tag[]>();

  @ViewChild('tagInput') tagInput: ElementRef<HTMLInputElement>;

  readonly tagsSignal = signal([{ id: '', name: '' }]);
  readonly currentFruit = model('');
  readonly filteredTags = computed(() => {
    const currentFruit = this.currentFruit().toLowerCase();
    const aTags = this.tagsAvailable ?? [{ id: '', name: '' }];
    const bTags = this.tagsSignal() ?? [{ id: '', name: '' }];
    const cTags = aTags.filter((value) => !bTags.includes(value));

    return currentFruit
      ? cTags.filter((tag) => tag.name.toLowerCase().includes(currentFruit))
      : cTags;
  });

  public constructor() {
    effect(() => {
      if (this.tagsSignal()) {
        this.tagsChanged.emit(this.tagsSignal());
      }
    });
  }

  ngOnInit() {
    this.tagsSignal.set(this.tags);
  }

  public onAddTag(event: MatAutocompleteSelectedEvent) {
    const tagId = event.option.value;
    const newTag = this.tagsAvailable.find(({ id }) => id === tagId);

    if (this.tagsSignal()?.some((el) => el.id === tagId)) {
      this.currentFruit.set('');
      event.option.deselect();
      return;
    }

    this.tagsSignal()
      ? this.tagsSignal.update((tags) => [...tags, newTag])
      : this.tagsSignal.update(() => [newTag]);
    this.currentFruit.set('');
    event.option.deselect();
  }

  public onRemoveTag(aTag: Tag) {
    this.tagsSignal.update((tagsSignal) => {
      const index = tagsSignal.indexOf(aTag);
      if (index < 0) {
        return tagsSignal;
      }

      tagsSignal.splice(index, 1);
      return [...tagsSignal];
    });
  }
}
