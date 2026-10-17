BEGIN;

-- NGO demand side: published needs and daily receiving window.
CREATE TYPE ngo_need_status AS ENUM ('open', 'fulfilled', 'cancelled');

ALTER TABLE ngos
  ADD COLUMN receiving_start time NOT NULL DEFAULT '08:00',
  ADD COLUMN receiving_end time NOT NULL DEFAULT '20:00',
  ADD CONSTRAINT ngos_receiving_window_check
    CHECK (receiving_end > receiving_start);

CREATE TABLE ngo_needs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ngo_id uuid NOT NULL REFERENCES ngos(id) ON DELETE CASCADE,
  category donation_category NOT NULL,
  quantity_kg numeric(10, 2) NOT NULL CHECK (quantity_kg > 0),
  remaining_kg numeric(10, 2) NOT NULL
    CHECK (remaining_kg >= 0 AND remaining_kg <= quantity_kg),
  needed_by timestamptz NOT NULL,
  notes text,
  status ngo_need_status NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ngo_needs_open_idx
  ON ngo_needs (ngo_id, category, needed_by)
  WHERE status = 'open';

-- Demo needs so matching has live demand right after a reset.
CREATE OR REPLACE FUNCTION seed_ngo_needs() RETURNS void
LANGUAGE sql
AS $$
  DELETE FROM ngo_needs;
  INSERT INTO ngo_needs (ngo_id, category, quantity_kg, remaining_kg, needed_by, notes)
  SELECT ngo.id, need.category, need.kg, need.kg,
         now() + need.horizon, need.notes
  FROM ngos AS ngo
  CROSS JOIN LATERAL (
    VALUES
      ('bakery'::donation_category, 20::numeric, interval '2 days',
       'Café da manhã das crianças atendidas (SIMULADO)'),
      ('produce'::donation_category, 40::numeric, interval '4 days',
       'Hortifruti para a cozinha comunitária (SIMULADO)')
  ) AS need(category, kg, horizon, notes)
  WHERE ngo.active AND need.category = ANY (ngo.accepted_categories);
$$;
SELECT seed_ngo_needs();

-- Photos taken by sellers; bytes live in blob storage.
CREATE TABLE photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL REFERENCES sellers(id),
  blob_name text NOT NULL UNIQUE,
  content_type text NOT NULL,
  size_bytes integer NOT NULL CHECK (size_bytes > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE donations
  ADD COLUMN photo_id uuid REFERENCES photos(id);

-- Phone sign-in: one-time codes and opaque session tokens (hashed at rest).
CREATE TABLE login_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code_hash text NOT NULL,
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX login_codes_user_idx ON login_codes (user_id, created_at DESC);

CREATE TABLE sessions (
  token_hash text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX sessions_user_idx ON sessions (user_id);

COMMIT;
