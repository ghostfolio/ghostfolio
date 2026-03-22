-- AlterTable
ALTER TABLE "K1ImportSession" DROP COLUMN "verifiedData";

-- AlterTable (use IF EXISTS for columns that may have been added via db push)
ALTER TABLE "KDocument" DROP COLUMN IF EXISTS "previousData";
ALTER TABLE "KDocument" DROP COLUMN IF EXISTS "previousFilingStatus";
ALTER TABLE "KDocument" ALTER COLUMN "data" DROP NOT NULL;

-- CreateTable
CREATE TABLE "k1_box_definition" (
    "box_key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "section" TEXT,
    "data_type" TEXT NOT NULL DEFAULT 'number',
    "sort_order" INTEGER NOT NULL,
    "irs_form_line" TEXT,
    "description" TEXT,
    "is_custom" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "k1_box_definition_pkey" PRIMARY KEY ("box_key")
);

-- CreateTable
CREATE TABLE "k1_box_override" (
    "id" TEXT NOT NULL,
    "box_key" TEXT NOT NULL,
    "partnership_id" TEXT NOT NULL,
    "custom_label" TEXT,
    "is_ignored" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "k1_box_override_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "k1_line_item" (
    "id" TEXT NOT NULL,
    "k_document_id" TEXT NOT NULL,
    "box_key" TEXT NOT NULL,
    "amount" DECIMAL(15,2),
    "text_value" TEXT,
    "raw_text" TEXT,
    "confidence" DECIMAL(3,2),
    "source_page" INTEGER,
    "source_coords" JSONB,
    "is_user_edited" BOOLEAN NOT NULL DEFAULT false,
    "is_superseded" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "k1_line_item_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "k1_box_definition_section_idx" ON "k1_box_definition"("section");

-- CreateIndex
CREATE INDEX "k1_box_definition_sort_order_idx" ON "k1_box_definition"("sort_order");

-- CreateIndex
CREATE INDEX "k1_box_override_partnership_id_idx" ON "k1_box_override"("partnership_id");

-- CreateIndex
CREATE UNIQUE INDEX "k1_box_override_box_key_partnership_id_key" ON "k1_box_override"("box_key", "partnership_id");

-- CreateIndex
CREATE INDEX "k1_line_item_k_document_id_box_key_idx" ON "k1_line_item"("k_document_id", "box_key");

-- CreateIndex
CREATE INDEX "k1_line_item_k_document_id_idx" ON "k1_line_item"("k_document_id");

-- CreateIndex
CREATE INDEX "k1_line_item_box_key_idx" ON "k1_line_item"("box_key");

-- CreateIndex
CREATE INDEX "k1_line_item_is_superseded_idx" ON "k1_line_item"("is_superseded");

-- AddForeignKey
ALTER TABLE "k1_box_override" ADD CONSTRAINT "k1_box_override_box_key_fkey" FOREIGN KEY ("box_key") REFERENCES "k1_box_definition"("box_key") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "k1_box_override" ADD CONSTRAINT "k1_box_override_partnership_id_fkey" FOREIGN KEY ("partnership_id") REFERENCES "Partnership"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "k1_line_item" ADD CONSTRAINT "k1_line_item_k_document_id_fkey" FOREIGN KEY ("k_document_id") REFERENCES "KDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "k1_line_item" ADD CONSTRAINT "k1_line_item_box_key_fkey" FOREIGN KEY ("box_key") REFERENCES "k1_box_definition"("box_key") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Partial unique index: only one active (non-superseded) line item per box per document
CREATE UNIQUE INDEX "k1_line_item_active_unique"
  ON "k1_line_item" ("k_document_id", "box_key")
  WHERE "is_superseded" = false;

-- =============================================================================
-- COMMENT ON annotations for LLM / schema-discovery tooling (research.md §1)
-- =============================================================================

-- k1_box_definition
COMMENT ON TABLE "k1_box_definition" IS 'Global IRS K-1 box reference. One row per unique box identifier (e.g. "1", "9a", "20-A"). Replaces the global CellMapping rows.';
COMMENT ON COLUMN "k1_box_definition"."box_key" IS 'IRS box identifier. PK. Examples: "1", "9a", "20-A", "J_PROFIT_BEGIN".';
COMMENT ON COLUMN "k1_box_definition"."label" IS 'Human-readable label: "Ordinary business income (loss)".';
COMMENT ON COLUMN "k1_box_definition"."section" IS 'IRS form section: HEADER, PART_I, PART_II, SECTION_J, SECTION_K, SECTION_L, SECTION_M, SECTION_N, PART_III.';
COMMENT ON COLUMN "k1_box_definition"."data_type" IS 'Data type: number, string, percentage, boolean.';
COMMENT ON COLUMN "k1_box_definition"."sort_order" IS 'Display ordering matching IRS form layout.';
COMMENT ON COLUMN "k1_box_definition"."irs_form_line" IS 'IRS form reference: "Box 1", "Section J, Line 1", "Part I, Line A".';
COMMENT ON COLUMN "k1_box_definition"."description" IS 'Extended description for LLM context / tooltips.';
COMMENT ON COLUMN "k1_box_definition"."is_custom" IS 'True for auto-created box keys not in IRS standard set (FR-017).';

-- k1_box_override
COMMENT ON TABLE "k1_box_override" IS 'Per-partnership display overrides for a K1BoxDefinition. Controls custom labels, ignored status. Does NOT affect data integrity.';
COMMENT ON COLUMN "k1_box_override"."box_key" IS 'FK to k1_box_definition.box_key.';
COMMENT ON COLUMN "k1_box_override"."partnership_id" IS 'FK to Partnership.id. Scopes the override.';
COMMENT ON COLUMN "k1_box_override"."custom_label" IS 'Override display label for this partnership.';
COMMENT ON COLUMN "k1_box_override"."is_ignored" IS 'If true, hide this box for this partnership in UI.';

-- k1_line_item
COMMENT ON TABLE "k1_line_item" IS 'Individual financial line item from an IRS Schedule K-1. Fact table: one row per box per K-1 document. Authoritative source of truth for K-1 data.';
COMMENT ON COLUMN "k1_line_item"."k_document_id" IS 'FK to KDocument.id. Which K-1 document this line item belongs to.';
COMMENT ON COLUMN "k1_line_item"."box_key" IS 'FK to k1_box_definition.box_key. Which IRS box.';
COMMENT ON COLUMN "k1_line_item"."amount" IS 'Dollar amount. NULL for non-numeric values. Decimal(15,2).';
COMMENT ON COLUMN "k1_line_item"."text_value" IS 'Non-numeric values: "SEE STMT", "true", etc.';
COMMENT ON COLUMN "k1_line_item"."raw_text" IS 'Original extracted text before parsing.';
COMMENT ON COLUMN "k1_line_item"."confidence" IS 'OCR confidence 0.00-1.00. NULL if manual entry. Decimal(3,2).';
COMMENT ON COLUMN "k1_line_item"."source_page" IS 'PDF page number where value was extracted.';
COMMENT ON COLUMN "k1_line_item"."source_coords" IS 'Bounding box on PDF page: {x, y, width, height}. JSONB.';
COMMENT ON COLUMN "k1_line_item"."is_user_edited" IS 'True if user modified this value during verification.';
COMMENT ON COLUMN "k1_line_item"."is_superseded" IS 'True if replaced by a newer version (e.g. ESTIMATED->FINAL). Partial unique index enforces at most 1 active row per (k_document_id, box_key).';

-- =============================================================================
-- Seed K1BoxDefinition with IRS default entries from IRS_DEFAULT_MAPPINGS
-- =============================================================================

INSERT INTO "k1_box_definition" ("box_key", "label", "section", "data_type", "sort_order", "irs_form_line", "description", "is_custom", "created_at", "updated_at")
VALUES
  -- Header / Metadata
  ('K1_DOCUMENT_ID', 'K-1 Document ID', 'HEADER', 'string', 0, NULL, 'Large-font ID at top right of K-1 form', false, NOW(), NOW()),
  ('TAX_YEAR', 'Tax Year', 'HEADER', 'string', 1, NULL, 'Calendar year or tax year beginning/ending', false, NOW(), NOW()),
  ('FINAL_K1', 'Final K-1', 'HEADER', 'boolean', 2, NULL, 'Check if this is a final K-1', false, NOW(), NOW()),
  ('AMENDED_K1', 'Amended K-1', 'HEADER', 'boolean', 3, NULL, 'Check if this is an amended K-1', false, NOW(), NOW()),

  -- Part I — Information About the Partnership
  ('A', 'Partnership''s EIN', 'PART_I', 'string', 10, 'Part I, Line A', 'Part I, Line A — Employer identification number', false, NOW(), NOW()),
  ('B', 'Partnership''s name, address, city, state, ZIP', 'PART_I', 'string', 11, 'Part I, Line B', 'Part I, Line B', false, NOW(), NOW()),
  ('C', 'IRS center where partnership filed return', 'PART_I', 'string', 12, 'Part I, Line C', 'Part I, Line C', false, NOW(), NOW()),
  ('D', 'Publicly traded partnership (PTP)', 'PART_I', 'boolean', 13, 'Part I, Line D', 'Part I, Line D — Check if PTP', false, NOW(), NOW()),

  -- Part II — Information About the Partner
  ('E', 'Partner''s identifying number', 'PART_II', 'string', 20, 'Part II, Line E', 'Part II, Line E — SSN or TIN', false, NOW(), NOW()),
  ('F', 'Partner''s name, address, city, state, ZIP', 'PART_II', 'string', 21, 'Part II, Line F', 'Part II, Line F', false, NOW(), NOW()),
  ('G_GENERAL', 'General partner or LLC member-manager', 'PART_II', 'boolean', 22, 'Part II, Line G', 'Part II, Line G — General partner checkbox', false, NOW(), NOW()),
  ('G_LIMITED', 'Limited partner or other LLC member', 'PART_II', 'boolean', 23, 'Part II, Line G', 'Part II, Line G — Limited partner checkbox', false, NOW(), NOW()),
  ('H1_DOMESTIC', 'Domestic partner', 'PART_II', 'boolean', 24, 'Part II, Line H1', 'Part II, Line H1 — Domestic', false, NOW(), NOW()),
  ('H1_FOREIGN', 'Foreign partner', 'PART_II', 'boolean', 25, 'Part II, Line H1', 'Part II, Line H1 — Foreign', false, NOW(), NOW()),
  ('H2', 'Disregarded entity (DE)', 'PART_II', 'boolean', 26, 'Part II, Line H2', 'Part II, Line H2 — DE checkbox', false, NOW(), NOW()),
  ('H2_TIN', 'Disregarded entity TIN', 'PART_II', 'string', 27, 'Part II, Line H2', 'Part II, Line H2 — DE taxpayer ID', false, NOW(), NOW()),
  ('I1', 'Type of entity', 'PART_II', 'string', 28, 'Part II, Line I1', 'Part II, Line I1 — Entity type of partner', false, NOW(), NOW()),
  ('I2', 'Retirement plan (IRA/SEP/Keogh)', 'PART_II', 'boolean', 29, 'Part II, Line I2', 'Part II, Line I2 — Retirement plan checkbox', false, NOW(), NOW()),

  -- Section J — Partner's Share of Profit, Loss, and Capital
  ('J_PROFIT_BEGIN', 'Profit — Beginning %', 'SECTION_J', 'percentage', 30, 'Section J', 'Section J — Profit share beginning of year', false, NOW(), NOW()),
  ('J_PROFIT_END', 'Profit — Ending %', 'SECTION_J', 'percentage', 31, 'Section J', 'Section J — Profit share end of year', false, NOW(), NOW()),
  ('J_LOSS_BEGIN', 'Loss — Beginning %', 'SECTION_J', 'percentage', 32, 'Section J', 'Section J — Loss share beginning of year', false, NOW(), NOW()),
  ('J_LOSS_END', 'Loss — Ending %', 'SECTION_J', 'percentage', 33, 'Section J', 'Section J — Loss share end of year', false, NOW(), NOW()),
  ('J_CAPITAL_BEGIN', 'Capital — Beginning %', 'SECTION_J', 'percentage', 34, 'Section J', 'Section J — Capital share beginning of year', false, NOW(), NOW()),
  ('J_CAPITAL_END', 'Capital — Ending %', 'SECTION_J', 'percentage', 35, 'Section J', 'Section J — Capital share end of year', false, NOW(), NOW()),
  ('J_SALE', 'Decrease due to sale', 'SECTION_J', 'boolean', 36, 'Section J', 'Section J — Check if decrease is due to sale', false, NOW(), NOW()),
  ('J_EXCHANGE', 'Exchange of partnership interest', 'SECTION_J', 'boolean', 37, 'Section J', 'Section J — Check if exchange', false, NOW(), NOW()),

  -- Section K — Partner's Share of Liabilities
  ('K_NONRECOURSE_BEGIN', 'Nonrecourse — Beginning', 'SECTION_K', 'number', 40, 'Section K', 'Section K — Nonrecourse liabilities beginning', false, NOW(), NOW()),
  ('K_NONRECOURSE_END', 'Nonrecourse — Ending', 'SECTION_K', 'number', 41, 'Section K', 'Section K — Nonrecourse liabilities ending', false, NOW(), NOW()),
  ('K_QUAL_NONRECOURSE_BEGIN', 'Qualified nonrecourse — Beginning', 'SECTION_K', 'number', 42, 'Section K', 'Section K — Qualified nonrecourse financing beginning', false, NOW(), NOW()),
  ('K_QUAL_NONRECOURSE_END', 'Qualified nonrecourse — Ending', 'SECTION_K', 'number', 43, 'Section K', 'Section K — Qualified nonrecourse financing ending', false, NOW(), NOW()),
  ('K_RECOURSE_BEGIN', 'Recourse — Beginning', 'SECTION_K', 'number', 44, 'Section K', 'Section K — Recourse liabilities beginning', false, NOW(), NOW()),
  ('K_RECOURSE_END', 'Recourse — Ending', 'SECTION_K', 'number', 45, 'Section K', 'Section K — Recourse liabilities ending', false, NOW(), NOW()),
  ('K2', 'Includes lower-tier partnership liabilities', 'SECTION_K', 'boolean', 46, 'Section K2', 'Section K2 — Checkbox', false, NOW(), NOW()),
  ('K3', 'Liability subject to guarantees', 'SECTION_K', 'boolean', 47, 'Section K3', 'Section K3 — Checkbox', false, NOW(), NOW()),

  -- Section L — Partner's Capital Account Analysis
  ('L_BEG_CAPITAL', 'Beginning capital account', 'SECTION_L', 'number', 50, 'Section L', 'Section L — Beginning capital', false, NOW(), NOW()),
  ('L_CONTRIBUTED', 'Capital contributed during year', 'SECTION_L', 'number', 51, 'Section L', 'Section L — Capital contributed', false, NOW(), NOW()),
  ('L_CURR_YR_INCOME', 'Current year net income (loss)', 'SECTION_L', 'number', 52, 'Section L', 'Section L — Current year income/loss', false, NOW(), NOW()),
  ('L_OTHER', 'Other increase (decrease)', 'SECTION_L', 'number', 53, 'Section L', 'Section L — Other adjustments', false, NOW(), NOW()),
  ('L_WITHDRAWALS', 'Withdrawals and distributions', 'SECTION_L', 'number', 54, 'Section L', 'Section L — Withdrawals/distributions', false, NOW(), NOW()),
  ('L_END_CAPITAL', 'Ending capital account', 'SECTION_L', 'number', 55, 'Section L', 'Section L — Ending capital', false, NOW(), NOW()),

  -- Section M — Contributed Property
  ('M_YES', 'Contributed property with built-in gain/loss — Yes', 'SECTION_M', 'boolean', 60, 'Section M', 'Section M — Yes checkbox', false, NOW(), NOW()),
  ('M_NO', 'Contributed property with built-in gain/loss — No', 'SECTION_M', 'boolean', 61, 'Section M', 'Section M — No checkbox', false, NOW(), NOW()),

  -- Section N — Net Unrecognized Section 704(c)
  ('N_BEGINNING', 'Net 704(c) gain/loss — Beginning', 'SECTION_N', 'number', 62, 'Section N', 'Section N — Beginning balance', false, NOW(), NOW()),
  ('N_ENDING', 'Net 704(c) gain/loss — Ending', 'SECTION_N', 'number', 63, 'Section N', 'Section N — Ending balance', false, NOW(), NOW()),

  -- Part III — Partner's Share of Current Year Income, Deductions, Credits, etc.
  ('1', 'Ordinary business income (loss)', 'PART_III', 'number', 100, 'Box 1', 'IRS Schedule K-1 Box 1', false, NOW(), NOW()),
  ('2', 'Net rental real estate income (loss)', 'PART_III', 'number', 101, 'Box 2', 'IRS Schedule K-1 Box 2', false, NOW(), NOW()),
  ('3', 'Other net rental income (loss)', 'PART_III', 'number', 102, 'Box 3', 'IRS Schedule K-1 Box 3', false, NOW(), NOW()),
  ('4', 'Guaranteed payments for services', 'PART_III', 'number', 103, 'Box 4', 'IRS Schedule K-1 Box 4', false, NOW(), NOW()),
  ('4a', 'Guaranteed payments for capital', 'PART_III', 'number', 104, 'Box 4a', 'IRS Schedule K-1 Box 4a', false, NOW(), NOW()),
  ('4b', 'Total guaranteed payments', 'PART_III', 'number', 105, 'Box 4b', 'IRS Schedule K-1 Box 4b', false, NOW(), NOW()),
  ('5', 'Interest income', 'PART_III', 'number', 106, 'Box 5', 'IRS Schedule K-1 Box 5', false, NOW(), NOW()),
  ('6a', 'Ordinary dividends', 'PART_III', 'number', 107, 'Box 6a', 'IRS Schedule K-1 Box 6a', false, NOW(), NOW()),
  ('6b', 'Qualified dividends', 'PART_III', 'number', 108, 'Box 6b', 'IRS Schedule K-1 Box 6b', false, NOW(), NOW()),
  ('6c', 'Dividend equivalents', 'PART_III', 'number', 109, 'Box 6c', 'IRS Schedule K-1 Box 6c', false, NOW(), NOW()),
  ('7', 'Royalties', 'PART_III', 'number', 110, 'Box 7', 'IRS Schedule K-1 Box 7', false, NOW(), NOW()),
  ('8', 'Net short-term capital gain (loss)', 'PART_III', 'number', 111, 'Box 8', 'IRS Schedule K-1 Box 8', false, NOW(), NOW()),
  ('9a', 'Net long-term capital gain (loss)', 'PART_III', 'number', 112, 'Box 9a', 'IRS Schedule K-1 Box 9a', false, NOW(), NOW()),
  ('9b', 'Collectibles (28%) gain (loss)', 'PART_III', 'number', 113, 'Box 9b', 'IRS Schedule K-1 Box 9b', false, NOW(), NOW()),
  ('9c', 'Unrecaptured section 1250 gain', 'PART_III', 'number', 114, 'Box 9c', 'IRS Schedule K-1 Box 9c', false, NOW(), NOW()),
  ('10', 'Net section 1231 gain (loss)', 'PART_III', 'number', 115, 'Box 10', 'IRS Schedule K-1 Box 10', false, NOW(), NOW()),
  ('11', 'Other income (loss)', 'PART_III', 'number', 116, 'Box 11', 'IRS Schedule K-1 Box 11', false, NOW(), NOW()),
  ('12', 'Section 179 deduction', 'PART_III', 'number', 117, 'Box 12', 'IRS Schedule K-1 Box 12', false, NOW(), NOW()),
  ('13', 'Other deductions', 'PART_III', 'number', 118, 'Box 13', 'IRS Schedule K-1 Box 13', false, NOW(), NOW()),
  ('14', 'Self-employment earnings (loss)', 'PART_III', 'number', 119, 'Box 14', 'IRS Schedule K-1 Box 14', false, NOW(), NOW()),
  ('15', 'Credits', 'PART_III', 'number', 120, 'Box 15', 'IRS Schedule K-1 Box 15', false, NOW(), NOW()),
  ('16', 'Foreign transactions', 'PART_III', 'number', 121, 'Box 16', 'IRS Schedule K-1 Box 16', false, NOW(), NOW()),
  ('16_K3', 'Schedule K-3 is attached', 'PART_III', 'boolean', 122, 'Box 16', 'IRS Schedule K-1 Box 16 K-3 checkbox', false, NOW(), NOW()),
  ('17', 'Alternative minimum tax (AMT) items', 'PART_III', 'number', 123, 'Box 17', 'IRS Schedule K-1 Box 17', false, NOW(), NOW()),
  ('18', 'Tax-exempt income and nondeductible expenses', 'PART_III', 'number', 124, 'Box 18', 'IRS Schedule K-1 Box 18', false, NOW(), NOW()),
  ('19', 'Distributions', 'PART_III', 'number', 125, 'Box 19', 'IRS Schedule K-1 Box 19', false, NOW(), NOW()),
  ('19a', 'Distributions — Cash and marketable securities', 'PART_III', 'number', 126, 'Box 19a', 'IRS Schedule K-1 Box 19a', false, NOW(), NOW()),
  ('19b', 'Distributions — Other property', 'PART_III', 'number', 127, 'Box 19b', 'IRS Schedule K-1 Box 19b', false, NOW(), NOW()),
  ('20A', 'Other information — Code A', 'PART_III', 'number', 128, 'Box 20, Code A', 'IRS Schedule K-1 Box 20, Code A', false, NOW(), NOW()),
  ('20B', 'Other information — Code B', 'PART_III', 'number', 129, 'Box 20, Code B', 'IRS Schedule K-1 Box 20, Code B', false, NOW(), NOW()),
  ('20V', 'Other information — Code V', 'PART_III', 'number', 130, 'Box 20, Code V', 'IRS Schedule K-1 Box 20, Code V', false, NOW(), NOW()),
  ('20_WILDCARD', 'Other information — Other codes', 'PART_III', 'number', 131, 'Box 20', 'IRS Schedule K-1 Box 20, all other codes', false, NOW(), NOW()),
  ('21', 'Foreign taxes paid or accrued', 'PART_III', 'number', 132, 'Box 21', 'IRS Schedule K-1 Box 21', false, NOW(), NOW()),
  ('22', 'More than one activity for at-risk purposes', 'PART_III', 'boolean', 133, 'Box 22', 'IRS Schedule K-1 Box 22 — Checkbox', false, NOW(), NOW()),
  ('23', 'More than one activity for passive activity purposes', 'PART_III', 'boolean', 134, 'Box 23', 'IRS Schedule K-1 Box 23 — Checkbox', false, NOW(), NOW());
