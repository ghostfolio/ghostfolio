-- Materialized View: K-1 Summary by Partnership/Year
-- Aggregates K1LineItem amounts grouped by partnership, tax year, and box key.
-- Used for efficient dashboard queries. Refreshed via CONCURRENTLY after K-1 changes.

CREATE MATERIALIZED VIEW mv_k1_partnership_year_summary AS
SELECT
    kd."partnershipId" AS partnership_id,
    kd."taxYear" AS tax_year,
    li.box_key,
    bd.label,
    bd.section,
    SUM(li.amount) AS total_amount,
    COUNT(*) AS line_count
FROM k1_line_item li
JOIN "KDocument" kd ON li.k_document_id = kd.id
JOIN k1_box_definition bd ON li.box_key = bd.box_key
WHERE li.is_superseded = false
GROUP BY kd."partnershipId", kd."taxYear", li.box_key, bd.label, bd.section
WITH NO DATA;

-- Required for REFRESH MATERIALIZED VIEW CONCURRENTLY
CREATE UNIQUE INDEX idx_mv_k1_pys_unique
  ON mv_k1_partnership_year_summary (partnership_id, tax_year, box_key);

-- Initial population
REFRESH MATERIALIZED VIEW mv_k1_partnership_year_summary;
