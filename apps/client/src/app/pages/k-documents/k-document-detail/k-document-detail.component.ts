import { FamilyOfficeDataService } from '@ghostfolio/client/services/family-office-data.service';
import { K1ImportDataService } from '@ghostfolio/client/services/k1-import-data.service';
import { K1AggregationResult } from '@ghostfolio/common/interfaces/k1-import.interface';

import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  OnInit
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'page' },
  imports: [
    CommonModule,
    MatButtonModule,
    MatCardModule,
    MatChipsModule,
    MatIconModule,
    MatTableModule,
    RouterModule
  ],
  selector: 'gf-k-document-detail',
  styleUrls: ['./k-document-detail.scss'],
  templateUrl: './k-document-detail.html'
})
export class KDocumentDetailComponent implements OnInit {
  public aggregations: K1AggregationResult[] = [];
  public boxColumns = ['boxNumber', 'value'];
  public boxData: Array<{ boxNumber: string; value: number | null }> = [];
  public error: string | null = null;
  public kDocument: any = null;
  public kDocumentId: string;

  public constructor(
    private readonly activatedRoute: ActivatedRoute,
    private readonly changeDetectorRef: ChangeDetectorRef,
    private readonly destroyRef: DestroyRef,
    private readonly familyOfficeDataService: FamilyOfficeDataService,
    private readonly k1ImportDataService: K1ImportDataService,
    private readonly router: Router
  ) {}

  public ngOnInit(): void {
    this.kDocumentId = this.activatedRoute.snapshot.paramMap.get('id') || '';

    if (this.kDocumentId) {
      this.loadKDocument();
      this.loadAggregations();
    }
  }

  public goBack(): void {
    this.router.navigate(['/k-documents']);
  }

  private loadKDocument(): void {
    this.familyOfficeDataService
      .fetchKDocuments()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (docs) => {
          this.kDocument = docs.find((d) => d.id === this.kDocumentId) || null;

          if (this.kDocument?.data) {
            const data = this.kDocument.data as Record<string, any>;
            this.boxData = Object.entries(data)
              .map(([boxNumber, value]) => ({
                boxNumber,
                value: typeof value === 'number' ? value : null
              }))
              .sort((a, b) => this.compareBoxNumbers(a.boxNumber, b.boxNumber));
          }

          this.changeDetectorRef.markForCheck();
        },
        error: () => {
          this.error = 'Failed to load K-Document.';
          this.changeDetectorRef.markForCheck();
        }
      });
  }

  private loadAggregations(): void {
    this.k1ImportDataService
      .computeAggregations({ kDocumentId: this.kDocumentId })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (aggregations) => {
          this.aggregations = aggregations;
          this.changeDetectorRef.markForCheck();
        },
        error: () => {
          // Aggregations may not be configured yet
          this.aggregations = [];
          this.changeDetectorRef.markForCheck();
        }
      });
  }

  private compareBoxNumbers(a: string, b: string): number {
    const numA = parseInt(a.replace(/[^0-9]/g, ''), 10) || 0;
    const numB = parseInt(b.replace(/[^0-9]/g, ''), 10) || 0;
    if (numA !== numB) {
      return numA - numB;
    }
    return a.localeCompare(b);
  }
}
