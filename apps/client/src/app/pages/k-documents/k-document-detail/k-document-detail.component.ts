import { FamilyOfficeDataService } from '@ghostfolio/client/services/family-office-data.service';

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
  public aggregations: Array<{ name: string; value: number }> = [];
  public boxColumns = ['boxNumber', 'value'];
  public boxData: Array<{ boxNumber: string; value: number | string | null }> = [];
  public error: string | null = null;
  public kDocument: any = null;
  public kDocumentId: string;

  /** Box numbers that represent percentage values (Section J) */
  private static readonly PERCENTAGE_BOXES = new Set([
    'J_PROFIT_BEGIN', 'J_PROFIT_END',
    'J_LOSS_BEGIN', 'J_LOSS_END',
    'J_CAPITAL_BEGIN', 'J_CAPITAL_END'
  ]);

  public isPercentage(boxNumber: string): boolean {
    return KDocumentDetailComponent.PERCENTAGE_BOXES.has(boxNumber);
  }

  public isNumeric(value: any): boolean {
    return typeof value === 'number';
  }

  public constructor(
    private readonly activatedRoute: ActivatedRoute,
    private readonly changeDetectorRef: ChangeDetectorRef,
    private readonly destroyRef: DestroyRef,
    private readonly familyOfficeDataService: FamilyOfficeDataService,
    private readonly router: Router
  ) {}

  public ngOnInit(): void {
    this.kDocumentId = this.activatedRoute.snapshot.paramMap.get('id') || '';

    if (this.kDocumentId) {
      this.loadKDocument();
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
                value: value ?? null
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

  private compareBoxNumbers(a: string, b: string): number {
    const numA = parseInt(a.replace(/[^0-9]/g, ''), 10) || 0;
    const numB = parseInt(b.replace(/[^0-9]/g, ''), 10) || 0;
    if (numA !== numB) {
      return numA - numB;
    }
    return a.localeCompare(b);
  }
}
