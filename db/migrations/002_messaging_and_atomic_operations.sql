BEGIN;

CREATE TABLE idempotency_keys (
  scope text NOT NULL,
  idempotency_key text NOT NULL,
  actor_user_id uuid REFERENCES users(id),
  request_hash text NOT NULL,
  response_status integer,
  response_body jsonb,
  resource_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  PRIMARY KEY (scope, idempotency_key),
  CHECK (response_body IS NULL OR jsonb_typeof(response_body) IN ('object', 'array')),
  CHECK (expires_at > created_at)
);
CREATE INDEX idempotency_keys_expiry_idx ON idempotency_keys (expires_at);

CREATE TABLE outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  topic text NOT NULL CHECK (
    topic IN (
      'donation.created',
      'donation.classified',
      'offer.sent',
      'offer.timeout',
      'pickup.confirmed'
    )
  ),
  event_type text NOT NULL,
  aggregate_id uuid NOT NULL,
  correlation_id text NOT NULL,
  causation_id uuid,
  payload jsonb NOT NULL,
  status message_status NOT NULL DEFAULT 'pending',
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  available_at timestamptz NOT NULL DEFAULT now(),
  locked_at timestamptz,
  locked_by text,
  processed_at timestamptz,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (jsonb_typeof(payload) = 'object')
);
CREATE INDEX outbox_dispatch_idx
  ON outbox (status, available_at, created_at)
  WHERE status IN ('pending', 'failed');
CREATE INDEX outbox_correlation_idx ON outbox (correlation_id);

CREATE TABLE jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  topic text NOT NULL CHECK (
    topic IN (
      'donation.created',
      'donation.classified',
      'offer.sent',
      'offer.timeout',
      'pickup.confirmed'
    )
  ),
  event_type text NOT NULL,
  aggregate_id uuid NOT NULL,
  correlation_id text NOT NULL,
  causation_id uuid,
  payload jsonb NOT NULL,
  run_at timestamptz NOT NULL,
  status message_status NOT NULL DEFAULT 'scheduled',
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (jsonb_typeof(payload) = 'object')
);
CREATE INDEX jobs_due_idx
  ON jobs (run_at)
  WHERE status = 'scheduled';

CREATE TABLE processed_messages (
  consumer_name text NOT NULL,
  message_id uuid NOT NULL,
  correlation_id text NOT NULL,
  processed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (consumer_name, message_id)
);

CREATE TABLE dead_letter_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  original_message_id uuid NOT NULL,
  topic text NOT NULL,
  event_type text NOT NULL,
  aggregate_id uuid NOT NULL,
  correlation_id text NOT NULL,
  payload jsonb NOT NULL,
  attempts integer NOT NULL CHECK (attempts > 0),
  error text NOT NULL,
  dead_lettered_at timestamptz NOT NULL DEFAULT now(),
  replayed_at timestamptz,
  CHECK (jsonb_typeof(payload) = 'object')
);
CREATE INDEX dead_letter_topic_idx
  ON dead_letter_messages (topic, dead_lettered_at DESC)
  WHERE replayed_at IS NULL;

CREATE OR REPLACE FUNCTION donation_transition_allowed(
  p_from donation_status,
  p_to donation_status
) RETURNS boolean
LANGUAGE sql
IMMUTABLE
STRICT
AS $$
  SELECT CASE p_from
    WHEN 'posted' THEN p_to IN ('classified', 'expired')
    WHEN 'classified' THEN p_to IN ('offered', 'expired', 'no_destination')
    WHEN 'offered' THEN p_to IN ('accepted', 'expired', 'no_destination')
    WHEN 'accepted' THEN p_to = 'collected'
    WHEN 'collected' THEN p_to = 'delivered'
    ELSE false
  END;
$$;

CREATE OR REPLACE FUNCTION enforce_donation_transition()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status <> OLD.status THEN
    IF NOT donation_transition_allowed(OLD.status, NEW.status) THEN
      RAISE EXCEPTION 'invalid donation transition: % -> %', OLD.status, NEW.status
        USING ERRCODE = '23514';
    END IF;
    NEW.version := OLD.version + 1;
  ELSIF NEW.version <> OLD.version THEN
    RAISE EXCEPTION 'donation version can only change with status'
      USING ERRCODE = '23514';
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER donations_enforce_transition
BEFORE UPDATE ON donations
FOR EACH ROW
EXECUTE FUNCTION enforce_donation_transition();

CREATE OR REPLACE FUNCTION transition_donation(
  p_donation_id uuid,
  p_expected_status donation_status,
  p_next_status donation_status,
  p_event_type text,
  p_correlation_id text,
  p_payload jsonb DEFAULT '{}'::jsonb,
  p_outbox_topic text DEFAULT NULL
) RETURNS donations
LANGUAGE plpgsql
AS $$
DECLARE
  v_donation donations;
  v_event_id uuid := gen_random_uuid();
BEGIN
  IF NOT donation_transition_allowed(p_expected_status, p_next_status) THEN
    RAISE EXCEPTION 'invalid donation transition: % -> %',
      p_expected_status, p_next_status
      USING ERRCODE = '23514';
  END IF;

  UPDATE donations AS donation
  SET status = p_next_status,
      correlation_id = p_correlation_id
  WHERE donation.id = p_donation_id
    AND donation.status = p_expected_status
  RETURNING donation.* INTO v_donation;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'donation % is not in expected state %',
      p_donation_id, p_expected_status
      USING ERRCODE = '40001';
  END IF;

  INSERT INTO events (
    id,
    donation_id,
    from_status,
    to_status,
    event_type,
    correlation_id,
    payload
  ) VALUES (
    v_event_id,
    p_donation_id,
    p_expected_status,
    p_next_status,
    p_event_type,
    p_correlation_id,
    COALESCE(p_payload, '{}'::jsonb)
  );

  IF p_outbox_topic IS NOT NULL THEN
    INSERT INTO outbox (
      topic,
      event_type,
      aggregate_id,
      correlation_id,
      causation_id,
      payload
    ) VALUES (
      p_outbox_topic,
      p_event_type,
      p_donation_id,
      p_correlation_id,
      v_event_id,
      COALESCE(p_payload, '{}'::jsonb)
    );
  END IF;

  RETURN v_donation;
END;
$$;

CREATE OR REPLACE FUNCTION accept_offer(
  p_offer_id uuid,
  p_correlation_id text
) RETURNS offers
LANGUAGE plpgsql
AS $$
DECLARE
  v_offer offers;
  v_donation donations;
BEGIN
  SELECT offer.*
  INTO v_offer
  FROM offers AS offer
  WHERE offer.id = p_offer_id
  FOR UPDATE;

  IF NOT FOUND
    OR v_offer.status <> 'pending'
    OR v_offer.expires_at <= now()
  THEN
    RAISE EXCEPTION 'offer % is unavailable', p_offer_id
      USING ERRCODE = '40001';
  END IF;

  UPDATE donations AS donation
  SET status = 'accepted',
      correlation_id = p_correlation_id
  WHERE donation.id = v_offer.donation_id
    AND donation.status = 'offered'
  RETURNING donation.* INTO v_donation;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'donation % was already accepted or closed',
      v_offer.donation_id
      USING ERRCODE = '40001';
  END IF;

  UPDATE offers
  SET status = 'accepted',
      accepted_at = now(),
      correlation_id = p_correlation_id
  WHERE id = p_offer_id
  RETURNING * INTO v_offer;

  UPDATE offers
  SET status = 'cancelled'
  WHERE donation_id = v_offer.donation_id
    AND id <> p_offer_id
    AND status = 'pending';

  INSERT INTO events (
    donation_id,
    from_status,
    to_status,
    event_type,
    correlation_id,
    payload
  ) VALUES (
    v_offer.donation_id,
    'offered',
    'accepted',
    'offer.accepted',
    p_correlation_id,
    jsonb_build_object('offerId', p_offer_id, 'ngoId', v_offer.ngo_id)
  );

  RETURN v_offer;
END;
$$;

CREATE VIEW demo_users AS SELECT * FROM users;
CREATE VIEW donation_events AS SELECT * FROM events;
CREATE VIEW idempotency_records AS SELECT * FROM idempotency_keys;
CREATE VIEW outbox_messages AS SELECT * FROM outbox;
CREATE VIEW scheduled_messages AS
SELECT
  id,
  topic,
  event_type,
  aggregate_id,
  correlation_id,
  causation_id,
  payload,
  run_at AS scheduled_for,
  status,
  attempts,
  last_error,
  created_at
FROM jobs;
CREATE VIEW coupon_redemptions AS SELECT * FROM redemptions;

COMMIT;
