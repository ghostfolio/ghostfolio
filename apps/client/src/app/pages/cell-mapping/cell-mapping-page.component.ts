import { K1ImportDataService } from '@ghostfolio/client/services/k1-import-data.service';
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
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';

interface EditableMapping {
  boxNumber: string;
  label: string;
  description: string;
  isCustom: boolean;
  isEditing: boolean;
  editLabel: string;
  editDescription: string;
}

interface EditableRule {
  name: string;
  operation: string;
  sourceCells: string[];
  isEditing: boolean;
  editName: string;
  editSourceCells: string;
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
    MatSelectModule,
    MatTableModule,
    MatTooltipModule
  ],
  selector: 'gf-cell-mapping-page',
  styleUrls: ['./cell-mapping-page.scss'],
  templateUrl: './cell-mapping-page.html'
})
export class CellMappingPageComponent implements OnInit {
  public aggregationRules: EditableRule[] = [];
  public error: string | null = null;
  public isSaving = false;
  public mappings: EditableMapping[] = [];
  public partnerships: Array<{ id: string; name: string }> = [];
  public selectedPartnershipId = '';
  public successMessage: string | null = null;

  // New custom cell form
  public newBoxNumber = '';
  public newLabel = '';

  // New rule form
  public newRuleName = '';
  public newRuleSourceCells = '';

  public displayedColumns = ['boxNumber', 'label', 'description', 'isCustom', 'actions'];

  public constructor(
    private readonly changeDetectorRef: ChangeDetectorRef,
    private readonly destroyRef: DestroyRef,
    private readonly familyOfficeDataService: FamilyOfficeDataService,
    private readonly k1ImportDataService: K1ImportDataService
  ) {}

  public ngOnInit(): void {
    this.fetchPartnerships();
  }

  public onPartnershipChange(): void {
    if (this.selectedPartnershipId) {
      this.loadMappings();
      this.loadAggregationRules();
    }
  }

  // ── Cell Mapping Methods ─────────────────────────────────────────

  public startEditMapping(mapping: EditableMapping): void {
    mapping.isEditing = true;
    mapping.editLabel = mapping.label;
    mapping.editDescription = mapping.description;
    this.changeDetectorRef.markForCheck();
  }

  public saveEditMapping(mapping: EditableMapping): void {
    mapping.label = mapping.editLabel;
    mapping.description = mapping.editDescription;
    mapping.isEditing = false;
    this.changeDetectorRef.markForCheck();
  }

  public cancelEditMapping(mapping: EditableMapping): void {
    mapping.isEditing = false;
    this.changeDetectorRef.markForCheck();
  }

  public addCustomCell(): void {
    if (!this.newBoxNumber || !this.newLabel) {
      return;
    }

    this.mappings.push({
      boxNumber: this.newBoxNumber,
      label: this.newLabel,
      description: '',
      isCustom: true,
      isEditing: false,
      editLabel: '',
      editDescription: ''
    });

    this.newBoxNumber = '';
    this.newLabel = '';
    this.changeDetectorRef.markForCheck();
  }

  public removeMapping(index: number): void {
    this.mappings.splice(index, 1);
    this.changeDetectorRef.markForCheck();
  }

  public saveMappings(): void {
    if (!this.selectedPartnershipId) {
      return;
    }

    this.isSaving = true;
    this.error = null;
    this.successMessage = null;
    this.changeDetectorRef.markForCheck();

    this.k1ImportDataService
      .updateCellMappings({
        partnershipId: this.selectedPartnershipId,
        mappings: this.mappings.map((m) => ({
          boxNumber: m.boxNumber,
          label: m.label,
          description: m.description,
          isCustom: m.isCustom
        }))
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.isSaving = false;
          this.successMessage = 'Cell mappings saved successfully.';
          this.changeDetectorRef.markForCheck();
        },
        error: (err) => {
          this.isSaving = false;
          this.error =
            err?.error?.message || err?.message || 'Failed to save mappings.';
          this.changeDetectorRef.markForCheck();
        }
      });
  }

  public resetToDefaults(): void {
    if (!this.selectedPartnershipId) {
      return;
    }

    this.k1ImportDataService
      .resetCellMappings(this.selectedPartnershipId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.successMessage = 'Cell mappings reset to IRS defaults.';
          this.loadMappings();
        },
        error: (err) => {
          this.error =
            err?.error?.message || err?.message || 'Failed to reset mappings.';
          this.changeDetectorRef.markForCheck();
        }
      });
  }

  // ── Aggregation Rule Methods ─────────────────────────────────────

  public addAggregationRule(): void {
    if (!this.newRuleName || !this.newRuleSourceCells) {
      return;
    }

    this.aggregationRules.push({
      name: this.newRuleName,
      operation: 'SUM',
      sourceCells: this.newRuleSourceCells.split(',').map((s) => s.trim()),
      isEditing: false,
      editName: '',
      editSourceCells: ''
    });

    this.newRuleName = '';
    this.newRuleSourceCells = '';
    this.changeDetectorRef.markForCheck();
  }

  public removeAggregationRule(index: number): void {
    this.aggregationRules.splice(index, 1);
    this.changeDetectorRef.markForCheck();
  }

  public saveAggregationRules(): void {
    if (!this.selectedPartnershipId) {
      return;
    }

    this.isSaving = true;
    this.error = null;
    this.successMessage = null;
    this.changeDetectorRef.markForCheck();

    this.k1ImportDataService
      .updateAggregationRules({
        partnershipId: this.selectedPartnershipId,
        rules: this.aggregationRules.map((r) => ({
          name: r.name,
          operation: r.operation,
          sourceCells: r.sourceCells
        }))
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.isSaving = false;
          this.successMessage = 'Aggregation rules saved successfully.';
          this.changeDetectorRef.markForCheck();
        },
        error: (err) => {
          this.isSaving = false;
          this.error =
            err?.error?.message || err?.message || 'Failed to save rules.';
          this.changeDetectorRef.markForCheck();
        }
      });
  }

  // ── Data Loading ─────────────────────────────────────────────────

  private fetchPartnerships(): void {
    this.familyOfficeDataService
      .fetchPartnerships()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (partnerships) => {
          this.partnerships = partnerships.map((p) => ({
            id: p.id,
            name: p.name
          }));
          this.changeDetectorRef.markForCheck();
        }
      });
  }

  private loadMappings(): void {
    this.k1ImportDataService
      .fetchCellMappings(this.selectedPartnershipId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (mappings: any[]) => {
          this.mappings = mappings.map((m) => ({
            boxNumber: m.boxNumber,
            label: m.label,
            description: m.description || '',
            isCustom: m.isCustom,
            isEditing: false,
            editLabel: '',
            editDescription: ''
          }));
          this.changeDetectorRef.markForCheck();
        },
        error: (err) => {
          this.error =
            err?.error?.message || 'Failed to load cell mappings.';
          this.changeDetectorRef.markForCheck();
        }
      });
  }

  private loadAggregationRules(): void {
    this.k1ImportDataService
      .fetchAggregationRules(this.selectedPartnershipId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (rules: any[]) => {
          this.aggregationRules = rules.map((r) => ({
            name: r.name,
            operation: r.operation,
            sourceCells: (r.sourceCells as string[]) || [],
            isEditing: false,
            editName: '',
            editSourceCells: ''
          }));
          this.changeDetectorRef.markForCheck();
        },
        error: (err) => {
          this.error =
            err?.error?.message || 'Failed to load aggregation rules.';
          this.changeDetectorRef.markForCheck();
        }
      });
  }
}
