import { AdminService } from '@ghostfolio/client/services/admin.service';
import { DataService } from '@ghostfolio/client/services/data.service';

import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  Inject,
  OnDestroy
} from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { DateAdapter, MAT_DATE_LOCALE } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Subject, takeUntil } from 'rxjs';

import { HistoricalMarketDataEditorDialogParams } from './interfaces/interfaces';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'h-100' },
  imports: [
    FormsModule,
    MatButtonModule,
    MatDatepickerModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    ReactiveFormsModule
  ],
  selector: 'gf-historical-market-data-editor-dialog',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  styleUrls: ['./historical-market-data-editor-dialog.scss'],
  templateUrl: 'historical-market-data-editor-dialog.html'
})
export class GfHistoricalMarketDataEditorDialogComponent implements OnDestroy {
  private unsubscribeSubject = new Subject<void>();

  public constructor(
    private adminService: AdminService,
    private changeDetectorRef: ChangeDetectorRef,
    @Inject(MAT_DIALOG_DATA)
    public data: HistoricalMarketDataEditorDialogParams,
    private dataService: DataService,
    private dateAdapter: DateAdapter<any>,
    public dialogRef: MatDialogRef<GfHistoricalMarketDataEditorDialogComponent>,
    @Inject(MAT_DATE_LOCALE) private locale: string
  ) {}

  public ngOnInit() {
    this.locale = this.data.user?.settings?.locale;
    this.dateAdapter.setLocale(this.locale);
  }

  public onCancel() {
    this.dialogRef.close({ withRefresh: false });
  }

  public onFetchSymbolForDate() {
    this.adminService
      .fetchSymbolForDate({
        dataSource: this.data.dataSource,
        dateString: this.data.dateString,
        symbol: this.data.symbol
      })
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe(({ marketPrice }) => {
        this.data.marketPrice = marketPrice;

        this.changeDetectorRef.markForCheck();
      });
  }

  public onUpdate() {
    this.dataService
      .postMarketData({
        dataSource: this.data.dataSource,
        marketData: {
          marketData: [
            {
              date: this.data.dateString,
              marketPrice: this.data.marketPrice
            }
          ]
        },
        symbol: this.data.symbol
      })
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe(() => {
        this.dialogRef.close({ withRefresh: true });
      });
  }

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }
}
