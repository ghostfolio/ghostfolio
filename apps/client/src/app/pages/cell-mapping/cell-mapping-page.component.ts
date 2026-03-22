import { K1ImportDataService } from '@ghostfolio/client/services/k1-import-data.service';

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
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';

interface BoxDefinition {
  boxKey: string;
  label: string;
  section?: string;
  dataType?: string;
  sortOrder?: number;
}

interface AggregationRule {
  ruleId: string;
  name: string;
  operation: string;
  sourceBoxKeys: string[];
  sortOrder: number;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'page' },
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatCardModule,
    MatChipsModule,
    MatIconModule,
    MatSelectModule,
    MatTableModule,
    MatTooltipModule
  ],
  selector: 'gf-cell-mapping-page',
  standalone: true,
  styleUrls: ['./cell-mapping-page.scss'],
  templateUrl: './cell-mapping-page.html'
})
export class CellMappingPageComponent implements OnInit {
  public boxDefinitions: BoxDefinition[] = [];
  public aggregationRules: AggregationRule[] = [];
  public isLoading = true;
  public error: string | null = null;

  // Filters
  public filterSection: string | null = null;
  public sections: string[] = [];

  // Table columns
  public boxColumns = ['boxKey', 'label', 'section', 'dataType'];
  public ruleColumns = ['name', 'operation', 'sourceBoxKeys', 'sortOrder'];

  public constructor(
    private readonly changeDetectorRef: ChangeDetectorRef,
    private readonly destroyRef: DestroyRef,
    private readonly k1ImportDataService: K1ImportDataService
  ) {}

  public ngOnInit(): void {
    this.loadData();
  }

  public get filteredDefinitions(): BoxDefinition[] {
    if (!this.filterSection) {
      return this.boxDefinitions;
    }
    return this.boxDefinitions.filter(
      (d) => d.section === this.filterSection
    );
  }

  /**
   * Get the label for a box key, used in the aggregation rules table.
   */
  public getBoxLabel(boxKey: string): string {
    const def = this.boxDefinitions.find((d) => d.boxKey === boxKey);
    return def ? `${boxKey} — ${def.label}` : boxKey;
  }

  /**
   * Get a human-friendly section name.
   */
  public getSectionLabel(section: string): string {
    const map: Record<string, string> = {
      HEADER: 'Header',
      PART_I: 'Part I',
      PART_II: 'Part II',
      SECTION_J: 'Section J',
      SECTION_K: 'Section K',
      SECTION_L: 'Section L',
      SECTION_M: 'Section M',
      SECTION_N: 'Section N',
      PART_III: 'Part III'
    };
    return map[section] ?? section;
  }

  private loadData(): void {
    this.isLoading = true;

    // Load box definitions
    this.k1ImportDataService
      .fetchBoxDefinitions()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (defs) => {
          this.boxDefinitions = defs;
          this.sections = [
            ...new Set(defs.map((d: any) => d.section).filter(Boolean))
          ];
          this.changeDetectorRef.markForCheck();
        },
        error: () => {
          this.error = 'Failed to load box definitions.';
          this.isLoading = false;
          this.changeDetectorRef.markForCheck();
        }
      });

    // Load aggregation rules
    this.k1ImportDataService
      .fetchAggregationRules()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (rules) => {
          this.aggregationRules = rules;
          this.isLoading = false;
          this.changeDetectorRef.markForCheck();
        },
        error: () => {
          this.error = 'Failed to load aggregation rules.';
          this.isLoading = false;
          this.changeDetectorRef.markForCheck();
        }
      });
  }
}
