-- São Paulo network for the driver trip demo ("Meu trajeto": BCG → USP).
-- Shops and NGOs sit along the Vila Olímpia → Marginal Pinheiros → Butantã
-- road, plus some far away, so ranking by detour has something to show.
-- The NGOs are inactive for matching: Campinas donations never consider
-- them, but drivers deliver to them like any other NGO.

BEGIN;

INSERT INTO users (id, demo_key, role, display_name, phone) VALUES
  ('11000000-0000-4000-8000-000000000101', 'seller-sp-padaria-funchal', 'seller', 'Padaria Funchal', '+5511999990101'),
  ('11000000-0000-4000-8000-000000000102', 'seller-sp-hortifruti-butanta', 'seller', 'Hortifruti Butantã', '+5511999990102'),
  ('11000000-0000-4000-8000-000000000103', 'seller-sp-emporio-pinheiros', 'seller', 'Empório Pinheiros', '+5511999990103'),
  ('11000000-0000-4000-8000-000000000104', 'seller-sp-atacado-mooca', 'seller', 'Atacado Mooca', '+5511999990104'),
  ('11000000-0000-4000-8000-000000000105', 'seller-sp-doceria-vila-olimpia', 'seller', 'Doceria Vila Olímpia', '+5511999990105'),
  ('12000000-0000-4000-8000-000000000101', 'ngo-sp-cozinha-butanta', 'ngo', 'Cozinha Solidária Butantã', '+5511999991101'),
  ('12000000-0000-4000-8000-000000000102', 'ngo-sp-acolhida-butanta', 'ngo', 'Casa de Acolhida Butantã', '+5511999991102'),
  ('12000000-0000-4000-8000-000000000103', 'ngo-sp-banco-santana', 'ngo', 'Banco de Alimentos Santana', '+5511999991103'),
  ('12000000-0000-4000-8000-000000000104', 'ngo-sp-instituto-rio-pequeno', 'ngo', 'Instituto Rio Pequeno', '+5511999991104')
ON CONFLICT (id) DO NOTHING;

INSERT INTO sellers (id, user_id, legal_name, document, address, location) VALUES
  ('21000000-0000-4000-8000-000000000101', '11000000-0000-4000-8000-000000000101', 'Padaria Funchal', 'SP-SELLER-101',
    '{"line1":"Rua Funchal, 500","district":"Vila Olímpia","city":"São Paulo","state":"SP","postalCode":"04551-060","location":{"latitude":-23.5949074,"longitude":-46.6907806}}',
    ST_SetSRID(ST_MakePoint(-46.6907806, -23.5949074), 4326)::geography),
  ('21000000-0000-4000-8000-000000000102', '11000000-0000-4000-8000-000000000102', 'Hortifruti Butantã', 'SP-SELLER-102',
    '{"line1":"Avenida Valdemar Ferreira, 200","district":"Butantã","city":"São Paulo","state":"SP","postalCode":"05501-000","location":{"latitude":-23.5705454,"longitude":-46.7056653}}',
    ST_SetSRID(ST_MakePoint(-46.7056653, -23.5705454), 4326)::geography),
  ('21000000-0000-4000-8000-000000000103', '11000000-0000-4000-8000-000000000103', 'Empório Pinheiros', 'SP-SELLER-103',
    '{"line1":"Rua Butantã, 300","district":"Pinheiros","city":"São Paulo","state":"SP","postalCode":"05424-140","location":{"latitude":-23.56996,"longitude":-46.6977561}}',
    ST_SetSRID(ST_MakePoint(-46.6977561, -23.56996), 4326)::geography),
  ('21000000-0000-4000-8000-000000000104', '11000000-0000-4000-8000-000000000104', 'Atacado Mooca', 'SP-SELLER-104',
    '{"line1":"Rua da Mooca, 2000","district":"Mooca","city":"São Paulo","state":"SP","postalCode":"03104-000","location":{"latitude":-23.5550244,"longitude":-46.6057905}}',
    ST_SetSRID(ST_MakePoint(-46.6057905, -23.5550244), 4326)::geography),
  ('21000000-0000-4000-8000-000000000105', '11000000-0000-4000-8000-000000000105', 'Doceria Vila Olímpia', 'SP-SELLER-105',
    '{"line1":"Rua Gomes de Carvalho, 1500","district":"Vila Olímpia","city":"São Paulo","state":"SP","postalCode":"04547-000","location":{"latitude":-23.5964665,"longitude":-46.686421}}',
    ST_SetSRID(ST_MakePoint(-46.686421, -23.5964665), 4326)::geography)
ON CONFLICT (id) DO NOTHING;

INSERT INTO ngos (
  id, user_id, name, document, address, location, capacity_kg, current_load_kg,
  service_radius_km, accepted_categories, category_needs, active
) VALUES
  ('22000000-0000-4000-8000-000000000101', '12000000-0000-4000-8000-000000000101', 'Cozinha Solidária Butantã', 'SP-NGO-101',
    '{"line1":"Avenida Vital Brasil, 300","district":"Butantã","city":"São Paulo","state":"SP","postalCode":"05503-000","location":{"latitude":-23.5715799,"longitude":-46.7072214}}',
    ST_SetSRID(ST_MakePoint(-46.7072214, -23.5715799), 4326)::geography, 400, 80, 12,
    ARRAY['produce','bakery','prepared','pantry']::donation_category[],
    '{"produce":0.9,"bakery":1.0,"prepared":0.8,"pantry":0.7}', false),
  ('22000000-0000-4000-8000-000000000102', '12000000-0000-4000-8000-000000000102', 'Casa de Acolhida Butantã', 'SP-NGO-102',
    '{"line1":"Rua Alvarenga, 2000","district":"Butantã","city":"São Paulo","state":"SP","postalCode":"05509-004","location":{"latitude":-23.5639248,"longitude":-46.711825}}',
    ST_SetSRID(ST_MakePoint(-46.711825, -23.5639248), 4326)::geography, 300, 60, 12,
    ARRAY['produce','bakery','dairy','pantry']::donation_category[],
    '{"produce":1.0,"bakery":0.8,"dairy":0.7,"pantry":0.6}', false),
  ('22000000-0000-4000-8000-000000000103', '12000000-0000-4000-8000-000000000103', 'Banco de Alimentos Santana', 'SP-NGO-103',
    '{"line1":"Rua Voluntários da Pátria, 2000","district":"Santana","city":"São Paulo","state":"SP","postalCode":"02010-700","location":{"latitude":-23.5025869,"longitude":-46.6262827}}',
    ST_SetSRID(ST_MakePoint(-46.6262827, -23.5025869), 4326)::geography, 800, 200, 15,
    ARRAY['produce','bakery','dairy','prepared','pantry']::donation_category[],
    '{"produce":1.0,"bakery":0.7,"dairy":0.6,"prepared":0.8,"pantry":1.0}', false),
  ('22000000-0000-4000-8000-000000000104', '12000000-0000-4000-8000-000000000104', 'Instituto Rio Pequeno', 'SP-NGO-104',
    '{"line1":"Avenida Corifeu de Azevedo Marques, 2000","district":"Rio Pequeno","city":"São Paulo","state":"SP","postalCode":"05582-001","location":{"latitude":-23.5736356,"longitude":-46.7325839}}',
    ST_SetSRID(ST_MakePoint(-46.7325839, -23.5736356), 4326)::geography, 250, 40, 12,
    ARRAY['produce','bakery','pantry']::donation_category[],
    '{"produce":0.8,"bakery":0.7,"pantry":1.0}', false)
ON CONFLICT (id) DO NOTHING;

-- Open deliveries for the trip demo. Deadlines are anchored to the next
-- 09:30 in São Paulo (today, or tomorrow once 09:35 has passed), the
-- departure used in the demo, so the story holds whenever it runs.
CREATE OR REPLACE FUNCTION reset_trip_demo_pickups()
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  demo_ids uuid[] := ARRAY[
    '30000000-0000-4000-8000-000000000201',
    '30000000-0000-4000-8000-000000000202',
    '30000000-0000-4000-8000-000000000203',
    '30000000-0000-4000-8000-000000000204',
    '30000000-0000-4000-8000-000000000205'
  ]::uuid[];
  local_now timestamp := now() AT TIME ZONE 'America/Sao_Paulo';
  departure timestamptz;
  created integer;
BEGIN
  departure := (date_trunc('day', local_now) + interval '9 hours 30 minutes')
    AT TIME ZONE 'America/Sao_Paulo';
  IF departure < now() - interval '5 minutes' THEN
    departure := departure + interval '1 day';
  END IF;

  DELETE FROM pickups WHERE donation_id = ANY (demo_ids);
  DELETE FROM donations WHERE id = ANY (demo_ids);

  WITH demo (
    sequence, seller_sequence, ngo_sequence, category, description,
    quantity, unit, weight_kg, pickup_by_minutes, deliver_by_minutes, items
  ) AS (
    VALUES
      -- On the way: Vila Olímpia bakery to a soup kitchen on Av. Vital Brasil.
      (201, 101, 101, 'bakery'::donation_category, 'Pães e bolos do dia', 5, 'tray'::donation_unit, 14, 60, 150,
        '[{"name":"Pães franceses","quantity":8,"unit":"kg"},{"name":"Bolos de fubá","quantity":4,"unit":"kg"},{"name":"Pães de forma","quantity":2,"unit":"kg"}]'::jsonb),
      -- On the way: Butantã greengrocer to a shelter by the USP gate.
      (202, 102, 102, 'produce'::donation_category, 'Frutas e legumes da manhã', 38, 'kg'::donation_unit, 38, 90, 180,
        '[{"name":"Bananas","quantity":12,"unit":"kg"},{"name":"Tomates","quantity":10,"unit":"kg"},{"name":"Cenouras","quantity":8,"unit":"kg"},{"name":"Laranjas","quantity":8,"unit":"kg"}]'::jsonb),
      -- A little off the way: Pinheiros (other side of the river) to Rio Pequeno.
      (203, 103, 104, 'pantry'::donation_category, 'Cestas de mercearia', 10, 'box'::donation_unit, 25, 150, 300,
        '[{"name":"Arroz","quantity":12,"unit":"kg"},{"name":"Feijão","quantity":8,"unit":"kg"},{"name":"Macarrão","quantity":5,"unit":"kg"}]'::jsonb),
      -- Wrong direction: Mooca to Santana.
      (204, 104, 103, 'produce'::donation_category, 'Hortifrúti do atacado', 80, 'kg'::donation_unit, 80, 180, 300,
        '[{"name":"Batatas","quantity":40,"unit":"kg"},{"name":"Cebolas","quantity":25,"unit":"kg"},{"name":"Abóboras","quantity":15,"unit":"kg"}]'::jsonb),
      -- Too late for a 09:30 departure: must be picked up by 09:25.
      (205, 105, 101, 'bakery'::donation_category, 'Doces e salgados da vitrine', 3, 'tray'::donation_unit, 6, -5, 60,
        '[{"name":"Salgados assados","quantity":4,"unit":"kg"},{"name":"Doces","quantity":2,"unit":"kg"}]'::jsonb)
  ),
  inserted AS (
    INSERT INTO donations (
      id, seller_id, status, category, description, quantity, unit,
      estimated_weight_kg, items, perishability_minutes, pickup_address,
      pickup_location, available_from, expires_at, classification,
      classification_confidence, correlation_id, idempotency_key, version,
      simulated, simulation_label, created_at, updated_at
    )
    SELECT
      ('30000000-0000-4000-8000-' || lpad(demo.sequence::text, 12, '0'))::uuid,
      seller.id,
      'accepted',
      demo.category,
      demo.description,
      demo.quantity,
      demo.unit,
      demo.weight_kg,
      demo.items,
      -- available_from + perishability = the NGO's delivery deadline.
      GREATEST(15, ceil(extract(epoch FROM (
        departure + demo.deliver_by_minutes * interval '1 minute' - (now() - interval '20 minutes')
      )) / 60)::integer),
      seller.address,
      seller.location,
      now() - interval '20 minutes',
      departure + demo.pickup_by_minutes * interval '1 minute',
      jsonb_build_object(
        'category', demo.category,
        'description', demo.description,
        'confidence', 0.92,
        'perishabilityMinutes', 600,
        'source', 'manual',
        'simulated', true
      ),
      0.92,
      'seed-trip-correlation-' || demo.sequence,
      'seed-trip-' || demo.sequence,
      3,
      true,
      'SIMULADO',
      now() - interval '20 minutes',
      now() - interval '5 minutes'
    FROM demo
    JOIN sellers AS seller ON seller.id = (
      '21000000-0000-4000-8000-' || lpad(demo.seller_sequence::text, 12, '0')
    )::uuid
    RETURNING id, pickup_location
  )
  INSERT INTO pickups (
    id, donation_id, ngo_id, driver_id, status, pickup_code, delivery_code,
    pickup_location, delivery_location, created_at, updated_at
  )
  SELECT
    ('33000000-0000-4000-8000-' || lpad(demo.sequence::text, 12, '0'))::uuid,
    inserted.id,
    ngo.id,
    NULL,
    'awaiting_driver',
    (410000 + demo.sequence)::text,
    (520000 + demo.sequence)::text,
    inserted.pickup_location,
    ngo.location,
    now() - interval '5 minutes' + demo.sequence * interval '1 second',
    now() - interval '5 minutes' + demo.sequence * interval '1 second'
  FROM demo
  JOIN inserted ON inserted.id = (
    '30000000-0000-4000-8000-' || lpad(demo.sequence::text, 12, '0')
  )::uuid
  JOIN ngos AS ngo ON ngo.id = (
    '22000000-0000-4000-8000-' || lpad(demo.ngo_sequence::text, 12, '0')
  )::uuid;

  GET DIAGNOSTICS created = ROW_COUNT;
  RETURN created;
END;
$$;

SELECT reset_trip_demo_pickups();

COMMIT;
