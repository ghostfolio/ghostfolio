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
import { Currency, Order as OrderModel } from '@prisma/client';
import { Observable, Subject } from 'rxjs';
import {
  debounceTime,
  distinctUntilChanged,
  startWith,
  switchMap,
  takeUntil
} from 'rxjs/operators';

import { DataService } from '../../../services/data.service';

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
    this.data.symbol,
    Validators.required
  );

  private unsubscribeSubject = new Subject<void>();

  public constructor(
    private cd: ChangeDetectorRef,
    private dataService: DataService,
    public dialogRef: MatDialogRef<CreateOrUpdateTransactionDialog>,
    @Inject(MAT_DIALOG_DATA) public data: OrderModel
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
    this.data.symbol = event.option.value;

    this.dataService
      .fetchSymbolItem(this.data.symbol)
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe(({ currency, marketPrice }) => {
        this.data.currency = currency;
        this.data.unitPrice = marketPrice;

        this.isLoading = false;

        this.cd.markForCheck();
      });
  }

  public onUpdateSymbolByTyping(value: string) {
    this.data.currency = null;
    this.data.unitPrice = null;

    this.data.symbol = value;
  }

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }
}
