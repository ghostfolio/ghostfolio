import { AdminService, DataService } from '@ghostfolio/ui/services';

import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  DestroyRef,
  OnInit,
  inject,
  signal
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
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
export class GfHistoricalMarketDataEditorDialogComponent implements OnInit {
  public readonly data =
    inject<HistoricalMarketDataEditorDialogParams>(MAT_DIALOG_DATA);

  protected readonly marketPrice = signal(this.data.marketPrice);

  private readonly destroyRef = inject(DestroyRef);
  private readonly locale =
    this.data.user.settings.locale ?? inject<string>(MAT_DATE_LOCALE);

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
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ marketPrice }) => {
        this.marketPrice.set(marketPrice);

        this.changeDetectorRef.markForCheck();
      });
  }

  public onUpdate() {
    if (this.marketPrice() === undefined) {
      return;
    }

    this.dataService
      .postMarketData({
        dataSource: this.data.dataSource,
        marketData: {
          marketData: [
            {
              date: this.data.dateString,
              marketPrice: this.marketPrice()
            }
          ]
        },
        symbol: this.data.symbol
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.dialogRef.close({ withRefresh: true });
      });
  }
}
