BEGIN;

INSERT INTO users (id, demo_key, role, display_name, phone) VALUES
  ('11000000-0000-4000-8000-000000000001', 'seller-padaria-cambui', 'seller', 'Padaria Cambuí SIMULADO', '+5519999990001'),
  ('11000000-0000-4000-8000-000000000002', 'seller-hortifruti-centro', 'seller', 'Hortifruti Centro SIMULADO', '+5519999990002'),
  ('11000000-0000-4000-8000-000000000003', 'seller-mercado-taquaral', 'seller', 'Mercado Taquaral SIMULADO', '+5519999990003'),
  ('11000000-0000-4000-8000-000000000004', 'seller-cozinha-sousas', 'seller', 'Cozinha Sousas SIMULADO', '+5519999990004'),
  ('11000000-0000-4000-8000-000000000005', 'seller-laticinios-ouro-verde', 'seller', 'Laticínios Ouro Verde SIMULADO', '+5519999990005'),
  ('11000000-0000-4000-8000-000000000006', 'seller-atacado-campo-grande', 'seller', 'Atacado Campo Grande SIMULADO', '+5519999990006'),
  ('12000000-0000-4000-8000-000000000001', 'ngo-barra-de-alimentos', 'ngo', 'Rede Barra de Alimentos SIMULADO', '+5519999991001'),
  ('12000000-0000-4000-8000-000000000002', 'ngo-prato-solidario', 'ngo', 'Instituto Prato Solidário SIMULADO', '+5519999991002'),
  ('12000000-0000-4000-8000-000000000003', 'ngo-mesa-para-todos', 'ngo', 'Mesa para Todos SIMULADO', '+5519999991003'),
  ('12000000-0000-4000-8000-000000000004', 'ngo-casa-acolhedora', 'ngo', 'Casa Acolhedora SIMULADO', '+5519999991004'),
  ('12000000-0000-4000-8000-000000000005', 'ngo-sementes-do-amanha', 'ngo', 'Sementes do Amanhã SIMULADO', '+5519999991005'),
  ('13000000-0000-4000-8000-000000000001', 'driver-ana', 'driver', 'Ana Souza SIMULADO', '+5519999992001'),
  ('13000000-0000-4000-8000-000000000002', 'driver-bruno', 'driver', 'Bruno Lima SIMULADO', '+5519999992002'),
  ('13000000-0000-4000-8000-000000000003', 'driver-carla', 'driver', 'Carla Mendes SIMULADO', '+5519999992003'),
  ('13000000-0000-4000-8000-000000000004', 'driver-diego', 'driver', 'Diego Alves SIMULADO', '+5519999992004'),
  ('14000000-0000-4000-8000-000000000001', 'partner-cafe-local', 'partner', 'Café Local SIMULADO', '+5519999993001'),
  ('14000000-0000-4000-8000-000000000002', 'partner-bike-center', 'partner', 'Bike Center SIMULADO', '+5519999993002'),
  ('14000000-0000-4000-8000-000000000003', 'partner-cultura-campinas', 'partner', 'Cultura Campinas SIMULADO', '+5519999993003')
ON CONFLICT (id) DO NOTHING;

INSERT INTO sellers (
  id,
  user_id,
  legal_name,
  document,
  address,
  location
) VALUES
  (
    '21000000-0000-4000-8000-000000000001',
    '11000000-0000-4000-8000-000000000001',
    'Padaria Cambuí SIMULADO',
    'SIM-SELLER-001',
    '{"line1":"Rua Coronel Quirino, 900","district":"Cambuí","city":"Campinas","state":"SP","postalCode":"13025-001","location":{"latitude":-22.8974,"longitude":-47.0510}}',
    ST_SetSRID(ST_MakePoint(-47.0510, -22.8974), 4326)::geography
  ),
  (
    '21000000-0000-4000-8000-000000000002',
    '11000000-0000-4000-8000-000000000002',
    'Hortifruti Centro SIMULADO',
    'SIM-SELLER-002',
    '{"line1":"Avenida Francisco Glicério, 650","district":"Centro","city":"Campinas","state":"SP","postalCode":"13012-100","location":{"latitude":-22.9071,"longitude":-47.0612}}',
    ST_SetSRID(ST_MakePoint(-47.0612, -22.9071), 4326)::geography
  ),
  (
    '21000000-0000-4000-8000-000000000003',
    '11000000-0000-4000-8000-000000000003',
    'Mercado Taquaral SIMULADO',
    'SIM-SELLER-003',
    '{"line1":"Avenida Nossa Senhora de Fátima, 1200","district":"Taquaral","city":"Campinas","state":"SP","postalCode":"13076-000","location":{"latitude":-22.8821,"longitude":-47.0546}}',
    ST_SetSRID(ST_MakePoint(-47.0546, -22.8821), 4326)::geography
  ),
  (
    '21000000-0000-4000-8000-000000000004',
    '11000000-0000-4000-8000-000000000004',
    'Cozinha Sousas SIMULADO',
    'SIM-SELLER-004',
    '{"line1":"Rua Antônio Prado, 210","district":"Sousas","city":"Campinas","state":"SP","postalCode":"13105-022","location":{"latitude":-22.8877,"longitude":-46.9724}}',
    ST_SetSRID(ST_MakePoint(-46.9724, -22.8877), 4326)::geography
  ),
  (
    '21000000-0000-4000-8000-000000000005',
    '11000000-0000-4000-8000-000000000005',
    'Laticínios Ouro Verde SIMULADO',
    'SIM-SELLER-005',
    '{"line1":"Avenida Ruy Rodriguez, 3200","district":"Ouro Verde","city":"Campinas","state":"SP","postalCode":"13060-646","location":{"latitude":-22.9569,"longitude":-47.1283}}',
    ST_SetSRID(ST_MakePoint(-47.1283, -22.9569), 4326)::geography
  ),
  (
    '21000000-0000-4000-8000-000000000006',
    '11000000-0000-4000-8000-000000000006',
    'Atacado Campo Grande SIMULADO',
    'SIM-SELLER-006',
    '{"line1":"Avenida John Boyd Dunlop, 7600","district":"Campo Grande","city":"Campinas","state":"SP","postalCode":"13059-587","location":{"latitude":-22.9337,"longitude":-47.1686}}',
    ST_SetSRID(ST_MakePoint(-47.1686, -22.9337), 4326)::geography
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO ngos (
  id,
  user_id,
  name,
  document,
  address,
  location,
  capacity_kg,
  current_load_kg,
  service_radius_km,
  accepted_categories,
  category_needs
) VALUES
  (
    '22000000-0000-4000-8000-000000000001',
    '12000000-0000-4000-8000-000000000001',
    'Rede Barra de Alimentos SIMULADO',
    'SIM-NGO-001',
    '{"line1":"Rua Maria Tereza Dias da Silva, 410","district":"Barão Geraldo","city":"Campinas","state":"SP","postalCode":"13084-785","location":{"latitude":-22.8217,"longitude":-47.0711}}',
    ST_SetSRID(ST_MakePoint(-47.0711, -22.8217), 4326)::geography,
    500, 140, 18,
    ARRAY['produce','bakery','dairy','prepared','pantry']::donation_category[],
    '{"produce":1.0,"bakery":0.8,"dairy":0.7,"prepared":0.9,"pantry":0.6,"other":0.2}'
  ),
  (
    '22000000-0000-4000-8000-000000000002',
    '12000000-0000-4000-8000-000000000002',
    'Instituto Prato Solidário SIMULADO',
    'SIM-NGO-002',
    '{"line1":"Rua Barreto Leme, 1550","district":"Centro","city":"Campinas","state":"SP","postalCode":"13010-201","location":{"latitude":-22.9008,"longitude":-47.0606}}',
    ST_SetSRID(ST_MakePoint(-47.0606, -22.9008), 4326)::geography,
    320, 75, 14,
    ARRAY['produce','bakery','prepared','pantry']::donation_category[],
    '{"produce":0.8,"bakery":0.9,"dairy":0.2,"prepared":1.0,"pantry":0.7,"other":0.3}'
  ),
  (
    '22000000-0000-4000-8000-000000000003',
    '12000000-0000-4000-8000-000000000003',
    'Mesa para Todos SIMULADO',
    'SIM-NGO-003',
    '{"line1":"Avenida Suaçuna, 530","district":"Vila Aeroporto","city":"Campinas","state":"SP","postalCode":"13054-105","location":{"latitude":-22.9461,"longitude":-47.1134}}',
    ST_SetSRID(ST_MakePoint(-47.1134, -22.9461), 4326)::geography,
    450, 190, 20,
    ARRAY['produce','bakery','dairy','prepared','pantry','other']::donation_category[],
    '{"produce":0.9,"bakery":0.5,"dairy":1.0,"prepared":0.8,"pantry":0.8,"other":0.4}'
  ),
  (
    '22000000-0000-4000-8000-000000000004',
    '12000000-0000-4000-8000-000000000004',
    'Casa Acolhedora SIMULADO',
    'SIM-NGO-004',
    '{"line1":"Rua José Rosolem, 180","district":"Jardim Londres","city":"Campinas","state":"SP","postalCode":"13060-222","location":{"latitude":-22.9179,"longitude":-47.1012}}',
    ST_SetSRID(ST_MakePoint(-47.1012, -22.9179), 4326)::geography,
    220, 60, 12,
    ARRAY['bakery','dairy','prepared','pantry']::donation_category[],
    '{"produce":0.1,"bakery":0.8,"dairy":0.7,"prepared":1.0,"pantry":0.9,"other":0.2}'
  ),
  (
    '22000000-0000-4000-8000-000000000005',
    '12000000-0000-4000-8000-000000000005',
    'Sementes do Amanhã SIMULADO',
    'SIM-NGO-005',
    '{"line1":"Rua Maneco Rosa, 95","district":"Sousas","city":"Campinas","state":"SP","postalCode":"13106-029","location":{"latitude":-22.8896,"longitude":-46.9685}}',
    ST_SetSRID(ST_MakePoint(-46.9685, -22.8896), 4326)::geography,
    280, 50, 16,
    ARRAY['produce','bakery','dairy','pantry']::donation_category[],
    '{"produce":1.0,"bakery":0.7,"dairy":0.8,"prepared":0.2,"pantry":0.9,"other":0.3}'
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO drivers (
  id,
  user_id,
  name,
  vehicle,
  license_plate,
  capacity_kg,
  current_location,
  points
) VALUES
  ('23000000-0000-4000-8000-000000000001', '13000000-0000-4000-8000-000000000001', 'Ana Souza SIMULADO', 'Fiat Fiorino branca SIMULADO', 'SIM1A01', 350, ST_SetSRID(ST_MakePoint(-47.0620, -22.9050), 4326)::geography, 420),
  ('23000000-0000-4000-8000-000000000002', '13000000-0000-4000-8000-000000000002', 'Bruno Lima SIMULADO', 'Renault Kangoo prata SIMULADO', 'SIM2B02', 300, ST_SetSRID(ST_MakePoint(-47.0930, -22.9200), 4326)::geography, 310),
  ('23000000-0000-4000-8000-000000000003', '13000000-0000-4000-8000-000000000003', 'Carla Mendes SIMULADO', 'VW Saveiro branca SIMULADO', 'SIM3C03', 250, ST_SetSRID(ST_MakePoint(-47.0700, -22.8350), 4326)::geography, 275),
  ('23000000-0000-4000-8000-000000000004', '13000000-0000-4000-8000-000000000004', 'Diego Alves SIMULADO', 'Chevrolet Montana prata SIMULADO', 'SIM4D04', 280, ST_SetSRID(ST_MakePoint(-47.1300, -22.9500), 4326)::geography, 190)
ON CONFLICT (id) DO NOTHING;

INSERT INTO partners (id, user_id, name, description) VALUES
  ('24000000-0000-4000-8000-000000000001', '14000000-0000-4000-8000-000000000001', 'Café Local SIMULADO', 'Benefícios fictícios em cafés participantes de Campinas.'),
  ('24000000-0000-4000-8000-000000000002', '14000000-0000-4000-8000-000000000002', 'Bike Center SIMULADO', 'Benefícios fictícios para manutenção de bicicletas.'),
  ('24000000-0000-4000-8000-000000000003', '14000000-0000-4000-8000-000000000003', 'Cultura Campinas SIMULADO', 'Benefícios fictícios para experiências culturais.')
ON CONFLICT (id) DO NOTHING;

INSERT INTO coupons (
  id,
  partner_id,
  title,
  description,
  terms,
  points_cost,
  stock,
  valid_from,
  valid_until
) VALUES
  ('25000000-0000-4000-8000-000000000001', '24000000-0000-4000-8000-000000000001', 'Café pequeno grátis SIMULADO', 'Um café pequeno fictício.', 'SIMULADO. Um resgate por pessoa.', 80, 100, '2026-01-01T00:00:00-03:00', '2027-12-31T23:59:59-03:00'),
  ('25000000-0000-4000-8000-000000000002', '24000000-0000-4000-8000-000000000001', '20% no lanche SIMULADO', 'Desconto fictício em um lanche.', 'SIMULADO. Não cumulativo.', 120, 80, '2026-01-01T00:00:00-03:00', '2027-12-31T23:59:59-03:00'),
  ('25000000-0000-4000-8000-000000000003', '24000000-0000-4000-8000-000000000001', 'Combo solidário SIMULADO', 'Combo fictício de café e pão de queijo.', 'SIMULADO. Sujeito a estoque fictício.', 160, 60, '2026-01-01T00:00:00-03:00', '2027-12-31T23:59:59-03:00'),
  ('25000000-0000-4000-8000-000000000004', '24000000-0000-4000-8000-000000000002', 'Revisão básica SIMULADO', 'Revisão fictícia de bicicleta.', 'SIMULADO. Peças não incluídas.', 300, 30, '2026-01-01T00:00:00-03:00', '2027-12-31T23:59:59-03:00'),
  ('25000000-0000-4000-8000-000000000005', '24000000-0000-4000-8000-000000000002', 'Desconto em acessórios SIMULADO', 'Desconto fictício de 15%.', 'SIMULADO. Limite fictício de R$ 50.', 180, 45, '2026-01-01T00:00:00-03:00', '2027-12-31T23:59:59-03:00'),
  ('25000000-0000-4000-8000-000000000006', '24000000-0000-4000-8000-000000000003', 'Ingresso cultural SIMULADO', 'Ingresso fictício para atividade cultural.', 'SIMULADO. Agendamento obrigatório.', 220, 50, '2026-01-01T00:00:00-03:00', '2027-12-31T23:59:59-03:00'),
  ('25000000-0000-4000-8000-000000000007', '24000000-0000-4000-8000-000000000003', 'Oficina criativa SIMULADO', 'Vaga fictícia em oficina criativa.', 'SIMULADO. Uma vaga por cupom.', 260, 25, '2026-01-01T00:00:00-03:00', '2027-12-31T23:59:59-03:00'),
  ('25000000-0000-4000-8000-000000000008', '24000000-0000-4000-8000-000000000003', 'Visita guiada SIMULADO', 'Visita guiada fictícia em Campinas.', 'SIMULADO. Datas selecionadas.', 140, 70, '2026-01-01T00:00:00-03:00', '2027-12-31T23:59:59-03:00')
ON CONFLICT (id) DO NOTHING;

WITH generated AS (
  SELECT
    series AS sequence,
    (
      '30000000-0000-4000-8000-'
      || lpad(series::text, 12, '0')
    )::uuid AS donation_id,
    (
      '21000000-0000-4000-8000-'
      || lpad((((series - 1) % 6) + 1)::text, 12, '0')
    )::uuid AS seller_id,
    CASE
      WHEN series % 10 = 0 THEN 'expired'::donation_status
      WHEN series % 13 = 0 THEN 'no_destination'::donation_status
      ELSE 'delivered'::donation_status
    END AS final_status,
    CASE series % 6
      WHEN 0 THEN 'produce'::donation_category
      WHEN 1 THEN 'bakery'::donation_category
      WHEN 2 THEN 'dairy'::donation_category
      WHEN 3 THEN 'prepared'::donation_category
      WHEN 4 THEN 'pantry'::donation_category
      ELSE 'other'::donation_category
    END AS category,
    timestamptz '2026-08-20 08:00:00-03'
      + ((series - 1) * interval '18 hours') AS created_at
  FROM generate_series(1, 40) AS series
)
INSERT INTO donations (
  id,
  seller_id,
  status,
  category,
  description,
  quantity,
  unit,
  estimated_weight_kg,
  perishability_minutes,
  pickup_address,
  pickup_location,
  available_from,
  expires_at,
  classification,
  classification_confidence,
  correlation_id,
  idempotency_key,
  version,
  simulated,
  simulation_label,
  created_at,
  updated_at
)
SELECT
  generated.donation_id,
  generated.seller_id,
  generated.final_status,
  generated.category,
  'SIMULADO - doação histórica ' || lpad(generated.sequence::text, 2, '0'),
  8 + (generated.sequence % 8),
  'kg'::donation_unit,
  8 + (generated.sequence % 8),
  180 + ((generated.sequence % 5) * 60),
  seller.address,
  seller.location,
  generated.created_at,
  generated.created_at + interval '6 hours',
  jsonb_build_object(
    'category', generated.category,
    'description', 'Classificação histórica SIMULADO',
    'confidence', 0.91,
    'perishabilityMinutes', 360,
    'source', 'manual',
    'simulated', true
  ),
  0.91,
  'seed-correlation-' || lpad(generated.sequence::text, 2, '0'),
  'seed-historical-' || lpad(generated.sequence::text, 2, '0'),
  CASE generated.final_status
    WHEN 'delivered' THEN 5
    ELSE 2
  END,
  true,
  'SIMULADO',
  generated.created_at,
  generated.created_at + interval '5 hours'
FROM generated
JOIN sellers AS seller ON seller.id = generated.seller_id
ON CONFLICT (id) DO NOTHING;

WITH unavailable_freight AS (
  SELECT
    donation.id AS donation_id,
    donation.created_at,
    row_number() OVER (ORDER BY donation.id) AS sequence
  FROM donations AS donation
  WHERE donation.simulated
    AND donation.status = 'no_destination'
    AND donation.id::text LIKE '30000000-0000-4000-8000-%'
)
INSERT INTO freight_requests (
  id,
  donation_id,
  status,
  provider_name,
  quoted_amount_brl,
  created_at,
  updated_at
)
SELECT
  (
    '36000000-0000-4000-8000-'
    || lpad(unavailable_freight.sequence::text, 12, '0')
  )::uuid,
  unavailable_freight.donation_id,
  'unavailable',
  'Frete parceiro SIMULADO',
  45 + (unavailable_freight.sequence * 5),
  unavailable_freight.created_at + interval '3 hours',
  unavailable_freight.created_at + interval '3 hours 15 minutes'
FROM unavailable_freight
ON CONFLICT (id) DO NOTHING;

WITH historical AS (
  SELECT
    donation.id,
    donation.status,
    donation.correlation_id,
    donation.created_at,
    row_number() OVER (ORDER BY donation.id) AS sequence
  FROM donations AS donation
  WHERE donation.simulated
    AND donation.id::text LIKE '30000000-0000-4000-8000-%'
),
event_rows AS (
  SELECT id, status, correlation_id, created_at, sequence, 1 AS stage,
    NULL::donation_status AS from_status,
    'posted'::donation_status AS to_status,
    'donation.created'::text AS event_type
  FROM historical
  UNION ALL
  SELECT id, status, correlation_id, created_at, sequence, 2,
    'posted', 'classified', 'donation.classified'
  FROM historical
  UNION ALL
  SELECT id, status, correlation_id, created_at, sequence, 3,
    'classified', 'offered', 'offer.sent'
  FROM historical WHERE status = 'delivered'
  UNION ALL
  SELECT id, status, correlation_id, created_at, sequence, 4,
    'offered', 'accepted', 'offer.accepted'
  FROM historical WHERE status = 'delivered'
  UNION ALL
  SELECT id, status, correlation_id, created_at, sequence, 5,
    'accepted', 'collected', 'pickup.collected'
  FROM historical WHERE status = 'delivered'
  UNION ALL
  SELECT id, status, correlation_id, created_at, sequence, 6,
    'collected', 'delivered', 'pickup.delivered'
  FROM historical WHERE status = 'delivered'
  UNION ALL
  SELECT id, status, correlation_id, created_at, sequence, 7,
    'classified', 'expired', 'donation.expired'
  FROM historical WHERE status = 'expired'
  UNION ALL
  SELECT id, status, correlation_id, created_at, sequence, 8,
    'classified', 'no_destination', 'donation.no_destination'
  FROM historical WHERE status = 'no_destination'
)
INSERT INTO events (
  id,
  donation_id,
  from_status,
  to_status,
  event_type,
  correlation_id,
  payload,
  occurred_at
)
SELECT
  (
    '31000000-0000-4000-8000-'
    || lpad(((stage * 1000) + sequence)::text, 12, '0')
  )::uuid,
  id,
  from_status,
  to_status,
  event_type,
  correlation_id,
  jsonb_build_object('simulated', true, 'simulationLabel', 'SIMULADO'),
  created_at + ((stage - 1) * interval '1 hour')
FROM event_rows
ON CONFLICT (id) DO NOTHING;

WITH eligible_history AS (
  SELECT
    donation.id AS donation_id,
    donation.correlation_id,
    donation.created_at,
    row_number() OVER (ORDER BY donation.id) AS sequence,
    (((row_number() OVER (ORDER BY donation.id) - 1) % 5) + 1) AS ngo_sequence
  FROM donations AS donation
  WHERE donation.simulated
    AND donation.status IN ('delivered', 'no_destination')
    AND donation.id::text LIKE '30000000-0000-4000-8000-%'
)
INSERT INTO matching_runs (
  id,
  donation_id,
  fallback_stage,
  selected_ngo_id,
  correlation_id,
  created_at
)
SELECT
  (
    '34000000-0000-4000-8000-'
    || lpad(sequence::text, 12, '0')
  )::uuid,
  donation_id,
  CASE
    WHEN donation.status = 'no_destination'
      THEN 'no_destination'::matching_fallback_stage
    ELSE 'ngo'::matching_fallback_stage
  END,
  CASE
    WHEN donation.status = 'delivered' THEN (
      '22000000-0000-4000-8000-'
      || lpad(ngo_sequence::text, 12, '0')
    )::uuid
    ELSE NULL
  END,
  eligible_history.correlation_id,
  eligible_history.created_at + interval '2 hours'
FROM eligible_history
JOIN donations AS donation ON donation.id = eligible_history.donation_id
ON CONFLICT (id) DO NOTHING;

INSERT INTO matching_candidates (
  matching_run_id,
  ngo_id,
  rank,
  eligible,
  score,
  score_breakdown,
  rejection_reasons
)
SELECT
  matching_run.id,
  matching_run.selected_ngo_id,
  1,
  true,
  82.00,
  '{
    "total":82,
    "eligible":true,
    "rejectionReasons":[],
    "components":{
      "distance":{"raw":5,"normalized":0.75,"weight":0.35,"contribution":26.25},
      "capacity":{"raw":40,"normalized":1,"weight":0.25,"contribution":25},
      "perishability":{"raw":30,"normalized":0.75,"weight":0.25,"contribution":18.75},
      "categoryNeed":{"raw":0.8,"normalized":0.8,"weight":0.15,"contribution":12}
    }
  }'::jsonb,
  '{}'
FROM matching_runs AS matching_run
WHERE matching_run.selected_ngo_id IS NOT NULL
  AND matching_run.id::text LIKE '34000000-0000-4000-8000-%'
ON CONFLICT (matching_run_id, ngo_id) DO NOTHING;

WITH delivered AS (
  SELECT
    donation.id AS donation_id,
    donation.correlation_id,
    donation.created_at,
    row_number() OVER (ORDER BY donation.id) AS sequence,
    (((row_number() OVER (ORDER BY donation.id) - 1) % 5) + 1) AS ngo_sequence,
    (((row_number() OVER (ORDER BY donation.id) - 1) % 4) + 1) AS driver_sequence
  FROM donations AS donation
  WHERE donation.simulated
    AND donation.status = 'delivered'
    AND donation.id::text LIKE '30000000-0000-4000-8000-%'
)
INSERT INTO offers (
  id,
  donation_id,
  ngo_id,
  matching_run_id,
  rank,
  status,
  score,
  score_breakdown,
  expires_at,
  accepted_at,
  correlation_id,
  created_at
)
SELECT
  (
    '32000000-0000-4000-8000-'
    || lpad(delivered.sequence::text, 12, '0')
  )::uuid,
  delivered.donation_id,
  (
    '22000000-0000-4000-8000-'
    || lpad(delivered.ngo_sequence::text, 12, '0')
  )::uuid,
  matching_run.id,
  1,
  'accepted',
  82.00,
  '{
    "total":82,
    "eligible":true,
    "rejectionReasons":[],
    "components":{
      "distance":{"raw":5,"normalized":0.75,"weight":0.35,"contribution":26.25},
      "capacity":{"raw":40,"normalized":1,"weight":0.25,"contribution":25},
      "perishability":{"raw":30,"normalized":0.75,"weight":0.25,"contribution":18.75},
      "categoryNeed":{"raw":0.8,"normalized":0.8,"weight":0.15,"contribution":12}
    }
  }'::jsonb,
  delivered.created_at + interval '2 hours 30 minutes',
  delivered.created_at + interval '2 hours 10 minutes',
  delivered.correlation_id,
  delivered.created_at + interval '2 hours'
FROM delivered
JOIN matching_runs AS matching_run
  ON matching_run.donation_id = delivered.donation_id
ON CONFLICT (id) DO NOTHING;

WITH delivered AS (
  SELECT
    donation.id AS donation_id,
    donation.pickup_location,
    donation.created_at,
    row_number() OVER (ORDER BY donation.id) AS sequence,
    (((row_number() OVER (ORDER BY donation.id) - 1) % 5) + 1) AS ngo_sequence,
    (((row_number() OVER (ORDER BY donation.id) - 1) % 4) + 1) AS driver_sequence
  FROM donations AS donation
  WHERE donation.simulated
    AND donation.status = 'delivered'
    AND donation.id::text LIKE '30000000-0000-4000-8000-%'
)
INSERT INTO pickups (
  id,
  donation_id,
  ngo_id,
  driver_id,
  status,
  pickup_code,
  delivery_code,
  pickup_location,
  delivery_location,
  assigned_at,
  collected_at,
  delivered_at,
  created_at,
  updated_at
)
SELECT
  (
    '33000000-0000-4000-8000-'
    || lpad(sequence::text, 12, '0')
  )::uuid,
  delivered.donation_id,
  ngo.id,
  driver.id,
  'delivered',
  lpad((100000 + sequence)::text, 6, '0'),
  lpad((200000 + sequence)::text, 6, '0'),
  delivered.pickup_location,
  ngo.location,
  delivered.created_at + interval '3 hours',
  delivered.created_at + interval '4 hours',
  delivered.created_at + interval '5 hours',
  delivered.created_at + interval '2 hours 15 minutes',
  delivered.created_at + interval '5 hours'
FROM delivered
JOIN ngos AS ngo ON ngo.id = (
  '22000000-0000-4000-8000-'
  || lpad(delivered.ngo_sequence::text, 12, '0')
)::uuid
JOIN drivers AS driver ON driver.id = (
  '23000000-0000-4000-8000-'
  || lpad(delivered.driver_sequence::text, 12, '0')
)::uuid
ON CONFLICT (id) DO NOTHING;

WITH sponsored AS (
  SELECT
    donation.id AS donation_id,
    donation.created_at,
    row_number() OVER (ORDER BY donation.id) AS sequence,
    (((row_number() OVER (ORDER BY donation.id) - 1) % 3) + 1) AS partner_sequence
  FROM donations AS donation
  WHERE donation.simulated
    AND donation.status = 'delivered'
    AND donation.id::text LIKE '30000000-0000-4000-8000-%'
)
INSERT INTO partner_sponsorships (
  id,
  partner_id,
  donation_id,
  estimated_cost_brl,
  estimated_reach_people,
  created_at
)
SELECT
  (
    '37000000-0000-4000-8000-'
    || lpad(sequence::text, 12, '0')
  )::uuid,
  (
    '24000000-0000-4000-8000-'
    || lpad(partner_sequence::text, 12, '0')
  )::uuid,
  donation_id,
  18 + (sequence % 7),
  20 + (sequence % 15),
  created_at + interval '5 hours'
FROM sponsored
ON CONFLICT (id) DO NOTHING;

INSERT INTO forecast_snapshots (
  id,
  seller_id,
  generated_at,
  horizon_days,
  expected_donations,
  expected_weight_kg,
  methodology
)
SELECT
  (
    '35000000-0000-4000-8000-'
    || lpad(sequence::text, 12, '0')
  )::uuid,
  (
    '21000000-0000-4000-8000-'
    || lpad(sequence::text, 12, '0')
  )::uuid,
  '2026-10-01T09:00:00-03:00'::timestamptz,
  30,
  12 + sequence,
  180 + (sequence * 25),
  'SIMULADO - média móvel determinística sobre o histórico fictício'
FROM generate_series(1, 6) AS sequence
ON CONFLICT (id) DO NOTHING;

COMMIT;
