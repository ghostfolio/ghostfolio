import { AdminService, DataService } from '@ghostfolio/ui/services';

import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  inject,
  OnDestroy,
  OnInit
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
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { calendarClearOutline, refreshOutline } from 'ionicons/icons';
import { Subject, takeUntil } from 'rxjs';

import { HistoricalMarketDataEditorDialogParams } from './interfaces/interfaces';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'h-100' },
  imports: [
    FormsModule,
    IonIcon,
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
export class GfHistoricalMarketDataEditorDialogComponent
  implements OnDestroy, OnInit
{
  public readonly data =
    inject<HistoricalMarketDataEditorDialogParams>(MAT_DIALOG_DATA);

  private readonly locale =
    this.data.user.settings.locale ?? inject<string>(MAT_DATE_LOCALE);
  private readonly unsubscribeSubject = new Subject<void>();

  public constructor(
    private adminService: AdminService,
    private changeDetectorRef: ChangeDetectorRef,
    private dataService: DataService,
    private dateAdapter: DateAdapter<Date, string>,
    public dialogRef: MatDialogRef<GfHistoricalMarketDataEditorDialogComponent>
  ) {
    addIcons({ calendarClearOutline, refreshOutline });
  }

  public ngOnInit() {
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
    if (this.data.marketPrice === undefined) {
      return;
    }

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
