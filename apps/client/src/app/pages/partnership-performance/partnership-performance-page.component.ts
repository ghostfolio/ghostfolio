import { FamilyOfficeDataService } from '@ghostfolio/client/services/family-office-data.service';
import type { IPartnershipPerformance } from '@ghostfolio/common/interfaces';
import { GfBenchmarkComparisonChartComponent } from '@ghostfolio/ui/benchmark-comparison-chart';
import { GfPerformanceMetricsComponent } from '@ghostfolio/ui/performance-metrics';

import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  OnInit
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { ActivatedRoute, RouterModule } from '@angular/router';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    GfBenchmarkComparisonChartComponent,
    GfPerformanceMetricsComponent,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatSelectModule,
    MatTableModule,
    RouterModule
  ],
  selector: 'gf-partnership-performance-page',
  standalone: true,
  styles: [
    `
      :host {
        display: block;
        padding: 1rem;
      }

      .page-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1rem;
      }

      .controls {
        display: flex;
        gap: 1rem;
        margin-bottom: 1.5rem;
        flex-wrap: wrap;
      }

      .returns-table {
        margin-top: 1.5rem;
      }

      .back-link {
        display: flex;
        align-items: center;
        gap: 4px;
        text-decoration: none;
        color: rgba(var(--dark-primary-text), 0.6);
        margin-bottom: 0.5rem;
      }

      .loading {
        text-align: center;
        padding: 3rem;
        color: rgba(var(--dark-primary-text), 0.5);
      }
    `
  ],
  template: `
    <a class="back-link" [routerLink]="['/partnerships', partnershipId]">
      <mat-icon>arrow_back</mat-icon>
      Back to Partnership
    </a>

    <div class="page-header">
      <h1>{{ performance?.partnershipName }} — Performance</h1>
    </div>

    <div class="controls">
      <mat-form-field>
        <mat-label>Periodicity</mat-label>
        <mat-select
          [(value)]="periodicity"
          (selectionChange)="fetchPerformance()"
        >
          <mat-option value="MONTHLY">Monthly</mat-option>
          <mat-option value="QUARTERLY">Quarterly</mat-option>
          <mat-option value="YEARLY">Yearly</mat-option>
        </mat-select>
      </mat-form-field>
      <mat-form-field>
        <mat-label>Benchmarks</mat-label>
        <mat-select
          multiple
          [(value)]="selectedBenchmarks"
          (selectionChange)="fetchPerformance()"
        >
          <mat-option value="SP500">S&P 500</mat-option>
          <mat-option value="US_AGG_BOND">US Agg Bond</mat-option>
          <mat-option value="REAL_ESTATE">Real Estate</mat-option>
          <mat-option value="CPI_PROXY">CPI (TIPS)</mat-option>
        </mat-select>
      </mat-form-field>
    </div>

    @if (performance) {
      <gf-performance-metrics
        [dpi]="performance.metrics.dpi"
        [irr]="performance.metrics.irr"
        [periodReturns]="periodReturns"
        [rvpi]="performance.metrics.rvpi"
        [tvpi]="performance.metrics.tvpi"
      />

      @if (performance.periods && performance.periods.length > 0) {
        <div class="returns-table">
          <h3>Period Returns Detail</h3>
          <table mat-table [dataSource]="performance.periods">
            <ng-container matColumnDef="periodStart">
              <th *matHeaderCellDef mat-header-cell>Period Start</th>
              <td *matCellDef="let p" mat-cell>
                {{ p.periodStart | date: 'mediumDate' }}
              </td>
            </ng-container>
            <ng-container matColumnDef="periodEnd">
              <th *matHeaderCellDef mat-header-cell>Period End</th>
              <td *matCellDef="let p" mat-cell>
                {{ p.periodEnd | date: 'mediumDate' }}
              </td>
            </ng-container>
            <ng-container matColumnDef="startNav">
              <th *matHeaderCellDef mat-header-cell>Start NAV</th>
              <td *matCellDef="let p" mat-cell>
                {{ p.startNav | currency: 'USD' : 'symbol' : '1.0-0' }}
              </td>
            </ng-container>
            <ng-container matColumnDef="endNav">
              <th *matHeaderCellDef mat-header-cell>End NAV</th>
              <td *matCellDef="let p" mat-cell>
                {{ p.endNav | currency: 'USD' : 'symbol' : '1.0-0' }}
              </td>
            </ng-container>
            <ng-container matColumnDef="returnPercent">
              <th *matHeaderCellDef mat-header-cell>Return</th>
              <td
                *matCellDef="let p"
                mat-cell
                [style.color]="p.returnPercent >= 0 ? '#2e7d32' : '#c62828'"
              >
                {{ p.returnPercent | percent: '1.2-2' }}
              </td>
            </ng-container>
            <tr *matHeaderRowDef="returnsColumns" mat-header-row></tr>
            <tr *matRowDef="let row; columns: returnsColumns" mat-row></tr>
          </table>
        </div>
      }

      @if (
        performance.benchmarkComparisons &&
        performance.benchmarkComparisons.length > 0
      ) {
        <div style="margin-top: 1.5rem;">
          <h3>Benchmark Comparison</h3>
          <gf-benchmark-comparison-chart
            [benchmarks]="performance.benchmarkComparisons"
            [partnershipName]="performance.partnershipName"
            [partnershipReturn]="overallReturn"
          />
        </div>
      }
    } @else {
      <div class="loading">Loading performance data...</div>
    }
  `
})
export class PartnershipPerformancePageComponent implements OnInit {
  public overallReturn: number = 0;
  public partnershipId: string = '';
  public performance: IPartnershipPerformance | null = null;
  public periodicity: string = 'QUARTERLY';
  public periodReturns: {
    endDate: string;
    return: number;
    startDate: string;
  }[] = [];
  public returnsColumns = [
    'periodStart',
    'periodEnd',
    'startNav',
    'endNav',
    'returnPercent'
  ];
  public selectedBenchmarks: string[] = [];

  public constructor(
    private readonly activatedRoute: ActivatedRoute,
    private readonly changeDetectorRef: ChangeDetectorRef,
    private readonly destroyRef: DestroyRef,
    private readonly familyOfficeDataService: FamilyOfficeDataService
  ) {}

  public ngOnInit(): void {
    this.partnershipId = this.activatedRoute.snapshot.paramMap.get('id') || '';
    this.fetchPerformance();
  }

  public fetchPerformance(): void {
    const params: any = {
      periodicity: this.periodicity
    };

    if (this.selectedBenchmarks.length > 0) {
      params.benchmarks = this.selectedBenchmarks.join(',');
    }

    this.familyOfficeDataService
      .fetchPartnershipPerformance(this.partnershipId, params)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((perf) => {
        this.performance = perf;
        this.periodReturns = (perf.periods || []).map((p: any) => ({
          endDate: p.periodEnd,
          return: p.returnPercent,
          startDate: p.periodStart
        }));
        this.overallReturn = this.periodReturns.reduce(
          (acc, p) => (1 + acc) * (1 + p.return) - 1,
          0
        );
        this.changeDetectorRef.markForCheck();
      });
  }
}
