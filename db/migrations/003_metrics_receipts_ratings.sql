BEGIN;

ALTER TYPE demo_role ADD VALUE IF NOT EXISTS 'platform';

ALTER TABLE donations
  ADD COLUMN unit_value_brl numeric(12, 2)
    CHECK (unit_value_brl IS NULL OR unit_value_brl >= 0),
  ADD COLUMN disposal_cost_brl numeric(12, 2)
    CHECK (disposal_cost_brl IS NULL OR disposal_cost_brl >= 0);

ALTER TABLE pickups
  ADD COLUMN delivery_due_at timestamptz;

CREATE TABLE platform_operators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES users(id),
  name text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION enforce_platform_operator_role()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_role text;
BEGIN
  SELECT app_user.role::text
  INTO v_role
  FROM users AS app_user
  WHERE app_user.id = NEW.user_id;

  IF v_role IS NULL THEN
    RAISE EXCEPTION 'platform operator user % does not exist', NEW.user_id
      USING ERRCODE = '23503';
  END IF;

  IF v_role <> 'platform' THEN
    RAISE EXCEPTION 'platform operator user % must have platform role', NEW.user_id
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER platform_operators_enforce_role
BEFORE INSERT OR UPDATE OF user_id ON platform_operators
FOR EACH ROW
EXECUTE FUNCTION enforce_platform_operator_role();

CREATE TYPE delivery_receipt_condition AS ENUM (
  'all_good',
  'partial',
  'rejected'
);

ALTER TABLE pickups
  ADD CONSTRAINT pickups_id_ngo_unique UNIQUE (id, ngo_id),
  ADD CONSTRAINT pickups_id_driver_unique UNIQUE (id, driver_id);

CREATE TABLE delivery_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pickup_id uuid NOT NULL,
  ngo_id uuid NOT NULL,
  condition delivery_receipt_condition NOT NULL,
  received_weight_kg numeric(12, 2) NOT NULL
    CHECK (received_weight_kg >= 0),
  rejected_weight_kg numeric(12, 2) NOT NULL DEFAULT 0
    CHECK (rejected_weight_kg >= 0),
  rejection_reasons text[] NOT NULL DEFAULT '{}',
  photo_url text,
  notes text,
  idempotency_key text NOT NULL,
  simulated boolean NOT NULL DEFAULT false,
  simulation_label text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT delivery_receipts_pickup_ngo_fk
    FOREIGN KEY (pickup_id, ngo_id)
    REFERENCES pickups(id, ngo_id)
    ON DELETE CASCADE,
  CONSTRAINT delivery_receipts_pickup_ngo_unique
    UNIQUE (pickup_id, ngo_id),
  CONSTRAINT delivery_receipts_idempotency_unique
    UNIQUE (ngo_id, idempotency_key),
  CHECK (btrim(idempotency_key) <> ''),
  CHECK (received_weight_kg + rejected_weight_kg > 0),
  CHECK (
    (
      condition = 'all_good'
      AND received_weight_kg > 0
      AND rejected_weight_kg = 0
      AND cardinality(rejection_reasons) = 0
    )
    OR (
      condition = 'partial'
      AND received_weight_kg > 0
      AND rejected_weight_kg > 0
      AND cardinality(rejection_reasons) > 0
    )
    OR (
      condition = 'rejected'
      AND received_weight_kg = 0
      AND rejected_weight_kg > 0
      AND cardinality(rejection_reasons) > 0
    )
  ),
  CHECK (
    (simulated AND simulation_label = 'SIMULADO')
    OR (NOT simulated AND simulation_label IS NULL)
  )
);
CREATE INDEX delivery_receipts_ngo_created_idx
  ON delivery_receipts (ngo_id, created_at DESC);

CREATE TABLE driver_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pickup_id uuid NOT NULL,
  driver_id uuid NOT NULL REFERENCES drivers(id),
  reviewer_user_id uuid NOT NULL REFERENCES users(id),
  reviewer_role demo_role NOT NULL,
  rating smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  tags text[] NOT NULL DEFAULT '{}',
  comment text,
  simulated boolean NOT NULL DEFAULT false,
  simulation_label text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT driver_ratings_pickup_driver_fk
    FOREIGN KEY (pickup_id, driver_id)
    REFERENCES pickups(id, driver_id)
    ON DELETE CASCADE,
  CONSTRAINT driver_ratings_reviewer_pickup_unique
    UNIQUE (reviewer_user_id, pickup_id),
  CHECK (reviewer_role::text IN ('seller', 'ngo')),
  CHECK (
    (simulated AND simulation_label = 'SIMULADO')
    OR (NOT simulated AND simulation_label IS NULL)
  )
);
CREATE INDEX driver_ratings_driver_created_idx
  ON driver_ratings (driver_id, created_at DESC);

CREATE OR REPLACE FUNCTION enforce_driver_rating_context()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_driver_id uuid;
  v_seller_user_id uuid;
  v_ngo_user_id uuid;
BEGIN
  SELECT
    pickup.driver_id,
    seller.user_id,
    ngo.user_id
  INTO
    v_driver_id,
    v_seller_user_id,
    v_ngo_user_id
  FROM pickups AS pickup
  JOIN donations AS donation ON donation.id = pickup.donation_id
  JOIN sellers AS seller ON seller.id = donation.seller_id
  JOIN ngos AS ngo ON ngo.id = pickup.ngo_id
  WHERE pickup.id = NEW.pickup_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'pickup % does not exist', NEW.pickup_id
      USING ERRCODE = '23503';
  END IF;

  IF v_driver_id IS NULL OR NEW.driver_id <> v_driver_id THEN
    RAISE EXCEPTION 'rating driver does not match pickup %', NEW.pickup_id
      USING ERRCODE = '23514';
  END IF;

  IF NEW.reviewer_role::text = 'seller'
    AND NEW.reviewer_user_id <> v_seller_user_id
  THEN
    RAISE EXCEPTION 'seller reviewer does not own pickup % donation', NEW.pickup_id
      USING ERRCODE = '23514';
  END IF;

  IF NEW.reviewer_role::text = 'ngo'
    AND NEW.reviewer_user_id <> v_ngo_user_id
  THEN
    RAISE EXCEPTION 'ngo reviewer does not receive pickup %', NEW.pickup_id
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER driver_ratings_enforce_context
BEFORE INSERT OR UPDATE OF pickup_id, driver_id, reviewer_user_id, reviewer_role
ON driver_ratings
FOR EACH ROW
EXECUTE FUNCTION enforce_driver_rating_context();

CREATE OR REPLACE FUNCTION touch_metrics_record_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER delivery_receipts_touch_updated_at
BEFORE UPDATE ON delivery_receipts
FOR EACH ROW
EXECUTE FUNCTION touch_metrics_record_updated_at();

CREATE TRIGGER driver_ratings_touch_updated_at
BEFORE UPDATE ON driver_ratings
FOR EACH ROW
EXECUTE FUNCTION touch_metrics_record_updated_at();

COMMIT;
