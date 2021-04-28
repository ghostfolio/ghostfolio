import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Inject
} from '@angular/core';
import { FormControl, Validators } from '@angular/forms';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { LookupItem } from '@ghostfolio/api/app/symbol/interfaces/lookup-item.interface';
import { Currency } from '@prisma/client';
import { Observable, Subject } from 'rxjs';
import {
  debounceTime,
  distinctUntilChanged,
  startWith,
  switchMap,
  takeUntil
} from 'rxjs/operators';

import { DataService } from '../../../services/data.service';
import { CreateOrUpdateTransactionDialogParams } from './interfaces/interfaces';

@Component({
  host: { class: 'h-100' },
  selector: 'create-or-update-transaction-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['./create-or-update-transaction-dialog.scss'],
  templateUrl: 'create-or-update-transaction-dialog.html'
})
export class CreateOrUpdateTransactionDialog {
  public currencies: Currency[] = [];
  public filteredLookupItems: Observable<LookupItem[]>;
  public isLoading = false;
  public platforms: { id: string; name: string }[];
  public searchSymbolCtrl = new FormControl(
    this.data.transaction.symbol,
    Validators.required
  );

  private unsubscribeSubject = new Subject<void>();

  public constructor(
    private cd: ChangeDetectorRef,
    private dataService: DataService,
    public dialogRef: MatDialogRef<CreateOrUpdateTransactionDialog>,
    @Inject(MAT_DIALOG_DATA) public data: CreateOrUpdateTransactionDialogParams
  ) {}

  ngOnInit() {
    this.dataService.fetchInfo().subscribe(({ currencies, platforms }) => {
      this.currencies = currencies;
      this.platforms = platforms;
    });

    this.filteredLookupItems = this.searchSymbolCtrl.valueChanges.pipe(
      startWith(''),
      debounceTime(400),
      distinctUntilChanged(),
      switchMap((aQuery: string) => {
        if (aQuery) {
          return this.dataService.fetchSymbols(aQuery);
        }

        return [];
      })
    );
  }

  public onCancel(): void {
    this.dialogRef.close();
  }

  public onUpdateSymbol(event: MatAutocompleteSelectedEvent) {
    this.isLoading = true;
    this.data.transaction.symbol = event.option.value;

    this.dataService
      .fetchSymbolItem(this.data.transaction.symbol)
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe(({ currency, dataSource, marketPrice }) => {
        this.data.transaction.currency = currency;
        this.data.transaction.dataSource = dataSource;
        this.data.transaction.unitPrice = marketPrice;

        this.isLoading = false;

        this.cd.markForCheck();
      });
  }

  public onUpdateSymbolByTyping(value: string) {
    this.data.transaction.currency = null;
    this.data.transaction.dataSource = null;
    this.data.transaction.unitPrice = null;

    this.data.transaction.symbol = value;
  }

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }
}
