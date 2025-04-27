import { GfSymbolAutocompleteComponent } from '@ghostfolio/ui/symbol-autocomplete';

import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit
} from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  ValidationErrors,
  Validators
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { Subject } from 'rxjs';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'h-100' },
  imports: [
    CommonModule,
    FormsModule,
    GfSymbolAutocompleteComponent,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    ReactiveFormsModule
  ],
  selector: 'gf-create-watchlist-item-dialog',
  styleUrls: ['./create-watchlist-item-dialog.component.scss'],
  templateUrl: 'create-watchlist-item-dialog.html'
})
export class CreateWatchlistItemDialogComponent implements OnInit, OnDestroy {
  public createWatchlistItemForm: FormGroup;

  private unsubscribeSubject = new Subject<void>();

  public constructor(
    public readonly dialogRef: MatDialogRef<CreateWatchlistItemDialogComponent>,
    public readonly formBuilder: FormBuilder
  ) {}

  public ngOnInit() {
    this.createWatchlistItemForm = this.formBuilder.group(
      {
        searchSymbol: new FormControl(null, [Validators.required])
      },
      {
        validators: this.validator
      }
    );
  }

  public onCancel() {
    this.dialogRef.close();
  }

  public onSubmit() {
    this.dialogRef.close({
      dataSource:
        this.createWatchlistItemForm.get('searchSymbol').value.dataSource,
      symbol: this.createWatchlistItemForm.get('searchSymbol').value.symbol
    });
  }

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }

  private validator(control: AbstractControl): ValidationErrors {
    const searchSymbolControl = control.get('searchSymbol');

    if (
      searchSymbolControl.valid &&
      searchSymbolControl.value.dataSource &&
      searchSymbolControl.value.symbol
    ) {
      return { incomplete: false };
    }

    return { incomplete: true };
  }
}
