import { FamilyOfficeDataService } from '@ghostfolio/client/services/family-office-data.service';
import type {
  IEntity,
  IFamilyOfficeReport
} from '@ghostfolio/common/interfaces';
import { GfBenchmarkComparisonChartComponent } from '@ghostfolio/ui/benchmark-comparison-chart';

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
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { RouterModule } from '@angular/router';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    GfBenchmarkComparisonChartComponent,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatTableModule,
    RouterModule
  ],
  selector: 'gf-report-page',
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
        margin-bottom: 1.5rem;
      }

      .filter-row {
        display: flex;
        gap: 1rem;
        flex-wrap: wrap;
        margin-bottom: 1.5rem;
      }

      .filter-row mat-form-field {
        min-width: 160px;
      }

      .summary-cards {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 1rem;
        margin-bottom: 1.5rem;
      }

      .summary-card {
        text-align: center;
      }

      .summary-card .value {
        font-size: 1.5rem;
        font-weight: 600;
      }

      .summary-card .label {
        color: rgba(0, 0, 0, 0.6);
        font-size: 0.85rem;
        margin-top: 0.25rem;
      }

      .positive {
        color: #4caf50;
      }

      .negative {
        color: #f44336;
      }

      .section {
        margin-bottom: 1.5rem;
      }

      .section h3 {
        margin-bottom: 0.75rem;
      }

      .allocation-bar {
        display: flex;
        gap: 0.5rem;
        margin-bottom: 0.5rem;
        align-items: center;
      }

      .allocation-bar .bar {
        height: 20px;
        background-color: #1976d2;
        border-radius: 4px;
        min-width: 4px;
      }

      .allocation-bar .label {
        min-width: 140px;
        font-size: 0.85rem;
      }

      .allocation-bar .pct {
        font-size: 0.85rem;
        min-width: 50px;
        text-align: right;
      }

      .loading-container {
        display: flex;
        justify-content: center;
        padding: 3rem;
      }
    `
  ],
  template: `
    <div class="page-header">
      <h1>Performance Report</h1>
    </div>

    <div class="filter-row">
      <mat-form-field appearance="outline">
        <mat-label>Period</mat-label>
        <mat-select [(value)]="selectedPeriod">
          <mat-option value="MONTHLY">Monthly</mat-option>
          <mat-option value="QUARTERLY">Quarterly</mat-option>
          <mat-option value="YEARLY">Yearly</mat-option>
        </mat-select>
      </mat-form-field>

      <mat-form-field appearance="outline">
        <mat-label>Year</mat-label>
        <mat-select [(value)]="selectedYear">
          @for (y of availableYears; track y) {
            <mat-option [value]="y">{{ y }}</mat-option>
          }
        </mat-select>
      </mat-form-field>

      @if (selectedPeriod === 'MONTHLY') {
        <mat-form-field appearance="outline">
          <mat-label>Month</mat-label>
          <mat-select [(value)]="selectedPeriodNumber">
            @for (m of months; track m.value) {
              <mat-option [value]="m.value">{{ m.label }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
      }

      @if (selectedPeriod === 'QUARTERLY') {
        <mat-form-field appearance="outline">
          <mat-label>Quarter</mat-label>
          <mat-select [(value)]="selectedPeriodNumber">
            <mat-option [value]="1">Q1</mat-option>
            <mat-option [value]="2">Q2</mat-option>
            <mat-option [value]="3">Q3</mat-option>
            <mat-option [value]="4">Q4</mat-option>
          </mat-select>
        </mat-form-field>
      }

      <mat-form-field appearance="outline">
        <mat-label>Entity (optional)</mat-label>
        <mat-select [(value)]="selectedEntityId">
          <mat-option [value]="null">Family-wide</mat-option>
          @for (entity of entities; track entity.id) {
            <mat-option [value]="entity.id">{{ entity.name }}</mat-option>
          }
        </mat-select>
      </mat-form-field>

      <mat-form-field appearance="outline">
        <mat-label>Benchmarks</mat-label>
        <mat-select multiple [(value)]="selectedBenchmarks">
          <mat-option value="SP500">S&P 500</mat-option>
          <mat-option value="US_AGG_BOND">US Agg Bond</mat-option>
          <mat-option value="REAL_ESTATE">Real Estate</mat-option>
          <mat-option value="CPI_PROXY">CPI Proxy</mat-option>
        </mat-select>
      </mat-form-field>

      <button
        color="primary"
        mat-raised-button
        [disabled]="isLoading"
        (click)="generateReport()"
      >
        Generate Report
      </button>
    </div>

    @if (isLoading) {
      <div class="loading-container">
        <mat-spinner diameter="48"></mat-spinner>
      </div>
    }

    @if (report) {
      <mat-card class="section">
        <mat-card-header>
          <mat-card-title>{{ report.reportTitle }}</mat-card-title>
          <mat-card-subtitle>
            {{ report.period.start }} — {{ report.period.end }}
            @if (report.entity) {
              · {{ report.entity.name }}
            }
          </mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>
          <div class="summary-cards">
            <div class="summary-card">
              <div class="value">
                {{ report.summary.totalValueStart | number: '1.0-0' }}
              </div>
              <div class="label">Start Value</div>
            </div>
            <div class="summary-card">
              <div class="value">
                {{ report.summary.totalValueEnd | number: '1.0-0' }}
              </div>
              <div class="label">End Value</div>
            </div>
            <div class="summary-card">
              <div
                class="value"
                [class.negative]="report.summary.periodChange < 0"
                [class.positive]="report.summary.periodChange > 0"
              >
                {{ report.summary.periodChange | number: '1.0-0' }}
                ({{
                  report.summary.periodChangePercent * 100 | number: '1.2-2'
                }}%)
              </div>
              <div class="label">Period Change</div>
            </div>
            <div class="summary-card">
              <div
                class="value"
                [class.negative]="report.summary.ytdChangePercent < 0"
                [class.positive]="report.summary.ytdChangePercent > 0"
              >
                {{ report.summary.ytdChangePercent * 100 | number: '1.2-2' }}%
              </div>
              <div class="label">YTD Change</div>
            </div>
          </div>
        </mat-card-content>
      </mat-card>

      <!-- Asset Allocation -->
      @if (assetAllocationEntries.length > 0) {
        <mat-card class="section">
          <mat-card-header>
            <mat-card-title>Asset Allocation</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            @for (entry of assetAllocationEntries; track entry.name) {
              <div class="allocation-bar">
                <span class="label">{{ entry.name }}</span>
                <div class="bar" [style.width.%]="entry.percentage"></div>
                <span class="pct"
                  >{{ entry.percentage | number: '1.1-1' }}%</span
                >
              </div>
            }
          </mat-card-content>
        </mat-card>
      }

      <!-- Partnership Performance -->
      @if (report.partnershipPerformance.length > 0) {
        <mat-card class="section">
          <mat-card-header>
            <mat-card-title>Partnership Performance</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <table
              class="mat-elevation-z0"
              mat-table
              [dataSource]="report.partnershipPerformance"
            >
              <ng-container matColumnDef="name">
                <th *matHeaderCellDef mat-header-cell>Partnership</th>
                <td *matCellDef="let row" mat-cell>
                  {{ row.partnershipName }}
                </td>
              </ng-container>
              <ng-container matColumnDef="periodReturn">
                <th *matHeaderCellDef mat-header-cell>Period Return</th>
                <td *matCellDef="let row" mat-cell>
                  {{ row.periodReturn * 100 | number: '1.2-2' }}%
                </td>
              </ng-container>
              <ng-container matColumnDef="irr">
                <th *matHeaderCellDef mat-header-cell>IRR</th>
                <td *matCellDef="let row" mat-cell>
                  {{ row.irr * 100 | number: '1.2-2' }}%
                </td>
              </ng-container>
              <ng-container matColumnDef="tvpi">
                <th *matHeaderCellDef mat-header-cell>TVPI</th>
                <td *matCellDef="let row" mat-cell>
                  {{ row.tvpi | number: '1.2-2' }}x
                </td>
              </ng-container>
              <ng-container matColumnDef="dpi">
                <th *matHeaderCellDef mat-header-cell>DPI</th>
                <td *matCellDef="let row" mat-cell>
                  {{ row.dpi | number: '1.2-2' }}x
                </td>
              </ng-container>
              <tr *matHeaderRowDef="partnershipColumns" mat-header-row></tr>
              <tr
                *matRowDef="let row; columns: partnershipColumns"
                mat-row
              ></tr>
            </table>
          </mat-card-content>
        </mat-card>
      }

      <!-- Distribution Summary -->
      @if (report.distributionSummary.periodTotal > 0) {
        <mat-card class="section">
          <mat-card-header>
            <mat-card-title>Distribution Summary</mat-card-title>
            <mat-card-subtitle>
              Period Total:
              {{ report.distributionSummary.periodTotal | number: '1.0-0' }}
            </mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            @for (entry of distributionTypeEntries; track entry.type) {
              <div class="allocation-bar">
                <span class="label">{{ entry.type }}</span>
                <div
                  class="bar"
                  style="background-color: #ff9800"
                  [style.width.%]="entry.percentage"
                ></div>
                <span class="pct">{{ entry.amount | number: '1.0-0' }}</span>
              </div>
            }
          </mat-card-content>
        </mat-card>
      }

      <!-- Benchmark Comparisons -->
      @if (
        report.benchmarkComparisons && report.benchmarkComparisons.length > 0
      ) {
        <mat-card class="section">
          <mat-card-header>
            <mat-card-title>Benchmark Comparisons</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <gf-benchmark-comparison-chart
              [benchmarkComparisons]="report.benchmarkComparisons"
              [overallReturn]="report.summary.periodChangePercent"
              [partnershipName]="report.entity?.name ?? 'Family Portfolio'"
            ></gf-benchmark-comparison-chart>
          </mat-card-content>
        </mat-card>
      }
    }
  `
})
export class ReportPageComponent implements OnInit {
  public assetAllocationEntries: {
    name: string;
    percentage: number;
    value: number;
  }[] = [];
  public availableYears: number[] = [];
  public distributionTypeEntries: {
    amount: number;
    percentage: number;
    type: string;
  }[] = [];
  public entities: IEntity[] = [];
  public isLoading = false;
  public months = [
    { label: 'January', value: 1 },
    { label: 'February', value: 2 },
    { label: 'March', value: 3 },
    { label: 'April', value: 4 },
    { label: 'May', value: 5 },
    { label: 'June', value: 6 },
    { label: 'July', value: 7 },
    { label: 'August', value: 8 },
    { label: 'September', value: 9 },
    { label: 'October', value: 10 },
    { label: 'November', value: 11 },
    { label: 'December', value: 12 }
  ];
  public partnershipColumns = ['name', 'periodReturn', 'irr', 'tvpi', 'dpi'];
  public report: IFamilyOfficeReport | null = null;
  public selectedBenchmarks: string[] = [];
  public selectedEntityId: string | null = null;
  public selectedPeriod = 'QUARTERLY';
  public selectedPeriodNumber = Math.ceil((new Date().getMonth() + 1) / 3);
  public selectedYear = new Date().getFullYear();

  public constructor(
    private readonly changeDetectorRef: ChangeDetectorRef,
    private readonly destroyRef: DestroyRef,
    private readonly familyOfficeDataService: FamilyOfficeDataService
  ) {}

  public ngOnInit() {
    const currentYear = new Date().getFullYear();
    this.availableYears = [];

    for (let y = currentYear; y >= currentYear - 5; y--) {
      this.availableYears.push(y);
    }

    // Load entities for the dropdown
    this.familyOfficeDataService
      .fetchEntities()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((entities) => {
        this.entities = entities;
        this.changeDetectorRef.markForCheck();
      });
  }

  public generateReport() {
    this.isLoading = true;
    this.report = null;
    this.changeDetectorRef.markForCheck();

    this.familyOfficeDataService
      .fetchReport({
        benchmarks:
          this.selectedBenchmarks.length > 0
            ? this.selectedBenchmarks.join(',')
            : undefined,
        entityId: this.selectedEntityId ?? undefined,
        period: this.selectedPeriod as 'MONTHLY' | 'QUARTERLY' | 'YEARLY',
        periodNumber:
          this.selectedPeriod !== 'YEARLY'
            ? this.selectedPeriodNumber
            : undefined,
        year: this.selectedYear
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        error: () => {
          this.isLoading = false;
          this.changeDetectorRef.markForCheck();
        },
        next: (report) => {
          this.report = report;
          this.isLoading = false;
          this.processReportData();
          this.changeDetectorRef.markForCheck();
        }
      });
  }

  private processReportData() {
    if (!this.report) {
      return;
    }

    // Process asset allocation
    this.assetAllocationEntries = Object.entries(
      this.report.assetAllocation
    ).map(([name, data]) => ({
      name,
      percentage: data.percentage,
      value: data.value
    }));

    // Process distribution types
    const total = this.report.distributionSummary.periodTotal || 1;
    this.distributionTypeEntries = Object.entries(
      this.report.distributionSummary.byType
    ).map(([type, amount]) => ({
      amount,
      percentage: (amount / total) * 100,
      type
    }));
  }
}
