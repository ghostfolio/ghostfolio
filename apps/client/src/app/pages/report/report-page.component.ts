import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { PortfolioReportRule } from '@ghostfolio/api/app/portfolio/interfaces/portfolio-report.interface';
import { DataService } from '@ghostfolio/client/services/data.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'gf-report-page',
  templateUrl: './report-page.html',
  styleUrls: ['./report-page.scss']
})
export class ReportPageComponent implements OnInit {
  public currencyClusterRiskRules: PortfolioReportRule[];
  public feeRules: PortfolioReportRule[];
  public platformClusterRiskRules: PortfolioReportRule[];

  private unsubscribeSubject = new Subject<void>();

  /**
   * @constructor
   */
  public constructor(
    private cd: ChangeDetectorRef,
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
        this.currencyClusterRiskRules =
          portfolioReport.rules['currencyClusterRisk'] || null;
        this.feeRules = portfolioReport.rules['fees'] || null;
        this.platformClusterRiskRules =
          portfolioReport.rules['platformClusterRisk'] || null;

        this.cd.markForCheck();
      });
  }

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }
}
