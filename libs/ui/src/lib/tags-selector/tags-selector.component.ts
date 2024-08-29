// import { CreateOrUpdateActivityDialogParams } from './interfaces/interfaces';
import { Activity } from '@ghostfolio/api/app/order/interfaces/activities.interface';

import { FocusMonitor } from '@angular/cdk/a11y';
import { COMMA, ENTER } from '@angular/cdk/keycodes';
import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
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
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import {
  MatAutocompleteTrigger,
  MatAutocompleteModule,
  MatAutocompleteSelectedEvent
} from '@angular/material/autocomplete';
import {
  MatChipEditedEvent,
  MatChipInputEvent,
  MatChipsModule
} from '@angular/material/chips';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import {
  MatFormFieldControl,
  MatFormFieldModule
} from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInput, MatInputModule } from '@angular/material/input';
import { Tag } from '@prisma/client';
import { map, Observable, of, startWith, Subject } from 'rxjs';

import { translate } from '../i18n';
import { AbstractMatFormField } from '../shared/abstract-mat-form-field';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  // host: {
  //   '[attr.aria-describedBy]': 'describedBy',
  //   '[id]': 'id'
  // },
  imports: [
    CommonModule,
    FormsModule,
    MatAutocompleteModule,
    MatFormFieldModule,
    MatInputModule,
    MatChipsModule,
    MatIconModule,
    ReactiveFormsModule
  ],
  // providers: [
  //   {
  //     provide: MatFormFieldControl,
  //     useExisting: GfTagsSelectorComponent
  //   }
  // ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  selector: 'gf-tags-selector',
  standalone: true,
  styleUrls: ['./tags-selector.component.scss'],
  templateUrl: 'tags-selector.component.html'
})
export class GfTagsSelectorComponent implements OnInit {
  public focus(): void {
    throw new Error('Method not implemented.');
  }
  @Input() tags: Tag[];
  @Input() tagsAvailable: Tag[];

  @Output() tagsChanged = new EventEmitter<Tag[]>();

  @ViewChild('tagInput') tagInput: ElementRef<HTMLInputElement>;

  // public activityForm: FormGroup;
  public filteredTagsObservable: Observable<Tag[]> = of([]);
  public separatorKeysCodes: number[] = [COMMA, ENTER];

  readonly fruits = signal([{ id: '', name: '' }]);

  readonly currentFruit = model('');

  readonly filteredFruits = computed(() => {
    const currentFruit = this.currentFruit().toLowerCase();
    const aTags = this.tagsAvailable
      ? this.tagsAvailable
      : [{ id: '', name: '' }];
    return currentFruit
      ? aTags.filter((tag) => tag.name.toLowerCase().includes(currentFruit))
      : this.tagsAvailable;
  });

  public constructor() {
    effect(() => {
      if (this.fruits()) {
        console.log('Emit Fruits: ', this.fruits());
        this.tagsChanged.emit(this.fruits());
      }
    });
  }

  ngOnInit() {
    this.fruits.set(this.tags);

    console.log('Tags Available : ', this.tagsAvailable);
    console.log('Tags : ', this.tags);
  }

  public onAddTag(event: MatAutocompleteSelectedEvent) {
    if (
      this.fruits() &&
      this.fruits().some((el) => el.id === event.option.value)
    ) {
      this.currentFruit.set('');
      event.option.deselect();
      return;
    }

    this.fruits()
      ? this.fruits.update((fruits) => [
          ...fruits,
          this.tagsAvailable.find(({ id }) => {
            return id === event.option.value;
          })
        ])
      : this.fruits.update(() => [
          this.tagsAvailable.find(({ id }) => {
            return id === event.option.value;
          })
        ]);
    this.currentFruit.set('');
    event.option.deselect();
  }

  public onRemoveTag(aTag: Tag) {
    this.fruits.update((fruits) => {
      const index = fruits.indexOf(aTag);
      if (index < 0) {
        return fruits;
      }

      fruits.splice(index, 1);
      return [...fruits];
    });
  }
}
