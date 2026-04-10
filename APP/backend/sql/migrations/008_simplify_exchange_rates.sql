
-- MIGRATION 008 — Simplify exchange_rates
--
-- The exchange rate system only needs one value: 1 USD = X Bs.
-- Drop the two-rate model (buy_rate / sell_rate) and replace it
-- with a single `rate` column.
--
-- If existing rows are present they are migrated using sell_rate as
-- the representative value (or buy_rate as fallback).  The table is
-- small (historical snapshots), so a full-table rewrite is safe.

BEGIN;

-- 1. Add new column with a safe temporary default
ALTER TABLE exchange_rates
  ADD COLUMN IF NOT EXISTS rate NUMERIC(10, 4);

-- 2. Populate `rate` from existing data (sell_rate preferred)
UPDATE exchange_rates
  SET rate = COALESCE(sell_rate, buy_rate, 6.96);

-- 3. Make the column NOT NULL now that it is filled
ALTER TABLE exchange_rates
  ALTER COLUMN rate SET NOT NULL;

-- 4. Drop obsolete columns
ALTER TABLE exchange_rates DROP COLUMN IF EXISTS buy_rate;
ALTER TABLE exchange_rates DROP COLUMN IF EXISTS sell_rate;

COMMIT;

-- Permissions remain unchanged (web_user + web_anon already granted on the table)
