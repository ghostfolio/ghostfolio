import { FamilyOfficeDataService } from '@ghostfolio/client/services/family-office-data.service';
import type {
  IActivityDetail,
  IAssetClassSummary,
  IPortfolioSummary
} from '@ghostfolio/common/interfaces';
import { GfAccountingNumberPipe } from '@ghostfolio/common/pipes';

import { CommonModule, DecimalPipe, PercentPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  OnInit
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router } from '@angular/router';

export type PeriodMode = 'QUARTERLY' | 'YEARLY' | 'ALL_TIME';

export interface ComparisonDelta {
  label: string;
  primaryValue: number | null;
  comparisonValue: number | null;
  delta: number | null;
  deltaPercent: number | null;
  format: 'currency' | 'multiple' | 'percent';
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    DecimalPipe,
    FormsModule,
    GfAccountingNumberPipe,
    MatButtonToggleModule,
    MatFormFieldModule,
    MatIconModule,
    MatPaginatorModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatTableModule,
    MatTabsModule,
    MatTooltipModule,
    PercentPipe
  ],
  selector: 'gf-portfolio-views-page',
  standalone: true,
  templateUrl: './portfolio-views-page.html',
  styleUrls: ['./portfolio-views-page.scss']
})
export class PortfolioViewsPageComponent implements OnInit {
  // Period mode
  public periodMode: PeriodMode = 'YEARLY';
  public valuationYear: number = new Date().getFullYear();
  public selectedQuarter: number = Math.ceil(
    (new Date().getMonth() + 1) / 3
  );
  public availableYears: number[] = [];
  public availableQuarters = [
    { value: 1, label: 'Q1 (Jan–Mar)' },
    { value: 2, label: 'Q2 (Apr–Jun)' },
    { value: 3, label: 'Q3 (Jul–Sep)' },
    { value: 4, label: 'Q4 (Oct–Dec)' }
  ];

  // Comparison
  public comparisonEnabled = false;
  public comparisonYear: number = new Date().getFullYear() - 1;
  public comparisonQuarter: number = 1;
  public comparisonPortfolioSummary: IPortfolioSummary | null = null;
  public comparisonAssetClassSummary: IAssetClassSummary | null = null;
  public isLoadingComparisonPortfolio = false;
  public isLoadingComparisonAssetClass = false;
  public portfolioDeltas: ComparisonDelta[] = [];
  public assetClassDeltas: ComparisonDelta[] = [];

  // Tab state
  public activeTabIndex = 0;

  // Portfolio Summary (US1)
  public portfolioSummary: IPortfolioSummary | null = null;
  public portfolioSummaryColumns: string[] = [
    'entityName',
    'originalCommitment',
    'percentCalled',
    'unfundedCommitment',
    'paidIn',
    'distributions',
    'residualUsed',
    'dpi',
    'rvpi',
    'tvpi',
    'irr'
  ];

  // Asset Class Summary (US2)
  public assetClassSummary: IAssetClassSummary | null = null;
  public assetClassSummaryColumns: string[] = [
    'assetClassLabel',
    'originalCommitment',
    'percentCalled',
    'unfundedCommitment',
    'paidIn',
    'distributions',
    'residualUsed',
    'dpi',
    'rvpi',
    'tvpi',
    'irr'
  ];

  // Activity Detail (US3)
  public activityDetail: IActivityDetail | null = null;
  public activityColumns: string[] = [
    'year',
    'entityName',
    'partnershipName',
    'beginningBasis',
    'contributions',
    'interest',
    'dividends',
    'capitalGains',
    'remainingK1IncomeDed',
    'totalIncome',
    'distributions',
    'otherAdjustments',
    'endingTaxBasis',
    'endingGLBalance',
    'bookToTaxAdj',
    'endingK1CapitalAccount',
    'k1CapitalVsTaxBasisDiff',
    'excessDistribution',
    'negativeBasis',
    'deltaEndingBasis',
    'notes'
  ];
  public activityEntityFilter: string = '';
  public activityPartnershipFilter: string = '';
  public activityYearFilter: number | null = null;
  public activityPageIndex = 0;
  public activityPageSize = 50;

  // Loading states
  public isLoadingPortfolio = false;
  public isLoadingAssetClass = false;
  public isLoadingActivity = false;

  public constructor(
    private readonly changeDetectorRef: ChangeDetectorRef,
    private readonly destroyRef: DestroyRef,
    private readonly familyOfficeDataService: FamilyOfficeDataService,
    private readonly router: Router
  ) {}

  public ngOnInit() {
    const currentYear = new Date().getFullYear();

    for (let y = currentYear; y >= currentYear - 10; y--) {
      this.availableYears.push(y);
    }

    this.comparisonYear = currentYear - 1;
    this.comparisonQuarter = this.selectedQuarter;

    this.loadPortfolioSummary();
  }

  // ── Period controls ───────────────────────────────────────────────

  public get periodLabel(): string {
    return this.buildPeriodLabel(
      this.periodMode,
      this.valuationYear,
      this.selectedQuarter
    );
  }

  public get comparisonPeriodLabel(): string {
    return this.buildPeriodLabel(
      this.periodMode,
      this.comparisonYear,
      this.comparisonQuarter
    );
  }

  public onPeriodModeChange() {
    this.resetData();
    this.loadActiveTab();
  }

  public onValuationYearChange() {
    this.resetData();
    this.loadActiveTab();
  }

  public onQuarterChange() {
    this.resetData();
    this.loadActiveTab();
  }

  public onComparisonToggle() {
    if (this.comparisonEnabled) {
      this.loadComparisonData();
    } else {
      this.comparisonPortfolioSummary = null;
      this.comparisonAssetClassSummary = null;
      this.portfolioDeltas = [];
      this.assetClassDeltas = [];
    }
  }

  public onComparisonPeriodChange() {
    if (this.comparisonEnabled) {
      this.loadComparisonData();
    }
  }

  public onTabChange(index: number) {
    this.activeTabIndex = index;

    switch (index) {
      case 0:
        if (!this.portfolioSummary) {
          this.loadPortfolioSummary();
        }
        if (this.comparisonEnabled && !this.comparisonPortfolioSummary) {
          this.loadComparisonPortfolioSummary();
        }
        break;
      case 1:
        if (!this.assetClassSummary) {
          this.loadAssetClassSummary();
        }
        if (this.comparisonEnabled && !this.comparisonAssetClassSummary) {
          this.loadComparisonAssetClassSummary();
        }
        break;
      case 2:
        if (!this.activityDetail) {
          this.loadActivity();
        }
        break;
    }
  }

  public onEntityRowClick(entityId: string) {
    this.router.navigate(['/entities', entityId]);
  }

  public onAssetClassRowClick(_assetClass: string) {
    // TODO: Implement drill-down into partnerships for this asset class
  }

  public onActivityFilterChange() {
    this.activityPageIndex = 0;
    this.loadActivity();
  }

  public onActivityPageChange(event: PageEvent) {
    this.activityPageIndex = event.pageIndex;
    this.activityPageSize = event.pageSize;
    this.loadActivity();
  }

  // ── Helpers ───────────────────────────────────────────────────────

  public getDeltaClass(delta: number | null): string {
    if (delta === null || delta === 0) {
      return 'delta-neutral';
    }
    return delta > 0 ? 'delta-positive' : 'delta-negative';
  }

  public getDeltaIcon(delta: number | null): string {
    if (delta === null || delta === 0) {
      return 'remove';
    }
    return delta > 0 ? 'arrow_upward' : 'arrow_downward';
  }

  // ── Private ───────────────────────────────────────────────────────

  private buildPeriodLabel(
    mode: PeriodMode,
    year: number,
    quarter: number
  ): string {
    switch (mode) {
      case 'QUARTERLY':
        return `Q${quarter} ${year}`;
      case 'YEARLY':
        return `${year}`;
      case 'ALL_TIME':
        return 'All-Time';
    }
  }

  private buildFetchParams(
    year: number,
    quarter: number
  ): { valuationYear?: number; quarter?: number } {
    switch (this.periodMode) {
      case 'QUARTERLY':
        return { valuationYear: year, quarter };
      case 'YEARLY':
        return { valuationYear: year };
      case 'ALL_TIME':
        return { valuationYear: new Date().getFullYear() };
    }
  }

  private get primaryParams() {
    return this.buildFetchParams(this.valuationYear, this.selectedQuarter);
  }

  private get comparisonParams() {
    return this.buildFetchParams(this.comparisonYear, this.comparisonQuarter);
  }

  private resetData() {
    this.portfolioSummary = null;
    this.assetClassSummary = null;
    this.activityDetail = null;
    this.comparisonPortfolioSummary = null;
    this.comparisonAssetClassSummary = null;
    this.portfolioDeltas = [];
    this.assetClassDeltas = [];
  }

  private loadActiveTab() {
    switch (this.activeTabIndex) {
      case 0:
        this.loadPortfolioSummary();
        if (this.comparisonEnabled) {
          this.loadComparisonPortfolioSummary();
        }
        break;
      case 1:
        this.loadAssetClassSummary();
        if (this.comparisonEnabled) {
          this.loadComparisonAssetClassSummary();
        }
        break;
      case 2:
        this.loadActivity();
        break;
    }
  }

  private loadComparisonData() {
    switch (this.activeTabIndex) {
      case 0:
        this.loadComparisonPortfolioSummary();
        break;
      case 1:
        this.loadComparisonAssetClassSummary();
        break;
    }
  }

  private loadPortfolioSummary() {
    this.isLoadingPortfolio = true;
    this.changeDetectorRef.markForCheck();

    this.familyOfficeDataService
      .fetchPortfolioSummary(this.primaryParams)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        error: () => {
          this.isLoadingPortfolio = false;
          this.changeDetectorRef.markForCheck();
        },
        next: (data) => {
          this.portfolioSummary = data;
          this.isLoadingPortfolio = false;
          this.computePortfolioDeltas();
          this.changeDetectorRef.markForCheck();
        }
      });
  }

  private loadAssetClassSummary() {
    this.isLoadingAssetClass = true;
    this.changeDetectorRef.markForCheck();

    this.familyOfficeDataService
      .fetchAssetClassSummary(this.primaryParams)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        error: () => {
          this.isLoadingAssetClass = false;
          this.changeDetectorRef.markForCheck();
        },
        next: (data) => {
          this.assetClassSummary = data;
          this.isLoadingAssetClass = false;
          this.computeAssetClassDeltas();
          this.changeDetectorRef.markForCheck();
        }
      });
  }

  private loadComparisonPortfolioSummary() {
    this.isLoadingComparisonPortfolio = true;
    this.changeDetectorRef.markForCheck();

    this.familyOfficeDataService
      .fetchPortfolioSummary(this.comparisonParams)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        error: () => {
          this.isLoadingComparisonPortfolio = false;
          this.changeDetectorRef.markForCheck();
        },
        next: (data) => {
          this.comparisonPortfolioSummary = data;
          this.isLoadingComparisonPortfolio = false;
          this.computePortfolioDeltas();
          this.changeDetectorRef.markForCheck();
        }
      });
  }

  private loadComparisonAssetClassSummary() {
    this.isLoadingComparisonAssetClass = true;
    this.changeDetectorRef.markForCheck();

    this.familyOfficeDataService
      .fetchAssetClassSummary(this.comparisonParams)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        error: () => {
          this.isLoadingComparisonAssetClass = false;
          this.changeDetectorRef.markForCheck();
        },
        next: (data) => {
          this.comparisonAssetClassSummary = data;
          this.isLoadingComparisonAssetClass = false;
          this.computeAssetClassDeltas();
          this.changeDetectorRef.markForCheck();
        }
      });
  }

  private computePortfolioDeltas() {
    if (!this.portfolioSummary || !this.comparisonPortfolioSummary) {
      this.portfolioDeltas = [];
      return;
    }

    const primary = this.portfolioSummary.totals;
    const comparison = this.comparisonPortfolioSummary.totals;

    this.portfolioDeltas = [
      this.buildDelta(
        'Paid-In',
        primary.paidIn,
        comparison.paidIn,
        'currency'
      ),
      this.buildDelta(
        'Distributions',
        primary.distributions,
        comparison.distributions,
        'currency'
      ),
      this.buildDelta(
        'Residual (NAV)',
        primary.residualUsed,
        comparison.residualUsed,
        'currency'
      ),
      this.buildDelta(
        'Unfunded',
        primary.unfundedCommitment,
        comparison.unfundedCommitment,
        'currency'
      ),
      this.buildDelta('DPI', primary.dpi, comparison.dpi, 'multiple'),
      this.buildDelta('RVPI', primary.rvpi, comparison.rvpi, 'multiple'),
      this.buildDelta('TVPI', primary.tvpi, comparison.tvpi, 'multiple'),
      this.buildDelta('IRR', primary.irr, comparison.irr, 'percent')
    ];
  }

  private computeAssetClassDeltas() {
    if (!this.assetClassSummary || !this.comparisonAssetClassSummary) {
      this.assetClassDeltas = [];
      return;
    }

    const primary = this.assetClassSummary.totals;
    const comparison = this.comparisonAssetClassSummary.totals;

    this.assetClassDeltas = [
      this.buildDelta(
        'Paid-In',
        primary.paidIn,
        comparison.paidIn,
        'currency'
      ),
      this.buildDelta(
        'Distributions',
        primary.distributions,
        comparison.distributions,
        'currency'
      ),
      this.buildDelta(
        'Residual (NAV)',
        primary.residualUsed,
        comparison.residualUsed,
        'currency'
      ),
      this.buildDelta('DPI', primary.dpi, comparison.dpi, 'multiple'),
      this.buildDelta('TVPI', primary.tvpi, comparison.tvpi, 'multiple'),
      this.buildDelta('IRR', primary.irr, comparison.irr, 'percent')
    ];
  }

  private buildDelta(
    label: string,
    primaryValue: number | null,
    comparisonValue: number | null,
    format: 'currency' | 'multiple' | 'percent'
  ): ComparisonDelta {
    let delta: number | null = null;
    let deltaPercent: number | null = null;

    if (primaryValue !== null && comparisonValue !== null) {
      delta = primaryValue - comparisonValue;

      if (comparisonValue !== 0) {
        deltaPercent = delta / Math.abs(comparisonValue);
      }
    }

    return { label, primaryValue, comparisonValue, delta, deltaPercent, format };
  }

  private loadActivity() {
    this.isLoadingActivity = true;
    this.changeDetectorRef.markForCheck();

    const params: Record<string, unknown> = {
      skip: this.activityPageIndex * this.activityPageSize,
      take: this.activityPageSize
    };

    if (this.activityEntityFilter) {
      params['entityId'] = this.activityEntityFilter;
    }

    if (this.activityPartnershipFilter) {
      params['partnershipId'] = this.activityPartnershipFilter;
    }

    if (this.activityYearFilter) {
      params['year'] = this.activityYearFilter;
    }

    this.familyOfficeDataService
      .fetchActivity(params as any)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        error: () => {
          this.isLoadingActivity = false;
          this.changeDetectorRef.markForCheck();
        },
        next: (data) => {
          this.activityDetail = data;
          this.isLoadingActivity = false;
          this.changeDetectorRef.markForCheck();
        }
      });
  }
}
