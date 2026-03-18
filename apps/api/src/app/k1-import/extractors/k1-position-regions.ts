/**
 * K-1 Form Position Region Definitions
 *
 * Defines bounding box regions for all K-1 (Form 1065) form fields.
 * Coordinates are in PDF points (1 pt = 1/72 inch), origin bottom-left.
 * Page size: 612 × 792 pts (US Letter).
 *
 * Regions verified from actual e-filed K-1 PDF extraction.
 * ±15pt tolerance recommended for matching.
 */

export interface K1PositionRegion {
  /** Unique identifier (e.g., "BOX_1", "J_PROFIT_BEGIN", "FINAL_K1") */
  fieldId: string;

  /** K-1 box number for Part III fields; section identifier for others */
  boxNumber: string;

  /** Display label */
  label: string;

  /** Category: PART_III, METADATA, SECTION_J, SECTION_K, SECTION_L, SECTION_M, SECTION_N, CHECKBOX */
  fieldCategory: string;

  /** Expected value type */
  valueType: 'numeric' | 'text' | 'checkbox' | 'percentage';

  /** Left edge in PDF points */
  xMin: number;

  /** Right edge in PDF points */
  xMax: number;

  /** Bottom edge in PDF points */
  yMin: number;

  /** Top edge in PDF points */
  yMax: number;

  /** Whether this region supports subtype codes */
  hasSubtype: boolean;

  /** Code column left edge (if hasSubtype) */
  subtypeXMin: number | null;

  /** Code column right edge (if hasSubtype) */
  subtypeXMax: number | null;
}

// ============================================================================
// Header Regions (5)
// ============================================================================
const HEADER_REGIONS: K1PositionRegion[] = [
  {
    fieldId: 'TAX_YEAR',
    boxNumber: 'TAX_YEAR',
    label: 'Tax Year',
    fieldCategory: 'METADATA',
    valueType: 'text',
    xMin: 245,
    xMax: 310,
    yMin: 765,
    yMax: 795,
    hasSubtype: false,
    subtypeXMin: null,
    subtypeXMax: null
  },
  {
    fieldId: 'TAX_YEAR_BEGIN',
    boxNumber: 'TAX_YEAR_BEGIN',
    label: 'Tax Year Beginning',
    fieldCategory: 'METADATA',
    valueType: 'text',
    xMin: 120,
    xMax: 200,
    yMin: 748,
    yMax: 772,
    hasSubtype: false,
    subtypeXMin: null,
    subtypeXMax: null
  },
  {
    fieldId: 'TAX_YEAR_END',
    boxNumber: 'TAX_YEAR_END',
    label: 'Tax Year Ending',
    fieldCategory: 'METADATA',
    valueType: 'text',
    xMin: 310,
    xMax: 450,
    yMin: 748,
    yMax: 772,
    hasSubtype: false,
    subtypeXMin: null,
    subtypeXMax: null
  },
  {
    fieldId: 'FINAL_K1',
    boxNumber: 'FINAL_K1',
    label: 'Final K-1',
    fieldCategory: 'CHECKBOX',
    valueType: 'checkbox',
    xMin: 309,
    xMax: 340,
    yMin: 731,
    yMax: 761,
    hasSubtype: false,
    subtypeXMin: null,
    subtypeXMax: null
  },
  {
    fieldId: 'AMENDED_K1',
    boxNumber: 'AMENDED_K1',
    label: 'Amended K-1',
    fieldCategory: 'CHECKBOX',
    valueType: 'checkbox',
    xMin: 379,
    xMax: 410,
    yMin: 731,
    yMax: 761,
    hasSubtype: false,
    subtypeXMin: null,
    subtypeXMax: null
  }
];

// ============================================================================
// Part I — Information About the Partnership (4)
// ============================================================================
const PART_I_REGIONS: K1PositionRegion[] = [
  {
    fieldId: 'A_EIN',
    boxNumber: 'A_EIN',
    label: "Partnership's EIN",
    fieldCategory: 'METADATA',
    valueType: 'text',
    xMin: 30,
    xMax: 200,
    yMin: 700,
    yMax: 735,
    hasSubtype: false,
    subtypeXMin: null,
    subtypeXMax: null
  },
  {
    fieldId: 'B_NAME',
    boxNumber: 'B_NAME',
    label: "Partnership's Name/Address",
    fieldCategory: 'METADATA',
    valueType: 'text',
    xMin: 30,
    xMax: 290,
    yMin: 650,
    yMax: 705,
    hasSubtype: false,
    subtypeXMin: null,
    subtypeXMax: null
  },
  {
    fieldId: 'C_IRS_CENTER',
    boxNumber: 'C_IRS_CENTER',
    label: 'IRS Center',
    fieldCategory: 'METADATA',
    valueType: 'text',
    xMin: 30,
    xMax: 290,
    yMin: 610,
    yMax: 655,
    hasSubtype: false,
    subtypeXMin: null,
    subtypeXMax: null
  },
  {
    fieldId: 'D1_PUBLIC_TRADED',
    boxNumber: 'D1_PUBLIC_TRADED',
    label: 'Publicly Traded Partnership',
    fieldCategory: 'CHECKBOX',
    valueType: 'checkbox',
    xMin: 225,
    xMax: 290,
    yMin: 610,
    yMax: 640,
    hasSubtype: false,
    subtypeXMin: null,
    subtypeXMax: null
  }
];

// ============================================================================
// Part II — Information About the Partner (12)
// ============================================================================
const PART_II_REGIONS: K1PositionRegion[] = [
  {
    fieldId: 'D_PARTNER_EIN',
    boxNumber: 'D_PARTNER_EIN',
    label: "Partner's EIN/SSN",
    fieldCategory: 'METADATA',
    valueType: 'text',
    xMin: 30,
    xMax: 200,
    yMin: 575,
    yMax: 610,
    hasSubtype: false,
    subtypeXMin: null,
    subtypeXMax: null
  },
  {
    fieldId: 'E_NAME',
    boxNumber: 'E_NAME',
    label: "Partner's Name",
    fieldCategory: 'METADATA',
    valueType: 'text',
    xMin: 30,
    xMax: 290,
    yMin: 535,
    yMax: 580,
    hasSubtype: false,
    subtypeXMin: null,
    subtypeXMax: null
  },
  {
    fieldId: 'F_ADDR',
    boxNumber: 'F_ADDR',
    label: "Partner's Address",
    fieldCategory: 'METADATA',
    valueType: 'text',
    xMin: 30,
    xMax: 290,
    yMin: 490,
    yMax: 540,
    hasSubtype: false,
    subtypeXMin: null,
    subtypeXMax: null
  },
  {
    fieldId: 'G_GENERAL',
    boxNumber: 'G_GENERAL',
    label: 'General Partner',
    fieldCategory: 'CHECKBOX',
    valueType: 'checkbox',
    xMin: 100,
    xMax: 165,
    yMin: 450,
    yMax: 480,
    hasSubtype: false,
    subtypeXMin: null,
    subtypeXMax: null
  },
  {
    fieldId: 'G_LIMITED',
    boxNumber: 'G_LIMITED',
    label: 'Limited Partner',
    fieldCategory: 'CHECKBOX',
    valueType: 'checkbox',
    xMin: 165,
    xMax: 230,
    yMin: 432,
    yMax: 462,
    hasSubtype: false,
    subtypeXMin: null,
    subtypeXMax: null
  },
  {
    fieldId: 'H1_DOMESTIC',
    boxNumber: 'H1_DOMESTIC',
    label: 'Domestic Partner',
    fieldCategory: 'CHECKBOX',
    valueType: 'checkbox',
    xMin: 43,
    xMax: 110,
    yMin: 408,
    yMax: 438,
    hasSubtype: false,
    subtypeXMin: null,
    subtypeXMax: null
  },
  {
    fieldId: 'H2_FOREIGN',
    boxNumber: 'H2_FOREIGN',
    label: 'Foreign Partner',
    fieldCategory: 'CHECKBOX',
    valueType: 'checkbox',
    xMin: 100,
    xMax: 165,
    yMin: 408,
    yMax: 438,
    hasSubtype: false,
    subtypeXMin: null,
    subtypeXMax: null
  },
  {
    fieldId: 'I1_DISREGARDED',
    boxNumber: 'I1_DISREGARDED',
    label: 'Disregarded Entity',
    fieldCategory: 'METADATA',
    valueType: 'text',
    xMin: 30,
    xMax: 290,
    yMin: 380,
    yMax: 415,
    hasSubtype: false,
    subtypeXMin: null,
    subtypeXMax: null
  },
  {
    fieldId: 'I2_ENTITY_EIN',
    boxNumber: 'I2_ENTITY_EIN',
    label: 'Disregarded Entity EIN',
    fieldCategory: 'METADATA',
    valueType: 'text',
    xMin: 30,
    xMax: 290,
    yMin: 355,
    yMax: 385,
    hasSubtype: false,
    subtypeXMin: null,
    subtypeXMax: null
  },
  {
    fieldId: 'F1_PROFIT_PCT',
    boxNumber: 'F1_PROFIT_PCT',
    label: 'What type of entity',
    fieldCategory: 'METADATA',
    valueType: 'text',
    xMin: 30,
    xMax: 290,
    yMin: 455,
    yMax: 495,
    hasSubtype: false,
    subtypeXMin: null,
    subtypeXMax: null
  },
  {
    fieldId: 'PARTNER_RETIRE',
    boxNumber: 'PARTNER_RETIRE',
    label: 'Partner Retirement',
    fieldCategory: 'CHECKBOX',
    valueType: 'checkbox',
    xMin: 225,
    xMax: 290,
    yMin: 455,
    yMax: 485,
    hasSubtype: false,
    subtypeXMin: null,
    subtypeXMax: null
  },
  {
    fieldId: 'ENTITY_TYPE',
    boxNumber: 'ENTITY_TYPE',
    label: 'Entity Type',
    fieldCategory: 'METADATA',
    valueType: 'text',
    xMin: 30,
    xMax: 290,
    yMin: 460,
    yMax: 500,
    hasSubtype: false,
    subtypeXMin: null,
    subtypeXMax: null
  }
];

// ============================================================================
// Section J — Partner's Share of Profit, Loss, and Capital (7)
// Verified: J_PROFIT_BEGIN at (139.1, 339.1), J_PROFIT_END at (250.1, 339.1)
// ============================================================================
const SECTION_J_REGIONS: K1PositionRegion[] = [
  {
    fieldId: 'J_PROFIT_BEGIN',
    boxNumber: 'J_PROFIT_BEGIN',
    label: 'Profit Beginning %',
    fieldCategory: 'SECTION_J',
    valueType: 'percentage',
    xMin: 124,
    xMax: 200,
    yMin: 324,
    yMax: 354,
    hasSubtype: false,
    subtypeXMin: null,
    subtypeXMax: null
  },
  {
    fieldId: 'J_PROFIT_END',
    boxNumber: 'J_PROFIT_END',
    label: 'Profit Ending %',
    fieldCategory: 'SECTION_J',
    valueType: 'percentage',
    xMin: 235,
    xMax: 305,
    yMin: 324,
    yMax: 354,
    hasSubtype: false,
    subtypeXMin: null,
    subtypeXMax: null
  },
  {
    fieldId: 'J_LOSS_BEGIN',
    boxNumber: 'J_LOSS_BEGIN',
    label: 'Loss Beginning %',
    fieldCategory: 'SECTION_J',
    valueType: 'percentage',
    xMin: 124,
    xMax: 200,
    yMin: 308,
    yMax: 338,
    hasSubtype: false,
    subtypeXMin: null,
    subtypeXMax: null
  },
  {
    fieldId: 'J_LOSS_END',
    boxNumber: 'J_LOSS_END',
    label: 'Loss Ending %',
    fieldCategory: 'SECTION_J',
    valueType: 'percentage',
    xMin: 235,
    xMax: 305,
    yMin: 308,
    yMax: 338,
    hasSubtype: false,
    subtypeXMin: null,
    subtypeXMax: null
  },
  {
    fieldId: 'J_CAPITAL_BEGIN',
    boxNumber: 'J_CAPITAL_BEGIN',
    label: 'Capital Beginning %',
    fieldCategory: 'SECTION_J',
    valueType: 'percentage',
    xMin: 124,
    xMax: 200,
    yMin: 292,
    yMax: 322,
    hasSubtype: false,
    subtypeXMin: null,
    subtypeXMax: null
  },
  {
    fieldId: 'J_CAPITAL_END',
    boxNumber: 'J_CAPITAL_END',
    label: 'Capital Ending %',
    fieldCategory: 'SECTION_J',
    valueType: 'percentage',
    xMin: 235,
    xMax: 305,
    yMin: 292,
    yMax: 322,
    hasSubtype: false,
    subtypeXMin: null,
    subtypeXMax: null
  },
  {
    fieldId: 'J_DECREASE_SALE',
    boxNumber: 'J_DECREASE_SALE',
    label: 'Decrease due to Sale',
    fieldCategory: 'SECTION_J',
    valueType: 'checkbox',
    xMin: 124,
    xMax: 200,
    yMin: 276,
    yMax: 306,
    hasSubtype: false,
    subtypeXMin: null,
    subtypeXMax: null
  }
];

// ============================================================================
// Section K — Partner's Share of Liabilities (8)
// Verified: K_NONRECOURSE_BEGIN at (180.8, 254.5), K2_CHECKBOX at (294.9, 205.8)
// ============================================================================
const SECTION_K_REGIONS: K1PositionRegion[] = [
  {
    fieldId: 'K_NONRECOURSE_BEGIN',
    boxNumber: 'K_NONRECOURSE_BEGIN',
    label: 'Nonrecourse Beginning',
    fieldCategory: 'SECTION_K',
    valueType: 'numeric',
    xMin: 155,
    xMax: 235,
    yMin: 240,
    yMax: 270,
    hasSubtype: false,
    subtypeXMin: null,
    subtypeXMax: null
  },
  {
    fieldId: 'K_NONRECOURSE_END',
    boxNumber: 'K_NONRECOURSE_END',
    label: 'Nonrecourse Ending',
    fieldCategory: 'SECTION_K',
    valueType: 'numeric',
    xMin: 235,
    xMax: 310,
    yMin: 240,
    yMax: 270,
    hasSubtype: false,
    subtypeXMin: null,
    subtypeXMax: null
  },
  {
    fieldId: 'K_QUAL_NONRECOURSE_BEGIN',
    boxNumber: 'K_QUAL_NONRECOURSE_BEGIN',
    label: 'Qualified Nonrecourse Beginning',
    fieldCategory: 'SECTION_K',
    valueType: 'numeric',
    xMin: 155,
    xMax: 235,
    yMin: 224,
    yMax: 254,
    hasSubtype: false,
    subtypeXMin: null,
    subtypeXMax: null
  },
  {
    fieldId: 'K_QUAL_NONRECOURSE_END',
    boxNumber: 'K_QUAL_NONRECOURSE_END',
    label: 'Qualified Nonrecourse Ending',
    fieldCategory: 'SECTION_K',
    valueType: 'numeric',
    xMin: 235,
    xMax: 310,
    yMin: 224,
    yMax: 254,
    hasSubtype: false,
    subtypeXMin: null,
    subtypeXMax: null
  },
  {
    fieldId: 'K_RECOURSE_BEGIN',
    boxNumber: 'K_RECOURSE_BEGIN',
    label: 'Recourse Beginning',
    fieldCategory: 'SECTION_K',
    valueType: 'numeric',
    xMin: 155,
    xMax: 235,
    yMin: 208,
    yMax: 238,
    hasSubtype: false,
    subtypeXMin: null,
    subtypeXMax: null
  },
  {
    fieldId: 'K_RECOURSE_END',
    boxNumber: 'K_RECOURSE_END',
    label: 'Recourse Ending',
    fieldCategory: 'SECTION_K',
    valueType: 'numeric',
    xMin: 235,
    xMax: 310,
    yMin: 208,
    yMax: 238,
    hasSubtype: false,
    subtypeXMin: null,
    subtypeXMax: null
  },
  {
    fieldId: 'K2_CHECKBOX',
    boxNumber: 'K2_CHECKBOX',
    label: 'K-2 Attached',
    fieldCategory: 'CHECKBOX',
    valueType: 'checkbox',
    xMin: 280,
    xMax: 310,
    yMin: 191,
    yMax: 221,
    hasSubtype: false,
    subtypeXMin: null,
    subtypeXMax: null
  },
  {
    fieldId: 'K3_CHECKBOX',
    boxNumber: 'K3_CHECKBOX',
    label: 'K-3 Attached',
    fieldCategory: 'CHECKBOX',
    valueType: 'checkbox',
    xMin: 280,
    xMax: 310,
    yMin: 176,
    yMax: 206,
    hasSubtype: false,
    subtypeXMin: null,
    subtypeXMax: null
  }
];

// ============================================================================
// Section L — Partner's Capital Account Analysis (6)
// Verified: L_BEG_CAPITAL at (257.8, 157.4), L_CURR_YR_INCOME at (259.3, 133.7),
//           L_WITHDRAWALS at (257.8, 109.4)
// ============================================================================
const SECTION_L_REGIONS: K1PositionRegion[] = [
  {
    fieldId: 'L_BEG_CAPITAL',
    boxNumber: 'L_BEG_CAPITAL',
    label: 'Beginning Capital Account',
    fieldCategory: 'SECTION_L',
    valueType: 'numeric',
    xMin: 220,
    xMax: 306,
    yMin: 142,
    yMax: 172,
    hasSubtype: false,
    subtypeXMin: null,
    subtypeXMax: null
  },
  {
    fieldId: 'L_CONTRIBUTED',
    boxNumber: 'L_CONTRIBUTED',
    label: 'Capital Contributed',
    fieldCategory: 'SECTION_L',
    valueType: 'numeric',
    xMin: 220,
    xMax: 306,
    yMin: 126,
    yMax: 156,
    hasSubtype: false,
    subtypeXMin: null,
    subtypeXMax: null
  },
  {
    fieldId: 'L_CURR_YR_INCOME',
    boxNumber: 'L_CURR_YR_INCOME',
    label: 'Current Year Net Income (Loss)',
    fieldCategory: 'SECTION_L',
    valueType: 'numeric',
    xMin: 220,
    xMax: 306,
    yMin: 119,
    yMax: 149,
    hasSubtype: false,
    subtypeXMin: null,
    subtypeXMax: null
  },
  {
    fieldId: 'L_OTHER',
    boxNumber: 'L_OTHER',
    label: 'Other Increase (Decrease)',
    fieldCategory: 'SECTION_L',
    valueType: 'numeric',
    xMin: 220,
    xMax: 306,
    yMin: 103,
    yMax: 133,
    hasSubtype: false,
    subtypeXMin: null,
    subtypeXMax: null
  },
  {
    fieldId: 'L_WITHDRAWALS',
    boxNumber: 'L_WITHDRAWALS',
    label: 'Withdrawals & Distributions',
    fieldCategory: 'SECTION_L',
    valueType: 'numeric',
    xMin: 220,
    xMax: 306,
    yMin: 95,
    yMax: 125,
    hasSubtype: false,
    subtypeXMin: null,
    subtypeXMax: null
  },
  {
    fieldId: 'L_END_CAPITAL',
    boxNumber: 'L_END_CAPITAL',
    label: 'Ending Capital Account',
    fieldCategory: 'SECTION_L',
    valueType: 'numeric',
    xMin: 220,
    xMax: 306,
    yMin: 83,
    yMax: 113,
    hasSubtype: false,
    subtypeXMin: null,
    subtypeXMax: null
  }
];

// ============================================================================
// Section M — Contributed Property (2)
// Verified: M_NO at (101.2, 74.2)
// ============================================================================
const SECTION_M_REGIONS: K1PositionRegion[] = [
  {
    fieldId: 'M_YES',
    boxNumber: 'M_YES',
    label: 'Contributed Property: Yes',
    fieldCategory: 'SECTION_M',
    valueType: 'checkbox',
    xMin: 50,
    xMax: 85,
    yMin: 74,
    yMax: 104,
    hasSubtype: false,
    subtypeXMin: null,
    subtypeXMax: null
  },
  {
    fieldId: 'M_NO',
    boxNumber: 'M_NO',
    label: 'Contributed Property: No',
    fieldCategory: 'SECTION_M',
    valueType: 'checkbox',
    xMin: 86,
    xMax: 120,
    yMin: 59,
    yMax: 89,
    hasSubtype: false,
    subtypeXMin: null,
    subtypeXMax: null
  }
];

// ============================================================================
// Section N — Net Unrecognized 704(c) (2)
// Verified: N_BEGINNING at (271.5, 49.7), N_ENDING at (92.1, 2.8)
// ============================================================================
const SECTION_N_REGIONS: K1PositionRegion[] = [
  {
    fieldId: 'N_BEGINNING',
    boxNumber: 'N_BEGINNING',
    label: 'Net 704(c) Beginning',
    fieldCategory: 'SECTION_N',
    valueType: 'numeric',
    xMin: 220,
    xMax: 306,
    yMin: 35,
    yMax: 65,
    hasSubtype: false,
    subtypeXMin: null,
    subtypeXMax: null
  },
  {
    fieldId: 'N_ENDING',
    boxNumber: 'N_ENDING',
    label: 'Net 704(c) Ending',
    fieldCategory: 'SECTION_N',
    valueType: 'numeric',
    xMin: 55,
    xMax: 140,
    yMin: 0,
    yMax: 20,
    hasSubtype: false,
    subtypeXMin: null,
    subtypeXMax: null
  }
];

// ============================================================================
// Part III — Partner's Share of Current Year Income, Deductions, Credits, etc.
// Left Column: Boxes 1-13 (19 regions including sub-boxes)
// Verified: BOX_11 at (314.2/403.9, 314.4), BOX_19 at (455.2/530.6, 422-423)
// ============================================================================
const PART_III_LEFT_REGIONS: K1PositionRegion[] = [
  {
    fieldId: 'BOX_1',
    boxNumber: '1',
    label: 'Ordinary business income (loss)',
    fieldCategory: 'PART_III',
    valueType: 'numeric',
    xMin: 370,
    xMax: 455,
    yMin: 683,
    yMax: 713,
    hasSubtype: false,
    subtypeXMin: null,
    subtypeXMax: null
  },
  {
    fieldId: 'BOX_2',
    boxNumber: '2',
    label: 'Net rental real estate income (loss)',
    fieldCategory: 'PART_III',
    valueType: 'numeric',
    xMin: 370,
    xMax: 455,
    yMin: 660,
    yMax: 690,
    hasSubtype: false,
    subtypeXMin: null,
    subtypeXMax: null
  },
  {
    fieldId: 'BOX_3',
    boxNumber: '3',
    label: 'Other net rental income (loss)',
    fieldCategory: 'PART_III',
    valueType: 'numeric',
    xMin: 370,
    xMax: 455,
    yMin: 637,
    yMax: 667,
    hasSubtype: false,
    subtypeXMin: null,
    subtypeXMax: null
  },
  {
    fieldId: 'BOX_4A',
    boxNumber: '4a',
    label: 'Guaranteed payments for services',
    fieldCategory: 'PART_III',
    valueType: 'numeric',
    xMin: 370,
    xMax: 455,
    yMin: 614,
    yMax: 644,
    hasSubtype: false,
    subtypeXMin: null,
    subtypeXMax: null
  },
  {
    fieldId: 'BOX_4B',
    boxNumber: '4b',
    label: 'Guaranteed payments for capital',
    fieldCategory: 'PART_III',
    valueType: 'numeric',
    xMin: 370,
    xMax: 455,
    yMin: 591,
    yMax: 621,
    hasSubtype: false,
    subtypeXMin: null,
    subtypeXMax: null
  },
  {
    fieldId: 'BOX_4C',
    boxNumber: '4c',
    label: 'Total guaranteed payments',
    fieldCategory: 'PART_III',
    valueType: 'numeric',
    xMin: 370,
    xMax: 455,
    yMin: 568,
    yMax: 598,
    hasSubtype: false,
    subtypeXMin: null,
    subtypeXMax: null
  },
  {
    fieldId: 'BOX_5',
    boxNumber: '5',
    label: 'Interest income',
    fieldCategory: 'PART_III',
    valueType: 'numeric',
    xMin: 370,
    xMax: 455,
    yMin: 545,
    yMax: 575,
    hasSubtype: false,
    subtypeXMin: null,
    subtypeXMax: null
  },
  {
    fieldId: 'BOX_6A',
    boxNumber: '6a',
    label: 'Ordinary dividends',
    fieldCategory: 'PART_III',
    valueType: 'numeric',
    xMin: 370,
    xMax: 455,
    yMin: 522,
    yMax: 552,
    hasSubtype: false,
    subtypeXMin: null,
    subtypeXMax: null
  },
  {
    fieldId: 'BOX_6B',
    boxNumber: '6b',
    label: 'Qualified dividends',
    fieldCategory: 'PART_III',
    valueType: 'numeric',
    xMin: 370,
    xMax: 455,
    yMin: 499,
    yMax: 529,
    hasSubtype: false,
    subtypeXMin: null,
    subtypeXMax: null
  },
  {
    fieldId: 'BOX_6C',
    boxNumber: '6c',
    label: 'Dividend equivalents',
    fieldCategory: 'PART_III',
    valueType: 'numeric',
    xMin: 370,
    xMax: 455,
    yMin: 476,
    yMax: 506,
    hasSubtype: false,
    subtypeXMin: null,
    subtypeXMax: null
  },
  {
    fieldId: 'BOX_7',
    boxNumber: '7',
    label: 'Royalties',
    fieldCategory: 'PART_III',
    valueType: 'numeric',
    xMin: 370,
    xMax: 455,
    yMin: 453,
    yMax: 483,
    hasSubtype: false,
    subtypeXMin: null,
    subtypeXMax: null
  },
  {
    fieldId: 'BOX_8',
    boxNumber: '8',
    label: 'Net short-term capital gain (loss)',
    fieldCategory: 'PART_III',
    valueType: 'numeric',
    xMin: 370,
    xMax: 455,
    yMin: 430,
    yMax: 460,
    hasSubtype: false,
    subtypeXMin: null,
    subtypeXMax: null
  },
  {
    fieldId: 'BOX_9A',
    boxNumber: '9a',
    label: 'Net long-term capital gain (loss)',
    fieldCategory: 'PART_III',
    valueType: 'numeric',
    xMin: 370,
    xMax: 455,
    yMin: 407,
    yMax: 437,
    hasSubtype: false,
    subtypeXMin: null,
    subtypeXMax: null
  },
  {
    fieldId: 'BOX_9B',
    boxNumber: '9b',
    label: 'Collectibles (28%) gain (loss)',
    fieldCategory: 'PART_III',
    valueType: 'numeric',
    xMin: 370,
    xMax: 455,
    yMin: 384,
    yMax: 414,
    hasSubtype: false,
    subtypeXMin: null,
    subtypeXMax: null
  },
  {
    fieldId: 'BOX_9C',
    boxNumber: '9c',
    label: 'Unrecaptured section 1250 gain',
    fieldCategory: 'PART_III',
    valueType: 'numeric',
    xMin: 370,
    xMax: 455,
    yMin: 361,
    yMax: 391,
    hasSubtype: false,
    subtypeXMin: null,
    subtypeXMax: null
  },
  {
    fieldId: 'BOX_10',
    boxNumber: '10',
    label: 'Net section 1231 gain (loss)',
    fieldCategory: 'PART_III',
    valueType: 'numeric',
    xMin: 370,
    xMax: 455,
    yMin: 338,
    yMax: 368,
    hasSubtype: false,
    subtypeXMin: null,
    subtypeXMax: null
  },
  {
    fieldId: 'BOX_11',
    boxNumber: '11',
    label: 'Other income (loss)',
    fieldCategory: 'PART_III',
    valueType: 'numeric',
    xMin: 370,
    xMax: 455,
    yMin: 300,
    yMax: 330,
    hasSubtype: true,
    subtypeXMin: 300,
    subtypeXMax: 365
  },
  {
    fieldId: 'BOX_12',
    boxNumber: '12',
    label: 'Section 179 deduction',
    fieldCategory: 'PART_III',
    valueType: 'numeric',
    xMin: 370,
    xMax: 455,
    yMin: 277,
    yMax: 307,
    hasSubtype: true,
    subtypeXMin: 300,
    subtypeXMax: 365
  },
  {
    fieldId: 'BOX_13',
    boxNumber: '13',
    label: 'Other deductions',
    fieldCategory: 'PART_III',
    valueType: 'numeric',
    xMin: 370,
    xMax: 455,
    yMin: 245,
    yMax: 275,
    hasSubtype: true,
    subtypeXMin: 300,
    subtypeXMax: 365
  }
];

// ============================================================================
// Part III Right Column: Boxes 14-21 (8 regions)
// Verified: BOX_16_K3 at (563.3, 603.8), BOX_19 at (455.2/530.6, 422-423),
//           BOX_21 at (456.4/555.6, 266-267)
// ============================================================================
const PART_III_RIGHT_REGIONS: K1PositionRegion[] = [
  {
    fieldId: 'BOX_14',
    boxNumber: '14',
    label: 'Self-employment earnings (loss)',
    fieldCategory: 'PART_III',
    valueType: 'numeric',
    xMin: 510,
    xMax: 595,
    yMin: 683,
    yMax: 713,
    hasSubtype: true,
    subtypeXMin: 440,
    subtypeXMax: 505
  },
  {
    fieldId: 'BOX_15',
    boxNumber: '15',
    label: 'Credits',
    fieldCategory: 'PART_III',
    valueType: 'numeric',
    xMin: 510,
    xMax: 595,
    yMin: 650,
    yMax: 680,
    hasSubtype: true,
    subtypeXMin: 440,
    subtypeXMax: 505
  },
  {
    fieldId: 'BOX_16',
    boxNumber: '16',
    label: 'Foreign transactions',
    fieldCategory: 'PART_III',
    valueType: 'numeric',
    xMin: 510,
    xMax: 595,
    yMin: 589,
    yMax: 619,
    hasSubtype: true,
    subtypeXMin: 440,
    subtypeXMax: 505
  },
  {
    fieldId: 'BOX_16_K3',
    boxNumber: '16_K3',
    label: 'Schedule K-2/K-3 attached',
    fieldCategory: 'CHECKBOX',
    valueType: 'checkbox',
    xMin: 548,
    xMax: 580,
    yMin: 589,
    yMax: 619,
    hasSubtype: false,
    subtypeXMin: null,
    subtypeXMax: null
  },
  {
    fieldId: 'BOX_17',
    boxNumber: '17',
    label: 'Alternative minimum tax (AMT) items',
    fieldCategory: 'PART_III',
    valueType: 'numeric',
    xMin: 510,
    xMax: 595,
    yMin: 510,
    yMax: 540,
    hasSubtype: true,
    subtypeXMin: 440,
    subtypeXMax: 505
  },
  {
    fieldId: 'BOX_18',
    boxNumber: '18',
    label: 'Tax-exempt income and nondeductible expenses',
    fieldCategory: 'PART_III',
    valueType: 'numeric',
    xMin: 510,
    xMax: 595,
    yMin: 460,
    yMax: 490,
    hasSubtype: true,
    subtypeXMin: 440,
    subtypeXMax: 505
  },
  {
    fieldId: 'BOX_19',
    boxNumber: '19',
    label: 'Distributions',
    fieldCategory: 'PART_III',
    valueType: 'numeric',
    xMin: 510,
    xMax: 595,
    yMin: 395,
    yMax: 445,
    hasSubtype: true,
    subtypeXMin: 440,
    subtypeXMax: 505
  },
  {
    fieldId: 'BOX_20',
    boxNumber: '20',
    label: 'Other information',
    fieldCategory: 'PART_III',
    valueType: 'numeric',
    xMin: 510,
    xMax: 595,
    yMin: 275,
    yMax: 395,
    hasSubtype: true,
    subtypeXMin: 440,
    subtypeXMax: 505
  },
  {
    fieldId: 'BOX_21',
    boxNumber: '21',
    label: 'Foreign taxes paid or accrued',
    fieldCategory: 'PART_III',
    valueType: 'numeric',
    xMin: 510,
    xMax: 595,
    yMin: 245,
    yMax: 280,
    hasSubtype: true,
    subtypeXMin: 440,
    subtypeXMax: 505
  }
];

// ============================================================================
// Combined Export
// ============================================================================

export const K1_POSITION_REGIONS: K1PositionRegion[] = [
  ...HEADER_REGIONS,
  ...PART_I_REGIONS,
  ...PART_II_REGIONS,
  ...SECTION_J_REGIONS,
  ...SECTION_K_REGIONS,
  ...SECTION_L_REGIONS,
  ...SECTION_M_REGIONS,
  ...SECTION_N_REGIONS,
  ...PART_III_LEFT_REGIONS,
  ...PART_III_RIGHT_REGIONS
];

/**
 * Position matching tolerance in PDF points.
 * Regions are checked with this tolerance added to each boundary.
 */
export const POSITION_TOLERANCE = 15;

/**
 * Y-band tolerance for pairing subtype codes with values.
 */
export const SUBTYPE_Y_TOLERANCE = 8;

/**
 * Find the position region matching a given (x, y) coordinate.
 * Returns the region if found, or null if no match within tolerance.
 */
export function findRegionForPosition(
  x: number,
  y: number,
  tolerance: number = POSITION_TOLERANCE
): K1PositionRegion | null {
  for (const region of K1_POSITION_REGIONS) {
    if (
      x >= region.xMin - tolerance &&
      x <= region.xMax + tolerance &&
      y >= region.yMin - tolerance &&
      y <= region.yMax + tolerance
    ) {
      return region;
    }
  }
  return null;
}

/**
 * Find all regions matching a given field category.
 */
export function getRegionsByCategory(
  category: string
): K1PositionRegion[] {
  return K1_POSITION_REGIONS.filter((r) => r.fieldCategory === category);
}

/**
 * Find a region by its fieldId.
 */
export function getRegionById(
  fieldId: string
): K1PositionRegion | null {
  return K1_POSITION_REGIONS.find((r) => r.fieldId === fieldId) ?? null;
}
