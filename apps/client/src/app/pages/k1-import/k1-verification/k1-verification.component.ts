import { K1ImportDataService } from '@ghostfolio/client/services/k1-import-data.service';
import type {
  K1AggregationResult,
  K1ExtractedField,
  K1UnmappedItem
} from '@ghostfolio/common/interfaces';

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
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ActivatedRoute, Router } from '@angular/router';
import { addIcons } from 'ionicons';
import {
  checkmarkCircleOutline,
  alertCircleOutline,
  closeCircleOutline,
  trashOutline
} from 'ionicons/icons';

interface EditableField extends K1ExtractedField {
  isEditing: boolean;
  editValue: string;
  editLabel: string;
}

interface EditableUnmappedItem extends K1UnmappedItem {
  resolution: 'assigned' | 'discarded' | null;
  assignedBoxNumber: string | null;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'page' },
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressBarModule,
    MatSelectModule,
    MatTableModule,
    MatTooltipModule
  ],
  selector: 'gf-k1-verification',
  styleUrls: ['./k1-verification.scss'],
  templateUrl: './k1-verification.html'
})
export class K1VerificationComponent implements OnInit {
  public aggregations: K1AggregationResult[] = [];
  public canConfirm = false;
  public error: string | null = null;
  public fields: EditableField[] = [];
  public isLoading = true;
  public isSaving = false;
  public sessionId: string;
  public taxYear: number;
  public unmappedItems: EditableUnmappedItem[] = [];

  // Column definitions for the fields table
  public displayedColumns = [
    'boxNumber',
    'label',
    'rawValue',
    'numericValue',
    'confidence',
    'reviewed',
    'actions'
  ];

  // Available box numbers for assigning unmapped items
  public availableBoxNumbers: string[] = [];

  private partnershipId: string;

  public constructor(
    private readonly activatedRoute: ActivatedRoute,
    private readonly changeDetectorRef: ChangeDetectorRef,
    private readonly destroyRef: DestroyRef,
    private readonly k1ImportDataService: K1ImportDataService,
    private readonly router: Router
  ) {
    addIcons({
      checkmarkCircleOutline,
      alertCircleOutline,
      closeCircleOutline,
      trashOutline
    });
  }

  public ngOnInit(): void {
    this.sessionId = this.activatedRoute.snapshot.params['id'];
    this.loadSession();
  }

  /**
   * Get confidence badge CSS class.
   */
  public getConfidenceClass(level: string): string {
    switch (level) {
      case 'HIGH':
        return 'confidence-high';
      case 'MEDIUM':
        return 'confidence-medium';
      case 'LOW':
        return 'confidence-low';
      default:
        return '';
    }
  }

  /**
   * Toggle inline editing for a field.
   */
  public startEditing(field: EditableField): void {
    field.isEditing = true;
    field.editValue = field.rawValue;
    field.editLabel = field.customLabel || field.label;
    this.changeDetectorRef.markForCheck();
  }

  /**
   * Save edits to a field.
   */
  public saveEdit(field: EditableField): void {
    field.rawValue = field.editValue;
    field.customLabel =
      field.editLabel !== field.label ? field.editLabel : null;
    field.isUserEdited = true;
    field.isReviewed = true;
    field.isEditing = false;

    // Try to parse numeric value
    const cleaned = field.editValue
      .replace(/[$,]/g, '')
      .replace(/\(([^)]+)\)/, '-$1')
      .trim();
    const parsed = parseFloat(cleaned);
    field.numericValue = isNaN(parsed) ? null : parsed;

    this.recalculateAggregations();
    this.checkConfirmability();
    this.changeDetectorRef.markForCheck();
  }

  /**
   * Cancel editing.
   */
  public cancelEdit(field: EditableField): void {
    field.isEditing = false;
    this.changeDetectorRef.markForCheck();
  }

  /**
   * Toggle reviewed flag for a field.
   */
  public toggleReviewed(field: EditableField): void {
    field.isReviewed = !field.isReviewed;
    this.checkConfirmability();
    this.changeDetectorRef.markForCheck();
  }

  /**
   * Assign an unmapped item to an existing box number.
   */
  public assignUnmappedItem(
    item: EditableUnmappedItem,
    boxNumber: string
  ): void {
    item.resolution = 'assigned';
    item.assignedBoxNumber = boxNumber;
    this.checkConfirmability();
    this.changeDetectorRef.markForCheck();
  }

  /**
   * Discard an unmapped item.
   */
  public discardUnmappedItem(item: EditableUnmappedItem): void {
    item.resolution = 'discarded';
    item.assignedBoxNumber = null;
    this.checkConfirmability();
    this.changeDetectorRef.markForCheck();
  }

  /**
   * Submit verified data.
   */
  public submitVerification(): void {
    if (!this.canConfirm) {
      return;
    }

    this.isSaving = true;
    this.error = null;
    this.changeDetectorRef.markForCheck();

    const data = {
      taxYear: this.taxYear,
      fields: this.fields.map((f) => ({
        boxNumber: f.boxNumber,
        label: f.label,
        customLabel: f.customLabel,
        rawValue: f.rawValue,
        numericValue: f.numericValue,
        confidence: f.confidence,
        confidenceLevel: f.confidenceLevel,
        isUserEdited: f.isUserEdited,
        isReviewed: f.isReviewed
      })),
      unmappedItems: this.unmappedItems.map((item) => ({
        rawLabel: item.rawLabel,
        rawValue: item.rawValue,
        numericValue: item.numericValue,
        confidence: item.confidence,
        pageNumber: item.pageNumber,
        resolution: item.resolution,
        assignedBoxNumber: item.assignedBoxNumber
      }))
    };

    this.k1ImportDataService
      .verifyImportSession(this.sessionId, data as any)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.isSaving = false;
          // Navigate to confirmation step (Phase 5)
          this.router.navigate(['/k1-import', this.sessionId, 'confirm']);
        },
        error: (err) => {
          this.isSaving = false;
          this.error =
            err?.error?.message || err?.message || 'Verification failed.';
          this.changeDetectorRef.markForCheck();
        }
      });
  }

  /**
   * Cancel and go back to import page.
   */
  public cancelImport(): void {
    this.k1ImportDataService
      .cancelImportSession(this.sessionId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.router.navigate(['/k1-import']);
        },
        error: (err) => {
          this.error =
            err?.error?.message || err?.message || 'Cancel failed.';
          this.changeDetectorRef.markForCheck();
        }
      });
  }

  /**
   * Load session data and populate fields.
   */
  private loadSession(): void {
    this.k1ImportDataService
      .fetchImportSession(this.sessionId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (session: any) => {
          if (
            session.status !== 'EXTRACTED' &&
            session.status !== 'VERIFIED'
          ) {
            this.error = `Session is in ${session.status} status. Cannot verify.`;
            this.isLoading = false;
            this.changeDetectorRef.markForCheck();
            return;
          }

          this.taxYear = session.taxYear;
          this.partnershipId = session.partnershipId;

          const extraction = session.rawExtraction || session.verifiedData;
          if (extraction) {
            this.fields = (extraction.fields || []).map(
              (f: K1ExtractedField) => ({
                ...f,
                isEditing: false,
                editValue: f.rawValue,
                editLabel: f.customLabel || f.label
              })
            );

            this.unmappedItems = (extraction.unmappedItems || []).map(
              (item: K1UnmappedItem) => ({
                ...item,
                resolution: item.resolution || null,
                assignedBoxNumber: item.assignedBoxNumber || null
              })
            );

            // Build available box numbers from fields
            this.availableBoxNumbers = this.fields.map((f) => f.boxNumber);
          }

          this.recalculateAggregations();
          this.checkConfirmability();
          this.isLoading = false;
          this.changeDetectorRef.markForCheck();
        },
        error: (err) => {
          this.error =
            err?.error?.message || err?.message || 'Failed to load session.';
          this.isLoading = false;
          this.changeDetectorRef.markForCheck();
        }
      });
  }

  /**
   * Recalculate aggregation summaries from current field values.
   * FR-034: Auto-recalculate when cell values change.
   */
  private recalculateAggregations(): void {
    // Use the data service to compute aggregations from current fields
    // For now, compute client-side from the predefined rules
    // The full server-side computation will be used when a KDocument exists
    const fieldMap: Record<string, number> = {};
    for (const f of this.fields) {
      if (f.numericValue !== null && f.numericValue !== undefined) {
        fieldMap[f.boxNumber] = f.numericValue;
      }
    }

    // Client-side aggregation matching the default rules
    this.aggregations = [
      {
        ruleId: 'client-1',
        name: 'Total Ordinary Income',
        operation: 'SUM',
        sourceCells: ['1'],
        computedValue: fieldMap['1'] ?? 0,
        breakdown: { '1': fieldMap['1'] ?? 0 }
      },
      {
        ruleId: 'client-2',
        name: 'Total Capital Gains',
        operation: 'SUM',
        sourceCells: ['8', '9a', '9b', '9c', '10'],
        computedValue: ['8', '9a', '9b', '9c', '10'].reduce(
          (sum, box) => sum + (fieldMap[box] ?? 0),
          0
        ),
        breakdown: Object.fromEntries(
          ['8', '9a', '9b', '9c', '10'].map((box) => [
            box,
            fieldMap[box] ?? 0
          ])
        )
      },
      {
        ruleId: 'client-3',
        name: 'Total Deductions',
        operation: 'SUM',
        sourceCells: ['12', '13'],
        computedValue: (fieldMap['12'] ?? 0) + (fieldMap['13'] ?? 0),
        breakdown: {
          '12': fieldMap['12'] ?? 0,
          '13': fieldMap['13'] ?? 0
        }
      }
    ];
  }

  /**
   * FR-035: Check if all medium/low-confidence fields are reviewed
   * AND all unmapped items are resolved.
   */
  private checkConfirmability(): void {
    // All medium/low fields must be reviewed
    const allFieldsReviewed = this.fields.every(
      (f) =>
        f.confidenceLevel === 'HIGH' ||
        f.isReviewed
    );

    // All unmapped items must be resolved
    const allUnmappedResolved =
      this.unmappedItems.length === 0 ||
      this.unmappedItems.every(
        (item) =>
          item.resolution === 'assigned' || item.resolution === 'discarded'
      );

    this.canConfirm = allFieldsReviewed && allUnmappedResolved;
  }
}
