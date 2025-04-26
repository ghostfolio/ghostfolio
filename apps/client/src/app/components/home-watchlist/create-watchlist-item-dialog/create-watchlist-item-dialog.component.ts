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
  ValidationErrors,
  Validators
} from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { Subject } from 'rxjs';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'h-100' },
  selector: 'gf-create-watchlist-item-dialog',
  styleUrls: ['./create-watchlist-item-dialog.component.scss'],
  templateUrl: 'create-watchlist-item-dialog.html',
  standalone: false
})
export class CreateWatchlistItemDialog implements OnInit, OnDestroy {
  public createWatchlistItemForm: FormGroup;

  private unsubscribeSubject = new Subject<void>();

  public constructor(
    public readonly dialogRef: MatDialogRef<CreateWatchlistItemDialog>,
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
