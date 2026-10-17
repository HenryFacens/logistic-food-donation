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
  -- What exactly the NGO needs, in its own words and unit.
  item text NOT NULL CHECK (length(trim(item)) > 0),
  quantity numeric(10, 2) NOT NULL CHECK (quantity > 0),
  unit donation_unit NOT NULL,
  remaining_quantity numeric(10, 2) NOT NULL
    CHECK (remaining_quantity >= 0 AND remaining_quantity <= quantity),
  needed_by timestamptz NOT NULL,
  notes text,
  status ngo_need_status NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ngo_needs_open_idx
  ON ngo_needs (ngo_id, category, needed_by)
  WHERE status = 'open';

-- Demo needs so matching has live, item-level demand right after a reset.
-- Each NGO asks for different items so request matching visibly matters.
CREATE OR REPLACE FUNCTION seed_ngo_needs() RETURNS void
LANGUAGE sql
AS $$
  DELETE FROM ngo_needs;
  INSERT INTO ngo_needs (
    ngo_id, category, item, quantity, unit, remaining_quantity, needed_by, notes
  )
  SELECT need.ngo_id, need.category, need.item, need.quantity, need.unit,
         need.quantity, now() + need.horizon, need.notes
  FROM (
    VALUES
      ('22000000-0000-4000-8000-000000000002'::uuid, 'bakery'::donation_category,
       'Pão francês', 60::numeric, 'unit'::donation_unit, interval '2 days',
       'Café da manhã de 30 crianças (SIMULADO)'),
      ('22000000-0000-4000-8000-000000000002'::uuid, 'produce'::donation_category,
       'Legumes para sopa (cenoura, batata, abóbora)', 30::numeric, 'kg'::donation_unit,
       interval '4 days', 'Sopa comunitária (SIMULADO)'),
      ('22000000-0000-4000-8000-000000000004'::uuid, 'bakery'::donation_category,
       'Pão de forma', 15::numeric, 'unit'::donation_unit, interval '3 days',
       'Lanche do abrigo (SIMULADO)'),
      ('22000000-0000-4000-8000-000000000004'::uuid, 'dairy'::donation_category,
       'Iogurte', 40::numeric, 'unit'::donation_unit, interval '2 days',
       'Sobremesa dos idosos (SIMULADO)'),
      ('22000000-0000-4000-8000-000000000003'::uuid, 'bakery'::donation_category,
       'Bolo ou doces para festa', 6::numeric, 'kg'::donation_unit, interval '3 days',
       'Festa de aniversariantes do mês (SIMULADO)'),
      ('22000000-0000-4000-8000-000000000003'::uuid, 'produce'::donation_category,
       'Banana', 25::numeric, 'kg'::donation_unit, interval '4 days',
       'Lanche escolar (SIMULADO)'),
      ('22000000-0000-4000-8000-000000000001'::uuid, 'pantry'::donation_category,
       'Arroz e feijão', 50::numeric, 'kg'::donation_unit, interval '7 days',
       'Cestas básicas (SIMULADO)'),
      ('22000000-0000-4000-8000-000000000001'::uuid, 'bakery'::donation_category,
       'Pão francês', 40::numeric, 'unit'::donation_unit, interval '2 days',
       'Café comunitário (SIMULADO)'),
      ('22000000-0000-4000-8000-000000000005'::uuid, 'dairy'::donation_category,
       'Leite integral', 40::numeric, 'unit'::donation_unit, interval '3 days',
       'Litros para o lanche da creche (SIMULADO)'),
      ('22000000-0000-4000-8000-000000000005'::uuid, 'produce'::donation_category,
       'Frutas para lanche (maçã, banana, laranja)', 15::numeric, 'kg'::donation_unit,
       interval '3 days', 'Lanche da creche (SIMULADO)')
  ) AS need(ngo_id, category, item, quantity, unit, horizon, notes)
  JOIN ngos AS ngo ON ngo.id = need.ngo_id AND ngo.active;
$$;
SELECT seed_ngo_needs();

-- Demo hours: most NGOs receive around the clock so live demos work at any
-- time; Casa Acolhedora keeps business hours to show the receiving-window rule.
CREATE OR REPLACE FUNCTION seed_ngo_receiving_hours() RETURNS void
LANGUAGE sql
AS $$
  UPDATE ngos SET receiving_start = '00:00', receiving_end = '23:59';
  UPDATE ngos SET receiving_start = '08:00', receiving_end = '18:00'
  WHERE id = '22000000-0000-4000-8000-000000000004';
$$;
SELECT seed_ngo_receiving_hours();

-- Publishing a need adds its category; resets restore the seeded lists.
CREATE OR REPLACE FUNCTION seed_ngo_categories() RETURNS void
LANGUAGE sql
AS $$
  UPDATE ngos AS ngo
  SET accepted_categories = seed.categories::donation_category[]
  FROM (
    VALUES
      ('22000000-0000-4000-8000-000000000001'::uuid, '{produce,bakery,dairy,prepared,pantry}'),
      ('22000000-0000-4000-8000-000000000002'::uuid, '{produce,bakery,prepared,pantry}'),
      ('22000000-0000-4000-8000-000000000003'::uuid, '{produce,bakery,dairy,prepared,pantry,other}'),
      ('22000000-0000-4000-8000-000000000004'::uuid, '{bakery,dairy,prepared,pantry}'),
      ('22000000-0000-4000-8000-000000000005'::uuid, '{produce,bakery,dairy,pantry}')
  ) AS seed(id, categories)
  WHERE ngo.id = seed.id;
$$;


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
