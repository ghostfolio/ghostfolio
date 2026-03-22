/**
 * K1BoxDefinition — Global IRS K-1 box reference.
 * One row per unique box identifier (e.g., "1", "9a", "20-A").
 * Replaces the global CellMapping rows.
 *
 * @see specs/006-k1-model-review/data-model.md
 */

export type K1BoxDataType = 'number' | 'string' | 'percentage' | 'boolean';

export type K1BoxSection =
  | 'HEADER'
  | 'PART_I'
  | 'PART_II'
  | 'SECTION_J'
  | 'SECTION_K'
  | 'SECTION_L'
  | 'SECTION_M'
  | 'SECTION_N'
  | 'PART_III';

export interface K1BoxDefinition {
  boxKey: string;
  label: string;
  section?: K1BoxSection;
  dataType: K1BoxDataType;
  sortOrder: number;
  irsFormLine?: string;
  description?: string;
  isCustom: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * K1BoxOverride — Per-partnership display overrides.
 * Controls custom labels and ignored status for a specific partnership.
 * Does NOT affect data integrity or K1LineItem storage.
 */
export interface K1BoxOverride {
  id: string;
  boxKey: string;
  partnershipId: string;
  customLabel?: string;
  isIgnored: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Merged box definition with partnership-specific overrides applied.
 * Used by UI and API consumers. Label is resolved as:
 * override.customLabel ?? definition.label
 */
export interface K1BoxDefinitionResolved {
  boxKey: string;
  label: string; // Resolved: override.customLabel ?? definition.label
  section?: K1BoxSection;
  dataType: K1BoxDataType;
  sortOrder: number;
  irsFormLine?: string;
  description?: string;
  isCustom: boolean;
  isIgnored: boolean; // From override, defaults to false
}

/**
 * DTO for creating/updating a K1BoxOverride.
 */
export interface CreateK1BoxOverrideDto {
  boxKey: string;
  partnershipId: string;
  customLabel?: string;
  isIgnored?: boolean;
}
