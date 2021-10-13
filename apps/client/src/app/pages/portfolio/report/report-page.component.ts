import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { DataService } from '@ghostfolio/client/services/data.service';
import { PortfolioReportRule } from '@ghostfolio/common/interfaces';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  host: { class: 'mb-5' },
  selector: 'gf-report-page',
  styleUrls: ['./report-page.scss'],
  templateUrl: './report-page.html'
})
export class ReportPageComponent implements OnDestroy, OnInit {
  public accountClusterRiskRules: PortfolioReportRule[];
  public currencyClusterRiskRules: PortfolioReportRule[];
  public feeRules: PortfolioReportRule[];

  private unsubscribeSubject = new Subject<void>();

  /**
   * @constructor
   */
  public constructor(
    private changeDetectorRef: ChangeDetectorRef,
    private dataService: DataService
  ) {}

  /**
   * Initializes the controller
   */
  public ngOnInit() {
    this.dataService
      .fetchPortfolioReport()
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((portfolioReport) => {
        this.accountClusterRiskRules =
          portfolioReport.rules['accountClusterRisk'] || null;
        this.currencyClusterRiskRules =
          portfolioReport.rules['currencyClusterRisk'] || null;
        this.feeRules = portfolioReport.rules['fees'] || null;

        this.changeDetectorRef.markForCheck();
      });
  }

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }
}
