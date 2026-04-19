import type { AssetProfileIdentifier } from '@ghostfolio/common/interfaces';
import { GfSymbolAutocompleteComponent } from '@ghostfolio/ui/symbol-autocomplete';

import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import {
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
export class GfCreateWatchlistItemDialogComponent {
  protected readonly createWatchlistItemForm: CreateWatchlistItemForm =
    new FormGroup(
      {
        searchSymbol: new FormControl<AssetProfileIdentifier | null>(null, [
          Validators.required
        ])
      },
      {
        validators: this.validator
      }
    );

  private readonly dialogRef =
    inject<MatDialogRef<GfCreateWatchlistItemDialogComponent>>(MatDialogRef);

  protected onCancel() {
    this.dialogRef.close();
  }

  protected onSubmit() {
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
