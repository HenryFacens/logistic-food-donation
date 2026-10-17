-- Itemized donation contents ({ name, quantity, unit }) shown to drivers.
-- Idempotent so it can be applied to an existing local database.
ALTER TABLE donations
  ADD COLUMN IF NOT EXISTS items jsonb NOT NULL DEFAULT '[]'::jsonb;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'donations_items_is_array'
  ) THEN
    ALTER TABLE donations
      ADD CONSTRAINT donations_items_is_array
      CHECK (jsonb_typeof(items) = 'array');
  END IF;
END;
$$;
