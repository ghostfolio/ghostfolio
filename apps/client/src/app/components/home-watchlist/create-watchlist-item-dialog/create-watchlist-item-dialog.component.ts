import { GfSymbolAutocompleteComponent } from '@ghostfolio/ui/symbol-autocomplete';

import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormsModule,
  ReactiveFormsModule,
  ValidationErrors,
  Validators
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { SymbolProfile } from '@prisma/client';

import { CreateWatchlistItemForm } from './interfaces/interfaces';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'h-100' },
  imports: [
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
export class GfCreateWatchlistItemDialogComponent implements OnInit {
  public createWatchlistItemForm: CreateWatchlistItemForm;

  public constructor(
    public readonly dialogRef: MatDialogRef<GfCreateWatchlistItemDialogComponent>,
    public readonly formBuilder: FormBuilder
  ) {}

  public ngOnInit() {
    this.createWatchlistItemForm = this.formBuilder.group(
      {
        searchSymbol: new FormControl<SymbolProfile | null>(null, [
          Validators.required
        ])
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
        this.createWatchlistItemForm.controls.searchSymbol.value?.dataSource,
      symbol: this.createWatchlistItemForm.controls.searchSymbol.value?.symbol
    });
  }

  private validator(control: CreateWatchlistItemForm): ValidationErrors {
    const searchSymbolControl = control.controls.searchSymbol;

    if (
      searchSymbolControl.valid &&
      searchSymbolControl.value?.dataSource &&
      searchSymbolControl.value?.symbol
    ) {
      return { incomplete: false };
    }

    return { incomplete: true };
  }
}
