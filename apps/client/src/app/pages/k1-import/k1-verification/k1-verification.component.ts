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
  cellType: string;
  editCellType: string;
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

  public cellTypeOptions = [
    { value: 'number', label: 'Number ($)' },
    { value: 'string', label: 'String' },
    { value: 'percentage', label: 'Percentage (%)' },
    { value: 'boolean', label: 'Boolean' }
  ];

  // Column definitions for the fields table
  public displayedColumns = [
    'boxNumber',
    'label',
    'rawValue',
    'numericValue',
    'cellType',
    'confidence',
    'reviewed',
    'actions'
  ];

  // All box definitions from the API (for assigning unmapped items)
  public allBoxDefinitions: Array<{ boxKey: string; label: string; section?: string }> = [];

  // Available box definitions for the dropdown (excludes already-mapped boxes)
  public availableBoxDefinitions: Array<{ boxKey: string; label: string; section?: string }> = [];

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
    field.editCellType = field.cellType;
    this.changeDetectorRef.markForCheck();
  }

  /**
   * Save edits to a field.
   */
  public saveEdit(field: EditableField): void {
    field.rawValue = field.editValue;
    field.customLabel =
      field.editLabel !== field.label ? field.editLabel : null;
    field.cellType = field.editCellType;
    field.isUserEdited = true;
    field.isReviewed = true;
    field.isEditing = false;

    // Parse value based on cell type
    if (field.cellType === 'boolean') {
      const lower = field.editValue.toLowerCase().trim();
      field.numericValue = null;
      field.rawValue = (lower === 'true' || lower === 'yes' || lower === '1' || lower === 'x') ? 'true' : 'false';
    } else if (field.cellType === 'string') {
      field.numericValue = null;
    } else {
      // number or percentage
      const cleaned = field.editValue
        .replace(/[$,%]/g, '')
        .replace(/\(([^)]+)\)/, '-$1')
        .trim();
      const parsed = parseFloat(cleaned);
      field.numericValue = isNaN(parsed) ? null : parsed;
    }

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
        cellType: f.cellType,
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

          const extraction = session.rawExtraction;
          if (extraction) {
            this.fields = (extraction.fields || []).map(
              (f: K1ExtractedField) => ({
                ...f,
                isEditing: false,
                editValue: f.rawValue,
                editLabel: f.customLabel || f.label,
                cellType: (f as any).cellType || 'number',
                editCellType: (f as any).cellType || 'number'
              })
            );

            this.unmappedItems = (extraction.unmappedItems || []).map(
              (item: K1UnmappedItem) => ({
                ...item,
                resolution: item.resolution || null,
                assignedBoxNumber: item.assignedBoxNumber || null
              })
            );

            // Load all box definitions from API for the unmapped dropdown
            this.loadBoxDefinitions();
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
   * Uses all 15 default aggregation rules to match backend behavior.
   */
  private recalculateAggregations(): void {
    const fieldMap: Record<string, number> = {};
    for (const f of this.fields) {
      if (f.numericValue !== null && f.numericValue !== undefined) {
        fieldMap[f.boxNumber] = f.numericValue;
      }
    }

    // All IRS default aggregation rules — mirrors DEFAULT_AGGREGATION_RULES on the backend
    const rules: Array<{ name: string; sourceCells: string[] }> = [
      { name: 'Total Ordinary Income', sourceCells: ['1'] },
      { name: 'Net Rental Income', sourceCells: ['2', '3'] },
      { name: 'Guaranteed Payments', sourceCells: ['4a', '4b'] },
      { name: 'Interest Income', sourceCells: ['5'] },
      { name: 'Total Dividends', sourceCells: ['6a'] },
      { name: 'Qualified Dividends', sourceCells: ['6b'] },
      { name: 'Royalties', sourceCells: ['7'] },
      { name: 'Total Capital Gains', sourceCells: ['8', '9a', '9b', '9c', '10'] },
      { name: 'Other Income', sourceCells: ['11'] },
      { name: 'Total Deductions', sourceCells: ['12', '13'] },
      { name: 'Self-Employment Earnings', sourceCells: ['14'] },
      { name: 'Alternative Minimum Tax Items', sourceCells: ['17'] },
      { name: 'Total Distributions', sourceCells: ['19a', '19b', '19'] },
      { name: 'Foreign Taxes Paid', sourceCells: ['21'] },
      { name: 'Total K-1 Income (Net)', sourceCells: ['1', '2', '3', '4b', '5', '6a', '7', '8', '9a', '9b', '9c', '10', '11', '14'] }
    ];

    this.aggregations = rules.map((rule, index) => {
      const breakdown: Record<string, number> = {};
      let computedValue = 0;
      for (const box of rule.sourceCells) {
        const val = fieldMap[box] ?? 0;
        breakdown[box] = val;
        computedValue += val;
      }
      return {
        ruleId: `client-${index + 1}`,
        name: rule.name,
        operation: 'SUM' as const,
        sourceCells: rule.sourceCells,
        computedValue,
        breakdown
      };
    });
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

  /**
   * Load all IRS box definitions from the API for the unmapped items dropdown.
   * Filters out boxes that are already mapped to existing fields.
   */
  private loadBoxDefinitions(): void {
    this.k1ImportDataService
      .fetchBoxDefinitions()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (definitions: any[]) => {
          this.allBoxDefinitions = definitions.map((d) => ({
            boxKey: d.boxKey,
            label: d.label,
            section: d.section
          }));

          this.updateAvailableBoxDefinitions();
          this.changeDetectorRef.markForCheck();
        },
        error: (err) => {
          this.logger('Failed to load box definitions:', err);
          // Fallback: use currently mapped field box numbers
          this.allBoxDefinitions = this.fields.map((f) => ({
            boxKey: f.boxNumber,
            label: f.label,
            section: undefined
          }));
          this.updateAvailableBoxDefinitions();
          this.changeDetectorRef.markForCheck();
        }
      });
  }

  /**
   * Update the available box definitions for the dropdown.
   * Excludes boxes that already have mapped fields.
   */
  private updateAvailableBoxDefinitions(): void {
    const mappedBoxes = new Set(this.fields.map((f) => f.boxNumber));
    this.availableBoxDefinitions = this.allBoxDefinitions.filter(
      (d) => !mappedBoxes.has(d.boxKey)
    );
  }

  private logger(message: string, ...args: any[]): void {
    console.warn(`[K1Verification] ${message}`, ...args);
  }
}
