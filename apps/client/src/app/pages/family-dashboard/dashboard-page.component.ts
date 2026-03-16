import { FamilyOfficeDataService } from '@ghostfolio/client/services/family-office-data.service';
import type { IFamilyOfficeDashboard } from '@ghostfolio/common/interfaces';

import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  OnInit
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { RouterModule } from '@angular/router';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    MatCardModule,
    MatChipsModule,
    MatIconModule,
    MatProgressBarModule,
    MatProgressSpinnerModule,
    MatTableModule,
    RouterModule
  ],
  selector: 'gf-dashboard-page',
  standalone: true,
  styles: [
    `
      :host {
        display: block;
        padding: 1rem;
      }

      .page-header {
        margin-bottom: 1.5rem;
      }

      .hero-card {
        text-align: center;
        margin-bottom: 1.5rem;
        padding: 2rem;
      }

      .hero-card .aum-value {
        font-size: 2.5rem;
        font-weight: 700;
        color: #1976d2;
      }

      .hero-card .aum-label {
        font-size: 1rem;
        color: rgba(0, 0, 0, 0.6);
        margin-top: 0.25rem;
      }

      .hero-card .counts {
        display: flex;
        justify-content: center;
        gap: 2rem;
        margin-top: 1rem;
      }

      .hero-card .counts .count-item {
        text-align: center;
      }

      .hero-card .counts .count-value {
        font-size: 1.5rem;
        font-weight: 600;
      }

      .hero-card .counts .count-label {
        font-size: 0.85rem;
        color: rgba(0, 0, 0, 0.6);
      }

      .charts-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
        gap: 1rem;
        margin-bottom: 1.5rem;
      }

      .allocation-section mat-card-content {
        padding-top: 0.5rem;
      }

      .allocation-bar {
        display: flex;
        gap: 0.5rem;
        margin-bottom: 0.75rem;
        align-items: center;
      }

      .allocation-bar .bar-container {
        flex: 1;
        height: 24px;
        background-color: #e0e0e0;
        border-radius: 4px;
        overflow: hidden;
      }

      .allocation-bar .bar {
        height: 100%;
        border-radius: 4px;
        transition: width 0.3s ease;
      }

      .allocation-bar .label {
        min-width: 120px;
        font-size: 0.85rem;
      }

      .allocation-bar .pct {
        font-size: 0.85rem;
        min-width: 60px;
        text-align: right;
      }

      .entity-color {
        background-color: #1976d2;
      }

      .asset-color {
        background-color: #4caf50;
      }

      .structure-color {
        background-color: #ff9800;
      }

      .bottom-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
        gap: 1rem;
        margin-bottom: 1.5rem;
      }

      .k1-status .status-row {
        display: flex;
        justify-content: space-between;
        margin-bottom: 0.5rem;
        font-size: 0.9rem;
      }

      .k1-status .progress-section {
        margin-top: 1rem;
      }

      .k1-status .progress-label {
        font-size: 0.85rem;
        color: rgba(0, 0, 0, 0.6);
        margin-bottom: 0.25rem;
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
      <h1>Family Office Dashboard</h1>
    </div>

    @if (isLoading) {
      <div class="loading-container">
        <mat-spinner diameter="48"></mat-spinner>
      </div>
    }

    @if (dashboard) {
      <!-- AUM Hero -->
      <mat-card class="hero-card">
        <div class="aum-value">
          {{ dashboard.totalAum | number: '1.0-0' }}
          <span style="font-size: 1rem; font-weight: 400">{{
            dashboard.currency
          }}</span>
        </div>
        <div class="aum-label">Total Assets Under Management</div>
        <div class="counts">
          <div class="count-item">
            <div class="count-value">{{ dashboard.entitiesCount }}</div>
            <div class="count-label">Entities</div>
          </div>
          <div class="count-item">
            <div class="count-value">{{ dashboard.partnershipsCount }}</div>
            <div class="count-label">Partnerships</div>
          </div>
        </div>
      </mat-card>

      <!-- Allocation Charts -->
      <div class="charts-grid">
        <!-- By Entity -->
        <mat-card class="allocation-section">
          <mat-card-header>
            <mat-card-title>Allocation by Entity</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            @for (item of dashboard.allocationByEntity; track item.entityId) {
              <div class="allocation-bar">
                <span class="label">{{ item.entityName }}</span>
                <div class="bar-container">
                  <div
                    class="bar entity-color"
                    [style.width.%]="item.percentage"
                  ></div>
                </div>
                <span class="pct"
                  >{{ item.percentage | number: '1.1-1' }}%</span
                >
              </div>
            }
            @if (dashboard.allocationByEntity.length === 0) {
              <p style="color: rgba(0,0,0,0.4); text-align: center">
                No allocation data
              </p>
            }
          </mat-card-content>
        </mat-card>

        <!-- By Asset Class -->
        <mat-card class="allocation-section">
          <mat-card-header>
            <mat-card-title>Allocation by Asset Class</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            @for (
              item of dashboard.allocationByAssetClass;
              track item.assetClass
            ) {
              <div class="allocation-bar">
                <span class="label">{{ item.assetClass }}</span>
                <div class="bar-container">
                  <div
                    class="bar asset-color"
                    [style.width.%]="item.percentage"
                  ></div>
                </div>
                <span class="pct"
                  >{{ item.percentage | number: '1.1-1' }}%</span
                >
              </div>
            }
            @if (dashboard.allocationByAssetClass.length === 0) {
              <p style="color: rgba(0,0,0,0.4); text-align: center">
                No asset data
              </p>
            }
          </mat-card-content>
        </mat-card>

        <!-- By Structure -->
        <mat-card class="allocation-section">
          <mat-card-header>
            <mat-card-title>Allocation by Structure</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            @for (
              item of dashboard.allocationByStructure;
              track item.structureType
            ) {
              <div class="allocation-bar">
                <span class="label">{{ item.structureType }}</span>
                <div class="bar-container">
                  <div
                    class="bar structure-color"
                    [style.width.%]="item.percentage"
                  ></div>
                </div>
                <span class="pct"
                  >{{ item.percentage | number: '1.1-1' }}%</span
                >
              </div>
            }
            @if (dashboard.allocationByStructure.length === 0) {
              <p style="color: rgba(0,0,0,0.4); text-align: center">
                No structure data
              </p>
            }
          </mat-card-content>
        </mat-card>
      </div>

      <!-- Bottom row: Recent Distributions + K-1 Status -->
      <div class="bottom-grid">
        <!-- Recent Distributions -->
        <mat-card>
          <mat-card-header>
            <mat-card-title>Recent Distributions</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            @if (dashboard.recentDistributions.length > 0) {
              <table
                class="mat-elevation-z0"
                mat-table
                [dataSource]="dashboard.recentDistributions"
              >
                <ng-container matColumnDef="partnership">
                  <th *matHeaderCellDef mat-header-cell>Partnership</th>
                  <td *matCellDef="let row" mat-cell>
                    {{ row.partnershipName }}
                  </td>
                </ng-container>
                <ng-container matColumnDef="amount">
                  <th *matHeaderCellDef mat-header-cell>Amount</th>
                  <td *matCellDef="let row" mat-cell>
                    {{ row.amount | number: '1.0-0' }}
                  </td>
                </ng-container>
                <ng-container matColumnDef="date">
                  <th *matHeaderCellDef mat-header-cell>Date</th>
                  <td *matCellDef="let row" mat-cell>{{ row.date }}</td>
                </ng-container>
                <ng-container matColumnDef="type">
                  <th *matHeaderCellDef mat-header-cell>Type</th>
                  <td *matCellDef="let row" mat-cell>
                    <mat-chip>{{ row.type }}</mat-chip>
                  </td>
                </ng-container>
                <tr *matHeaderRowDef="distributionColumns" mat-header-row></tr>
                <tr
                  *matRowDef="let row; columns: distributionColumns"
                  mat-row
                ></tr>
              </table>
            } @else {
              <p style="color: rgba(0,0,0,0.4); text-align: center">
                No recent distributions
              </p>
            }
          </mat-card-content>
        </mat-card>

        <!-- K-1 Status -->
        <mat-card class="k1-status">
          <mat-card-header>
            <mat-card-title
              >K-1 Filing Status ({{
                dashboard.kDocumentStatus.taxYear
              }})</mat-card-title
            >
          </mat-card-header>
          <mat-card-content>
            <div class="status-row">
              <span>Total K-1 Documents</span>
              <strong>{{ dashboard.kDocumentStatus.total }}</strong>
            </div>
            <div class="status-row">
              <span>Draft</span>
              <strong>{{ dashboard.kDocumentStatus.draft }}</strong>
            </div>
            <div class="status-row">
              <span>Estimated</span>
              <strong>{{ dashboard.kDocumentStatus.estimated }}</strong>
            </div>
            <div class="status-row">
              <span>Final</span>
              <strong>{{ dashboard.kDocumentStatus.final }}</strong>
            </div>
            @if (dashboard.kDocumentStatus.total > 0) {
              <div class="progress-section">
                <div class="progress-label">
                  {{ k1ProgressPercent | number: '1.0-0' }}% Complete (Final)
                </div>
                <mat-progress-bar
                  color="primary"
                  mode="determinate"
                  [value]="k1ProgressPercent"
                ></mat-progress-bar>
              </div>
            }
          </mat-card-content>
        </mat-card>
      </div>
    }
  `
})
export class DashboardPageComponent implements OnInit {
  public dashboard: IFamilyOfficeDashboard | null = null;
  public distributionColumns = ['partnership', 'amount', 'date', 'type'];
  public isLoading = true;
  public k1ProgressPercent = 0;

  public constructor(
    private readonly changeDetectorRef: ChangeDetectorRef,
    private readonly destroyRef: DestroyRef,
    private readonly familyOfficeDataService: FamilyOfficeDataService
  ) {}

  public ngOnInit() {
    this.familyOfficeDataService
      .fetchDashboard()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        error: () => {
          this.isLoading = false;
          this.changeDetectorRef.markForCheck();
        },
        next: (dashboard) => {
          this.dashboard = dashboard;
          this.isLoading = false;

          if (dashboard.kDocumentStatus.total > 0) {
            this.k1ProgressPercent =
              (dashboard.kDocumentStatus.final /
                dashboard.kDocumentStatus.total) *
              100;
          }

          this.changeDetectorRef.markForCheck();
        }
      });
  }
}
