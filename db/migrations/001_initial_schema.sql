BEGIN;

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE demo_role AS ENUM ('seller', 'ngo', 'driver', 'partner');
CREATE TYPE donation_category AS ENUM (
  'produce',
  'bakery',
  'dairy',
  'prepared',
  'pantry',
  'other'
);
CREATE TYPE donation_status AS ENUM (
  'posted',
  'classified',
  'offered',
  'accepted',
  'collected',
  'delivered',
  'expired',
  'no_destination'
);
CREATE TYPE donation_unit AS ENUM ('kg', 'unit', 'box', 'tray');
CREATE TYPE offer_status AS ENUM (
  'pending',
  'accepted',
  'declined',
  'timed_out',
  'cancelled'
);
CREATE TYPE pickup_status AS ENUM (
  'awaiting_driver',
  'assigned',
  'en_route_pickup',
  'collected',
  'en_route_delivery',
  'delivered',
  'cancelled'
);
CREATE TYPE coupon_redemption_status AS ENUM ('issued', 'used', 'cancelled');
CREATE TYPE message_status AS ENUM (
  'pending',
  'scheduled',
  'processing',
  'processed',
  'failed',
  'dead_letter'
);
CREATE TYPE matching_fallback_stage AS ENUM (
  'ngo',
  'paid_freight',
  'no_destination'
);
CREATE TYPE freight_request_status AS ENUM (
  'requested',
  'quoted',
  'unavailable',
  'cancelled'
);

CREATE TABLE users (
  id uuid PRIMARY KEY,
  demo_key text NOT NULL UNIQUE,
  role demo_role NOT NULL,
  display_name text NOT NULL,
  phone text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE sellers (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE REFERENCES users(id),
  legal_name text NOT NULL,
  document text NOT NULL UNIQUE,
  address jsonb NOT NULL,
  location geography(Point, 4326) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (jsonb_typeof(address) = 'object')
);
CREATE INDEX sellers_location_gix ON sellers USING gist (location);

CREATE TABLE ngos (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE REFERENCES users(id),
  name text NOT NULL,
  document text NOT NULL UNIQUE,
  address jsonb NOT NULL,
  location geography(Point, 4326) NOT NULL,
  capacity_kg numeric(10, 2) NOT NULL CHECK (capacity_kg > 0),
  current_load_kg numeric(10, 2) NOT NULL DEFAULT 0
    CHECK (current_load_kg >= 0 AND current_load_kg <= capacity_kg),
  service_radius_km numeric(8, 2) NOT NULL CHECK (service_radius_km > 0),
  accepted_categories donation_category[] NOT NULL,
  category_needs jsonb NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (cardinality(accepted_categories) > 0),
  CHECK (jsonb_typeof(address) = 'object'),
  CHECK (jsonb_typeof(category_needs) = 'object')
);
CREATE INDEX ngos_location_gix ON ngos USING gist (location);
CREATE INDEX ngos_active_idx ON ngos (active) WHERE active;

CREATE TABLE drivers (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE REFERENCES users(id),
  name text NOT NULL,
  vehicle text NOT NULL,
  license_plate text NOT NULL UNIQUE,
  capacity_kg numeric(10, 2) NOT NULL CHECK (capacity_kg > 0),
  current_location geography(Point, 4326) NOT NULL,
  active boolean NOT NULL DEFAULT true,
  points integer NOT NULL DEFAULT 0 CHECK (points >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX drivers_location_gix ON drivers USING gist (current_location);

CREATE TABLE partners (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE REFERENCES users(id),
  name text NOT NULL,
  description text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE donations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL REFERENCES sellers(id),
  status donation_status NOT NULL DEFAULT 'posted',
  category donation_category,
  description text NOT NULL,
  quantity numeric(12, 2) NOT NULL CHECK (quantity > 0),
  unit donation_unit NOT NULL,
  estimated_weight_kg numeric(12, 2) NOT NULL CHECK (estimated_weight_kg > 0),
  perishability_minutes integer NOT NULL
    CHECK (perishability_minutes BETWEEN 15 AND 10080),
  pickup_address jsonb NOT NULL,
  pickup_location geography(Point, 4326) NOT NULL,
  available_from timestamptz NOT NULL,
  expires_at timestamptz NOT NULL,
  image_url text,
  classification jsonb,
  classification_confidence numeric(5, 4)
    CHECK (
      classification_confidence IS NULL
      OR classification_confidence BETWEEN 0 AND 1
    ),
  correlation_id text NOT NULL,
  idempotency_key text NOT NULL,
  version integer NOT NULL DEFAULT 0 CHECK (version >= 0),
  simulated boolean NOT NULL DEFAULT false,
  simulation_label text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (seller_id, idempotency_key),
  CHECK (expires_at > available_from),
  CHECK (jsonb_typeof(pickup_address) = 'object'),
  CHECK (classification IS NULL OR jsonb_typeof(classification) = 'object'),
  CHECK (
    (simulated AND simulation_label = 'SIMULADO')
    OR (NOT simulated AND simulation_label IS NULL)
  )
);
CREATE INDEX donations_seller_created_idx
  ON donations (seller_id, created_at DESC);
CREATE INDEX donations_status_idx ON donations (status, created_at);
CREATE INDEX donations_pickup_location_gix
  ON donations USING gist (pickup_location);

CREATE TABLE events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  donation_id uuid NOT NULL REFERENCES donations(id) ON DELETE CASCADE,
  from_status donation_status,
  to_status donation_status NOT NULL,
  event_type text NOT NULL,
  correlation_id text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  CHECK (jsonb_typeof(payload) = 'object')
);
CREATE INDEX events_stream_idx
  ON events (donation_id, occurred_at, id);
CREATE INDEX events_correlation_idx
  ON events (correlation_id);

CREATE TABLE matching_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  donation_id uuid NOT NULL REFERENCES donations(id) ON DELETE CASCADE,
  fallback_stage matching_fallback_stage NOT NULL DEFAULT 'ngo',
  selected_ngo_id uuid REFERENCES ngos(id),
  correlation_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX matching_runs_donation_idx
  ON matching_runs (donation_id, created_at DESC);

CREATE TABLE matching_candidates (
  matching_run_id uuid NOT NULL
    REFERENCES matching_runs(id) ON DELETE CASCADE,
  ngo_id uuid NOT NULL REFERENCES ngos(id),
  rank integer NOT NULL CHECK (rank > 0),
  eligible boolean NOT NULL,
  score numeric(6, 2) NOT NULL CHECK (score BETWEEN 0 AND 100),
  score_breakdown jsonb NOT NULL,
  rejection_reasons text[] NOT NULL DEFAULT '{}',
  PRIMARY KEY (matching_run_id, ngo_id),
  UNIQUE (matching_run_id, rank),
  CHECK (jsonb_typeof(score_breakdown) = 'object')
);

CREATE TABLE offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  donation_id uuid NOT NULL REFERENCES donations(id) ON DELETE CASCADE,
  ngo_id uuid NOT NULL REFERENCES ngos(id),
  matching_run_id uuid REFERENCES matching_runs(id),
  rank integer NOT NULL CHECK (rank > 0),
  status offer_status NOT NULL DEFAULT 'pending',
  score numeric(6, 2) NOT NULL CHECK (score BETWEEN 0 AND 100),
  score_breakdown jsonb NOT NULL,
  expires_at timestamptz NOT NULL,
  accepted_at timestamptz,
  correlation_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (donation_id, ngo_id),
  CHECK (jsonb_typeof(score_breakdown) = 'object'),
  CHECK (
    (status = 'accepted' AND accepted_at IS NOT NULL)
    OR (status <> 'accepted' AND accepted_at IS NULL)
  )
);
CREATE UNIQUE INDEX offers_one_pending_per_donation_idx
  ON offers (donation_id) WHERE status = 'pending';
CREATE UNIQUE INDEX offers_one_accepted_per_donation_idx
  ON offers (donation_id) WHERE status = 'accepted';
CREATE INDEX offers_ngo_status_idx
  ON offers (ngo_id, status, created_at DESC);

CREATE TABLE freight_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  donation_id uuid NOT NULL UNIQUE REFERENCES donations(id) ON DELETE CASCADE,
  status freight_request_status NOT NULL DEFAULT 'requested',
  provider_name text NOT NULL,
  quoted_amount_brl numeric(10, 2) CHECK (quoted_amount_brl >= 0),
  simulated boolean NOT NULL DEFAULT true,
  simulation_label text NOT NULL DEFAULT 'SIMULADO',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (NOT simulated OR simulation_label = 'SIMULADO')
);

CREATE TABLE pickups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  donation_id uuid NOT NULL UNIQUE REFERENCES donations(id),
  ngo_id uuid NOT NULL REFERENCES ngos(id),
  driver_id uuid REFERENCES drivers(id),
  status pickup_status NOT NULL DEFAULT 'awaiting_driver',
  pickup_code char(6) NOT NULL,
  delivery_code char(6) NOT NULL,
  pickup_location geography(Point, 4326) NOT NULL,
  delivery_location geography(Point, 4326) NOT NULL,
  assigned_at timestamptz,
  collected_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (pickup_code ~ '^[0-9]{6}$'),
  CHECK (delivery_code ~ '^[0-9]{6}$')
);
CREATE INDEX pickups_driver_status_idx
  ON pickups (driver_id, status, created_at DESC);
CREATE INDEX pickups_ngo_status_idx
  ON pickups (ngo_id, status, created_at DESC);

CREATE TABLE notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id),
  channel text NOT NULL CHECK (channel IN ('whatsapp', 'sms', 'in_app')),
  recipient text NOT NULL,
  template text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status message_status NOT NULL DEFAULT 'pending',
  correlation_id text NOT NULL,
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  sent_at timestamptz,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (jsonb_typeof(payload) = 'object')
);
CREATE INDEX notifications_dispatch_idx
  ON notifications (status, created_at)
  WHERE status IN ('pending', 'failed');

CREATE TABLE coupons (
  id uuid PRIMARY KEY,
  partner_id uuid NOT NULL REFERENCES partners(id),
  title text NOT NULL,
  description text NOT NULL,
  terms text NOT NULL,
  points_cost integer NOT NULL CHECK (points_cost >= 0),
  stock integer NOT NULL CHECK (stock >= 0),
  valid_from timestamptz NOT NULL,
  valid_until timestamptz NOT NULL,
  active boolean NOT NULL DEFAULT true,
  simulated boolean NOT NULL DEFAULT true,
  simulation_label text NOT NULL DEFAULT 'SIMULADO',
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (valid_until > valid_from),
  CHECK (NOT simulated OR simulation_label = 'SIMULADO')
);

CREATE TABLE redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id uuid NOT NULL REFERENCES coupons(id),
  driver_id uuid NOT NULL REFERENCES drivers(id),
  idempotency_key text NOT NULL,
  redemption_code text NOT NULL UNIQUE,
  status coupon_redemption_status NOT NULL DEFAULT 'issued',
  issued_at timestamptz NOT NULL DEFAULT now(),
  used_at timestamptz,
  simulated boolean NOT NULL DEFAULT true,
  simulation_label text NOT NULL DEFAULT 'SIMULADO',
  UNIQUE (driver_id, idempotency_key),
  CHECK (
    (status = 'used' AND used_at IS NOT NULL)
    OR (status <> 'used' AND used_at IS NULL)
  ),
  CHECK (NOT simulated OR simulation_label = 'SIMULADO')
);

CREATE TABLE partner_sponsorships (
  id uuid PRIMARY KEY,
  partner_id uuid NOT NULL REFERENCES partners(id),
  donation_id uuid NOT NULL REFERENCES donations(id),
  estimated_cost_brl numeric(10, 2) NOT NULL CHECK (estimated_cost_brl >= 0),
  estimated_reach_people integer NOT NULL CHECK (estimated_reach_people >= 0),
  simulated boolean NOT NULL DEFAULT true,
  simulation_label text NOT NULL DEFAULT 'SIMULADO',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (partner_id, donation_id),
  CHECK (NOT simulated OR simulation_label = 'SIMULADO')
);
CREATE INDEX partner_sponsorships_partner_idx
  ON partner_sponsorships (partner_id, created_at DESC);

CREATE TABLE forecast_snapshots (
  id uuid PRIMARY KEY,
  seller_id uuid REFERENCES sellers(id),
  generated_at timestamptz NOT NULL,
  horizon_days integer NOT NULL CHECK (horizon_days > 0),
  expected_donations numeric(12, 2) NOT NULL CHECK (expected_donations >= 0),
  expected_weight_kg numeric(12, 2) NOT NULL CHECK (expected_weight_kg >= 0),
  methodology text NOT NULL,
  simulated boolean NOT NULL DEFAULT true,
  simulation_label text NOT NULL DEFAULT 'SIMULADO',
  CHECK (NOT simulated OR simulation_label = 'SIMULADO')
);

COMMIT;
