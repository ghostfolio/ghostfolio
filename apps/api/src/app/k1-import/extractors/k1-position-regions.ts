/**
 * K-1 Form Position Region Definitions
 *
 * Defines bounding box regions for all K-1 (Form 1065) form fields.
 * Coordinates are in PDF points (1 pt = 1/72 inch), origin bottom-left.
 * Page size: 612 x 792 pts (US Letter).
 *
 * Regions calibrated from actual e-filed K-1 PDF text extraction via pdfjs-dist.
 * +/-15pt POSITION_TOLERANCE is applied at match time on top of the defined bounds.
 *
 * Layout reference (left & right columns):
 *   Left:  box numbers x~316-318, labels x~334, values x~370-445
 *   Right: box numbers x~453,     labels x~471, code x~445-510, values x~510-600
 */

export interface K1PositionRegion {
  /** Unique identifier (e.g., 'BOX_1', 'J_PROFIT_BEGIN', 'FINAL_K1') */
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
// Verified: FINAL_K1 'X' at (324.3, 746.2), TAX_YEAR '20'+'25' at (236.8/262.1, 727.7)
// ============================================================================
const HEADER_REGIONS: K1PositionRegion[] = [
  {
    fieldId: 'TAX_YEAR',
    boxNumber: 'TAX_YEAR',
    label: 'Tax Year',
    fieldCategory: 'METADATA',
    valueType: 'text',
    xMin: 230,
    xMax: 275,
    yMin: 720,
    yMax: 738,
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
    xMin: 135,
    xMax: 200,
    yMin: 679,
    yMax: 695,
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
    xMin: 240,
    xMax: 300,
    yMin: 679,
    yMax: 695,
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
    xMin: 318,
    xMax: 338,
    yMin: 739,
    yMax: 753,
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
    xMin: 398,
    xMax: 418,
    yMin: 739,
    yMax: 753,
    hasSubtype: false,
    subtypeXMin: null,
    subtypeXMax: null
  }
];

// ============================================================================
// Part I -- Information About the Partnership (4)
// Verified: C_IRS_CENTER 'E-FILE' at (185.4, 553.7)
// TMPL: A at y=626, B at y=602, C at y=554.5, D at y=543
// ============================================================================
const PART_I_REGIONS: K1PositionRegion[] = [
  {
    fieldId: 'A_EIN',
    boxNumber: 'A',
    label: "Partnership's EIN",
    fieldCategory: 'METADATA',
    valueType: 'text',
    xMin: 58,
    xMax: 190,
    yMin: 615,
    yMax: 635,
    hasSubtype: false,
    subtypeXMin: null,
    subtypeXMax: null
  },
  {
    fieldId: 'B_NAME',
    boxNumber: 'B',
    label: "Partnership's name, address, city, state, and ZIP code",
    fieldCategory: 'METADATA',
    valueType: 'text',
    xMin: 58,
    xMax: 290,
    yMin: 570,
    yMax: 613,
    hasSubtype: false,
    subtypeXMin: null,
    subtypeXMax: null
  },
  {
    fieldId: 'C_IRS_CENTER',
    boxNumber: 'C',
    label: 'IRS center where partnership filed return',
    fieldCategory: 'METADATA',
    valueType: 'text',
    xMin: 170,
    xMax: 290,
    yMin: 546,
    yMax: 562,
    hasSubtype: false,
    subtypeXMin: null,
    subtypeXMax: null
  },
  {
    fieldId: 'D_PTP',
    boxNumber: 'D',
    label: 'Check if this is a publicly traded partnership',
    fieldCategory: 'CHECKBOX',
    valueType: 'checkbox',
    xMin: 250,
    xMax: 310,
    yMin: 536,
    yMax: 550,
    hasSubtype: false,
    subtypeXMin: null,
    subtypeXMax: null
  }
];

// ============================================================================
// Part II -- Information About the Partner (10)
// Verified: G_LIMITED 'X' at (180.3, 446.6), H1_DOMESTIC 'X' at (58.0, 422.9),
//           H2_DE 'X' at (57.9, 410.5)
// TMPL: E at y=518, F at y=494, G at y=447, H1 at y=422, H2 at y=411,
//       I1 at y=386, I2 at y=374
// ============================================================================
const PART_II_REGIONS: K1PositionRegion[] = [
  {
    fieldId: 'E_TIN',
    boxNumber: 'E',
    label: "Partner's identifying number",
    fieldCategory: 'METADATA',
    valueType: 'text',
    xMin: 58,
    xMax: 190,
    yMin: 510,
    yMax: 526,
    hasSubtype: false,
    subtypeXMin: null,
    subtypeXMax: null
  },
  {
    fieldId: 'F_NAME_ADDR',
    boxNumber: 'F',
    label: "Partner's name, address, city, state, and ZIP code",
    fieldCategory: 'METADATA',
    valueType: 'text',
    xMin: 58,
    xMax: 290,
    yMin: 460,
    yMax: 510,
    hasSubtype: false,
    subtypeXMin: null,
    subtypeXMax: null
  },
  {
    fieldId: 'G_GENERAL',
    boxNumber: 'G_GENERAL',
    label: 'General partner or LLC member-manager',
    fieldCategory: 'CHECKBOX',
    valueType: 'checkbox',
    xMin: 152,
    xMax: 178,
    yMin: 439,
    yMax: 454,
    hasSubtype: false,
    subtypeXMin: null,
    subtypeXMax: null
  },
  {
    fieldId: 'G_LIMITED',
    boxNumber: 'G_LIMITED',
    label: 'Limited partner or other LLC member',
    fieldCategory: 'CHECKBOX',
    valueType: 'checkbox',
    xMin: 178,
    xMax: 202,
    yMin: 439,
    yMax: 454,
    hasSubtype: false,
    subtypeXMin: null,
    subtypeXMax: null
  },
  {
    fieldId: 'H1_DOMESTIC',
    boxNumber: 'H1_DOMESTIC',
    label: 'Domestic partner',
    fieldCategory: 'CHECKBOX',
    valueType: 'checkbox',
    xMin: 50,
    xMax: 70,
    yMin: 416,
    yMax: 430,
    hasSubtype: false,
    subtypeXMin: null,
    subtypeXMax: null
  },
  {
    fieldId: 'H1_FOREIGN',
    boxNumber: 'H1_FOREIGN',
    label: 'Foreign partner',
    fieldCategory: 'CHECKBOX',
    valueType: 'checkbox',
    xMin: 178,
    xMax: 198,
    yMin: 416,
    yMax: 430,
    hasSubtype: false,
    subtypeXMin: null,
    subtypeXMax: null
  },
  {
    fieldId: 'H2_DE',
    boxNumber: 'H2',
    label: 'If the partner is a disregarded entity (DE)',
    fieldCategory: 'CHECKBOX',
    valueType: 'checkbox',
    xMin: 50,
    xMax: 70,
    yMin: 404,
    yMax: 418,
    hasSubtype: false,
    subtypeXMin: null,
    subtypeXMax: null
  },
  {
    fieldId: 'I1_ENTITY_TYPE',
    boxNumber: 'I1',
    label: 'What type of entity is this partner?',
    fieldCategory: 'METADATA',
    valueType: 'text',
    xMin: 165,
    xMax: 290,
    yMin: 379,
    yMax: 393,
    hasSubtype: false,
    subtypeXMin: null,
    subtypeXMax: null
  },
  {
    fieldId: 'I2_RETIREMENT',
    boxNumber: 'I2',
    label: 'If this partner is a retirement plan (IRA/SEP/Keogh/etc.), check here',
    fieldCategory: 'CHECKBOX',
    valueType: 'checkbox',
    xMin: 270,
    xMax: 295,
    yMin: 367,
    yMax: 381,
    hasSubtype: false,
    subtypeXMin: null,
    subtypeXMax: null
  },
  {
    fieldId: 'H2_DE_TIN',
    boxNumber: 'H2_TIN',
    label: 'Disregarded entity TIN',
    fieldCategory: 'METADATA',
    valueType: 'text',
    xMin: 70,
    xMax: 140,
    yMin: 391,
    yMax: 405,
    hasSubtype: false,
    subtypeXMin: null,
    subtypeXMax: null
  }
];

// ============================================================================
// Section J -- Partner's Share of Profit, Loss, and Capital (8)
// Verified: J_PROFIT_BEGIN '3.032900' at (139.1, 339.1),
//           J_PROFIT_END '0.000000' at (250.1, 339.1),
//           J_CAPITAL_BEGIN '3.032900' at (139.1, 314.2)
// TMPL: Profit at y=338, Loss at y=326, Capital at y=314, Sale/Exchange at y=290
// ============================================================================
const SECTION_J_REGIONS: K1PositionRegion[] = [
  {
    fieldId: 'J_PROFIT_BEGIN',
    boxNumber: 'J_PROFIT_BEGIN',
    label: 'Profit Beginning %',
    fieldCategory: 'SECTION_J',
    valueType: 'percentage',
    xMin: 130,
    xMax: 185,
    yMin: 331,
    yMax: 347,
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
    xMin: 240,
    xMax: 295,
    yMin: 331,
    yMax: 347,
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
    xMin: 130,
    xMax: 185,
    yMin: 318,
    yMax: 334,
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
    xMin: 240,
    xMax: 295,
    yMin: 318,
    yMax: 334,
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
    xMin: 130,
    xMax: 185,
    yMin: 306,
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
    xMin: 240,
    xMax: 295,
    yMin: 306,
    yMax: 322,
    hasSubtype: false,
    subtypeXMin: null,
    subtypeXMax: null
  },
  {
    fieldId: 'J_SALE',
    boxNumber: 'J_SALE',
    label: 'Check if decrease is due to sale',
    fieldCategory: 'CHECKBOX',
    valueType: 'checkbox',
    xMin: 56,
    xMax: 72,
    yMin: 283,
    yMax: 297,
    hasSubtype: false,
    subtypeXMin: null,
    subtypeXMax: null
  },
  {
    fieldId: 'J_EXCHANGE',
    boxNumber: 'J_EXCHANGE',
    label: 'Exchange of partnership interest',
    fieldCategory: 'CHECKBOX',
    valueType: 'checkbox',
    xMin: 100,
    xMax: 116,
    yMin: 283,
    yMax: 297,
    hasSubtype: false,
    subtypeXMin: null,
    subtypeXMax: null
  }
];

// ============================================================================
// Section K -- Partner's Share of Liabilities (8)
// Verified: K_NONRECOURSE_BEGIN '498,211' at (180.8, 254.5),
//           K2_CHECKBOX 'X' at (294.9, 205.8)
// TMPL: Nonrecourse at y=254, Qual nonrecourse at y=230-238, Recourse at y=218.5,
//       K2 at y=207, K3 at y=186-195
// ============================================================================
const SECTION_K_REGIONS: K1PositionRegion[] = [
  {
    fieldId: 'K_NONRECOURSE_BEGIN',
    boxNumber: 'K_NONRECOURSE_BEGIN',
    label: 'Nonrecourse Beginning',
    fieldCategory: 'SECTION_K',
    valueType: 'numeric',
    xMin: 135,
    xMax: 220,
    yMin: 247,
    yMax: 262,
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
    xMin: 222,
    xMax: 305,
    yMin: 247,
    yMax: 262,
    hasSubtype: false,
    subtypeXMin: null,
    subtypeXMax: null
  },
  {
    fieldId: 'K_QUAL_NONRECOURSE_BEGIN',
    boxNumber: 'K_QUAL_NONRECOURSE_BEGIN',
    label: 'Qualified nonrecourse financing Beginning',
    fieldCategory: 'SECTION_K',
    valueType: 'numeric',
    xMin: 135,
    xMax: 220,
    yMin: 222,
    yMax: 245,
    hasSubtype: false,
    subtypeXMin: null,
    subtypeXMax: null
  },
  {
    fieldId: 'K_QUAL_NONRECOURSE_END',
    boxNumber: 'K_QUAL_NONRECOURSE_END',
    label: 'Qualified nonrecourse financing Ending',
    fieldCategory: 'SECTION_K',
    valueType: 'numeric',
    xMin: 222,
    xMax: 305,
    yMin: 222,
    yMax: 245,
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
    xMin: 135,
    xMax: 220,
    yMin: 211,
    yMax: 226,
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
    xMin: 222,
    xMax: 305,
    yMin: 211,
    yMax: 226,
    hasSubtype: false,
    subtypeXMin: null,
    subtypeXMax: null
  },
  {
    fieldId: 'K2_CHECKBOX',
    boxNumber: 'K2',
    label: 'K1 includes liability amounts from lower-tier partnerships',
    fieldCategory: 'CHECKBOX',
    valueType: 'checkbox',
    xMin: 288,
    xMax: 305,
    yMin: 198,
    yMax: 213,
    hasSubtype: false,
    subtypeXMin: null,
    subtypeXMax: null
  },
  {
    fieldId: 'K3_CHECKBOX',
    boxNumber: 'K3',
    label: 'Liability subject to guarantees or payment obligations',
    fieldCategory: 'CHECKBOX',
    valueType: 'checkbox',
    xMin: 278,
    xMax: 305,
    yMin: 179,
    yMax: 193,
    hasSubtype: false,
    subtypeXMin: null,
    subtypeXMax: null
  }
];

// ============================================================================
// Section L -- Partner's Capital Account Analysis (6)
// Verified: L_BEG_CAPITAL '4,903,568' at (257.8, 157.4),
//           L_CURR_YR_INCOME '(409,811)' at (259.3, 133.7),
//           L_WITHDRAWALS '4,493,757' at (257.8, 109.4)
// Values right-aligned after $ at x~189.5, data at x~257-260
// ============================================================================
const SECTION_L_REGIONS: K1PositionRegion[] = [
  {
    fieldId: 'L_BEG_CAPITAL',
    boxNumber: 'L_BEG_CAPITAL',
    label: 'Beginning capital account',
    fieldCategory: 'SECTION_L',
    valueType: 'numeric',
    xMin: 190,
    xMax: 305,
    yMin: 150,
    yMax: 165,
    hasSubtype: false,
    subtypeXMin: null,
    subtypeXMax: null
  },
  {
    fieldId: 'L_CONTRIBUTED',
    boxNumber: 'L_CONTRIBUTED',
    label: 'Capital contributed during the year',
    fieldCategory: 'SECTION_L',
    valueType: 'numeric',
    xMin: 190,
    xMax: 305,
    yMin: 138,
    yMax: 153,
    hasSubtype: false,
    subtypeXMin: null,
    subtypeXMax: null
  },
  {
    fieldId: 'L_CURR_YR_INCOME',
    boxNumber: 'L_CURR_YR_INCOME',
    label: 'Current year net income (loss)',
    fieldCategory: 'SECTION_L',
    valueType: 'numeric',
    xMin: 190,
    xMax: 305,
    yMin: 126,
    yMax: 141,
    hasSubtype: false,
    subtypeXMin: null,
    subtypeXMax: null
  },
  {
    fieldId: 'L_OTHER',
    boxNumber: 'L_OTHER',
    label: 'Other increase (decrease)',
    fieldCategory: 'SECTION_L',
    valueType: 'numeric',
    xMin: 190,
    xMax: 305,
    yMin: 114,
    yMax: 129,
    hasSubtype: false,
    subtypeXMin: null,
    subtypeXMax: null
  },
  {
    fieldId: 'L_WITHDRAWALS',
    boxNumber: 'L_WITHDRAWALS',
    label: 'Withdrawals and distributions',
    fieldCategory: 'SECTION_L',
    valueType: 'numeric',
    xMin: 190,
    xMax: 305,
    yMin: 102,
    yMax: 117,
    hasSubtype: false,
    subtypeXMin: null,
    subtypeXMax: null
  },
  {
    fieldId: 'L_END_CAPITAL',
    boxNumber: 'L_END_CAPITAL',
    label: 'Ending capital account',
    fieldCategory: 'SECTION_L',
    valueType: 'numeric',
    xMin: 190,
    xMax: 305,
    yMin: 90,
    yMax: 106,
    hasSubtype: false,
    subtypeXMin: null,
    subtypeXMax: null
  }
];

// ============================================================================
// Section M -- Contributed Property with Built-in Gain/Loss (2)
// Verified: M_NO 'X' at (101.2, 74.2)
// TMPL: 'Yes' at x=72, 'No' at x=115.2, both at y=74
// ============================================================================
const SECTION_M_REGIONS: K1PositionRegion[] = [
  {
    fieldId: 'M_YES',
    boxNumber: 'M_YES',
    label: 'Did the partner contribute property with a built-in gain (loss)? Yes',
    fieldCategory: 'CHECKBOX',
    valueType: 'checkbox',
    xMin: 58,
    xMax: 97,
    yMin: 67,
    yMax: 81,
    hasSubtype: false,
    subtypeXMin: null,
    subtypeXMax: null
  },
  {
    fieldId: 'M_NO',
    boxNumber: 'M_NO',
    label: 'Did the partner contribute property with a built-in gain (loss)? No',
    fieldCategory: 'CHECKBOX',
    valueType: 'checkbox',
    xMin: 97,
    xMax: 130,
    yMin: 67,
    yMax: 81,
    hasSubtype: false,
    subtypeXMin: null,
    subtypeXMax: null
  }
];

// ============================================================================
// Section N -- Net Unrecognized Section 704(c) Gain or (Loss) (2)
// Verified: N_BEGINNING '(5,373)' at (271.5, 49.7)
// Values right-aligned after $ at x~189.1
// ============================================================================
const SECTION_N_REGIONS: K1PositionRegion[] = [
  {
    fieldId: 'N_BEGINNING',
    boxNumber: 'N_BEGINNING',
    label: "Partner's Share of Net Unrecognized Section 704(c) Gain or (Loss) Beginning",
    fieldCategory: 'SECTION_N',
    valueType: 'numeric',
    xMin: 190,
    xMax: 305,
    yMin: 42,
    yMax: 58,
    hasSubtype: false,
    subtypeXMin: null,
    subtypeXMax: null
  },
  {
    fieldId: 'N_ENDING',
    boxNumber: 'N_ENDING',
    label: "Partner's Share of Net Unrecognized Section 704(c) Gain or (Loss) Ending",
    fieldCategory: 'SECTION_N',
    valueType: 'numeric',
    xMin: 190,
    xMax: 305,
    yMin: 31,
    yMax: 47,
    hasSubtype: false,
    subtypeXMin: null,
    subtypeXMax: null
  }
];

// ============================================================================
// Part III -- Left Column: Boxes 1-13
//
// Row spacing: 24pt. Label y-positions measured from template text.
// Value column: x=370-445 (between label text and right-column boundary).
// Subtype code column (boxes 11-13): x=305-370.
//
// Verified: BOX_11 subtype 'ZZ*' at (314.2, 314.4),
//           BOX_11 value '(409,615)' at (403.9, 314.4)
// ============================================================================
const PART_III_LEFT_REGIONS: K1PositionRegion[] = [
  {
    fieldId: 'BOX_1',
    boxNumber: '1',
    label: 'Ordinary business income (loss)',
    fieldCategory: 'PART_III',
    valueType: 'numeric',
    xMin: 370,
    xMax: 445,
    yMin: 696,
    yMax: 720,
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
    xMax: 445,
    yMin: 672,
    yMax: 696,
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
    xMax: 445,
    yMin: 648,
    yMax: 672,
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
    xMax: 445,
    yMin: 624,
    yMax: 648,
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
    xMax: 445,
    yMin: 600,
    yMax: 624,
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
    xMax: 445,
    yMin: 576,
    yMax: 600,
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
    xMax: 445,
    yMin: 552,
    yMax: 576,
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
    xMax: 445,
    yMin: 528,
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
    xMax: 445,
    yMin: 504,
    yMax: 528,
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
    xMax: 445,
    yMin: 480,
    yMax: 504,
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
    xMax: 445,
    yMin: 456,
    yMax: 480,
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
    xMax: 445,
    yMin: 432,
    yMax: 456,
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
    xMax: 445,
    yMin: 408,
    yMax: 432,
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
    xMax: 445,
    yMin: 384,
    yMax: 408,
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
    xMax: 445,
    yMin: 360,
    yMax: 384,
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
    xMax: 445,
    yMin: 336,
    yMax: 360,
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
    xMax: 445,
    yMin: 288,
    yMax: 336,
    hasSubtype: true,
    subtypeXMin: 305,
    subtypeXMax: 370
  },
  {
    fieldId: 'BOX_12',
    boxNumber: '12',
    label: 'Section 179 deduction',
    fieldCategory: 'PART_III',
    valueType: 'numeric',
    xMin: 370,
    xMax: 445,
    yMin: 264,
    yMax: 288,
    hasSubtype: true,
    subtypeXMin: 305,
    subtypeXMax: 370
  },
  {
    fieldId: 'BOX_13',
    boxNumber: '13',
    label: 'Other deductions',
    fieldCategory: 'PART_III',
    valueType: 'numeric',
    xMin: 370,
    xMax: 445,
    yMin: 240,
    yMax: 264,
    hasSubtype: true,
    subtypeXMin: 305,
    subtypeXMax: 370
  }
];

// ============================================================================
// Part III -- Right Column: Boxes 14-23
//
// Code column: x=445-510 (just right of the left column boundary).
// Value column: x=510-600.
//
// Verified: BOX_16_K3 'X' at (563.3, 603.8),
//           BOX_19 subtype 'A' at (455.2, 423.2), value '4,493,757' at (530.6, 422.0),
//           BOX_20 subtypes A/B/V/* at x~455-456, values at x~525-526,
//           BOX_21 subtype '*' at (456.4, 267.1), value '196' at (555.6, 266.1)
// ============================================================================
const PART_III_RIGHT_REGIONS: K1PositionRegion[] = [
  {
    fieldId: 'BOX_14',
    boxNumber: '14',
    label: 'Self-employment earnings (loss)',
    fieldCategory: 'PART_III',
    valueType: 'numeric',
    xMin: 510,
    xMax: 600,
    yMin: 672,
    yMax: 720,
    hasSubtype: true,
    subtypeXMin: 445,
    subtypeXMax: 510
  },
  {
    fieldId: 'BOX_15',
    boxNumber: '15',
    label: 'Credits',
    fieldCategory: 'PART_III',
    valueType: 'numeric',
    xMin: 510,
    xMax: 600,
    yMin: 624,
    yMax: 672,
    hasSubtype: true,
    subtypeXMin: 445,
    subtypeXMax: 510
  },
  {
    fieldId: 'BOX_16',
    boxNumber: '16',
    label: 'Schedule K-3 is attached if checked',
    fieldCategory: 'PART_III',
    valueType: 'numeric',
    xMin: 510,
    xMax: 600,
    yMin: 600,
    yMax: 624,
    hasSubtype: true,
    subtypeXMin: 445,
    subtypeXMax: 510
  },
  {
    fieldId: 'BOX_16_K3',
    boxNumber: '16_K3',
    label: 'Schedule K-3 is attached',
    fieldCategory: 'CHECKBOX',
    valueType: 'checkbox',
    xMin: 556,
    xMax: 575,
    yMin: 596,
    yMax: 612,
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
    xMax: 600,
    yMin: 530,
    yMax: 600,
    hasSubtype: true,
    subtypeXMin: 445,
    subtypeXMax: 510
  },
  {
    fieldId: 'BOX_18',
    boxNumber: '18',
    label: 'Tax-exempt income and nondeductible expenses',
    fieldCategory: 'PART_III',
    valueType: 'numeric',
    xMin: 510,
    xMax: 600,
    yMin: 444,
    yMax: 530,
    hasSubtype: true,
    subtypeXMin: 445,
    subtypeXMax: 510
  },
  {
    fieldId: 'BOX_19',
    boxNumber: '19',
    label: 'Distributions',
    fieldCategory: 'PART_III',
    valueType: 'numeric',
    xMin: 510,
    xMax: 600,
    yMin: 396,
    yMax: 444,
    hasSubtype: true,
    subtypeXMin: 445,
    subtypeXMax: 510
  },
  {
    fieldId: 'BOX_20',
    boxNumber: '20',
    label: 'Other information',
    fieldCategory: 'PART_III',
    valueType: 'numeric',
    xMin: 510,
    xMax: 600,
    yMin: 284,
    yMax: 396,
    hasSubtype: true,
    subtypeXMin: 445,
    subtypeXMax: 510
  },
  {
    fieldId: 'BOX_21',
    boxNumber: '21',
    label: 'Foreign taxes paid or accrued',
    fieldCategory: 'PART_III',
    valueType: 'numeric',
    xMin: 510,
    xMax: 600,
    yMin: 240,
    yMax: 284,
    hasSubtype: true,
    subtypeXMin: 445,
    subtypeXMax: 510
  },
  {
    fieldId: 'BOX_22',
    boxNumber: '22',
    label: 'More than one activity for at-risk purposes',
    fieldCategory: 'CHECKBOX',
    valueType: 'checkbox',
    xMin: 525,
    xMax: 590,
    yMin: 176,
    yMax: 190,
    hasSubtype: false,
    subtypeXMin: null,
    subtypeXMax: null
  },
  {
    fieldId: 'BOX_23',
    boxNumber: '23',
    label: 'More than one activity for passive activity purposes',
    fieldCategory: 'CHECKBOX',
    valueType: 'checkbox',
    xMin: 525,
    xMax: 590,
    yMin: 164,
    yMax: 178,
    hasSubtype: false,
    subtypeXMin: null,
    subtypeXMax: null
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
