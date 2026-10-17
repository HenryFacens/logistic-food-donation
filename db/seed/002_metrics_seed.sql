BEGIN;

INSERT INTO users (
  id,
  demo_key,
  role,
  display_name,
  phone
) VALUES (
  '15000000-0000-4000-8000-000000000001',
  'platform-resgata',
  'platform',
  'Equipe Resgata SIMULADO',
  '+5519999994001'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO platform_operators (
  id,
  user_id,
  name,
  active
) VALUES (
  '25000000-0000-4000-8000-000000000001',
  '15000000-0000-4000-8000-000000000001',
  'Operação Resgata SIMULADO',
  true
)
ON CONFLICT (id) DO NOTHING;

UPDATE donations
SET
  unit_value_brl = CASE category
    WHEN 'produce' THEN 4.20
    WHEN 'bakery' THEN 3.80
    WHEN 'dairy' THEN 7.40
    WHEN 'prepared' THEN 12.50
    WHEN 'pantry' THEN 6.10
    ELSE 5.00
  END,
  disposal_cost_brl = round(estimated_weight_kg * 1.35, 2)
WHERE simulated
  AND id::text LIKE '30000000-0000-4000-8000-%';

WITH ordered_pickups AS (
  SELECT
    pickup.id,
    pickup.delivered_at,
    row_number() OVER (ORDER BY pickup.id) AS sequence
  FROM pickups AS pickup
  WHERE pickup.id::text LIKE '33000000-0000-4000-8000-%'
)
UPDATE pickups AS pickup
SET delivery_due_at = CASE
  WHEN ordered_pickups.sequence % 6 = 0
    THEN ordered_pickups.delivered_at - interval '20 minutes'
  ELSE ordered_pickups.delivered_at + interval '40 minutes'
END
FROM ordered_pickups
WHERE pickup.id = ordered_pickups.id;

WITH receipt_source AS (
  SELECT
    pickup.id AS pickup_id,
    pickup.ngo_id,
    pickup.delivered_at,
    donation.estimated_weight_kg,
    row_number() OVER (ORDER BY pickup.id) AS sequence
  FROM pickups AS pickup
  JOIN donations AS donation ON donation.id = pickup.donation_id
  WHERE pickup.status = 'delivered'
    AND pickup.id::text LIKE '33000000-0000-4000-8000-%'
),
receipt_values AS (
  SELECT
    receipt_source.*,
    CASE
      WHEN sequence % 11 = 0 THEN 'rejected'::delivery_receipt_condition
      WHEN sequence % 5 = 0 THEN 'partial'::delivery_receipt_condition
      ELSE 'all_good'::delivery_receipt_condition
    END AS condition
  FROM receipt_source
)
INSERT INTO delivery_receipts (
  id,
  pickup_id,
  ngo_id,
  condition,
  received_weight_kg,
  rejected_weight_kg,
  rejection_reasons,
  photo_url,
  notes,
  idempotency_key,
  simulated,
  simulation_label,
  created_at,
  updated_at
)
SELECT
  (
    '38000000-0000-4000-8000-'
    || lpad(sequence::text, 12, '0')
  )::uuid,
  pickup_id,
  ngo_id,
  condition,
  CASE condition
    WHEN 'rejected' THEN 0
    WHEN 'partial' THEN round(estimated_weight_kg * 0.80, 2)
    ELSE estimated_weight_kg
  END,
  CASE condition
    WHEN 'rejected' THEN estimated_weight_kg
    WHEN 'partial' THEN
      estimated_weight_kg - round(estimated_weight_kg * 0.80, 2)
    ELSE 0
  END,
  CASE condition
    WHEN 'rejected' THEN ARRAY['temperatura inadequada', 'aparência comprometida']
    WHEN 'partial' THEN ARRAY['embalagem danificada']
    ELSE '{}'::text[]
  END,
  CASE
    WHEN sequence % 4 = 0
      THEN 'https://example.invalid/resgata/receipts/simulado-'
        || lpad(sequence::text, 2, '0')
        || '.jpg'
    ELSE NULL
  END,
  'Recebimento histórico SIMULADO para demonstração de métricas.',
  'seed-receipt-' || lpad(sequence::text, 4, '0'),
  true,
  'SIMULADO',
  delivered_at + interval '10 minutes',
  delivered_at + interval '10 minutes'
FROM receipt_values
WHERE sequence <> 12
ON CONFLICT (id) DO NOTHING;

WITH rating_source AS (
  SELECT
    pickup.id AS pickup_id,
    pickup.driver_id,
    pickup.delivered_at,
    seller.user_id AS seller_user_id,
    ngo.user_id AS ngo_user_id,
    row_number() OVER (ORDER BY pickup.id) AS sequence
  FROM pickups AS pickup
  JOIN donations AS donation ON donation.id = pickup.donation_id
  JOIN sellers AS seller ON seller.id = donation.seller_id
  JOIN ngos AS ngo ON ngo.id = pickup.ngo_id
  JOIN delivery_receipts AS receipt ON receipt.pickup_id = pickup.id
  WHERE pickup.status = 'delivered'
    AND pickup.driver_id IS NOT NULL
    AND pickup.id::text LIKE '33000000-0000-4000-8000-%'
),
rating_rows AS (
  SELECT
    (
      '39000000-0000-4000-8000-'
      || lpad(sequence::text, 12, '0')
    )::uuid AS id,
    pickup_id,
    driver_id,
    seller_user_id AS reviewer_user_id,
    'seller'::demo_role AS reviewer_role,
    4 + (sequence % 2) AS rating,
    ARRAY['pontualidade', 'cuidado com a carga']::text[] AS tags,
    'Avaliação do doador SIMULADO.'::text AS comment,
    delivered_at + interval '20 minutes' AS created_at
  FROM rating_source
  WHERE sequence % 3 <> 0
    AND sequence <> 1
  UNION ALL
  SELECT
    (
      '39100000-0000-4000-8000-'
      || lpad(sequence::text, 12, '0')
    )::uuid,
    pickup_id,
    driver_id,
    ngo_user_id,
    'ngo'::demo_role,
    3 + (sequence % 3),
    CASE
      WHEN sequence % 6 = 0
        THEN ARRAY['comunicação', 'atraso']::text[]
      ELSE ARRAY['comunicação', 'comprovante correto']::text[]
    END,
    'Avaliação da ONG SIMULADO.',
    delivered_at + interval '25 minutes'
  FROM rating_source
)
INSERT INTO driver_ratings (
  id,
  pickup_id,
  driver_id,
  reviewer_user_id,
  reviewer_role,
  rating,
  tags,
  comment,
  simulated,
  simulation_label,
  created_at,
  updated_at
)
SELECT
  id,
  pickup_id,
  driver_id,
  reviewer_user_id,
  reviewer_role,
  rating,
  tags,
  comment,
  true,
  'SIMULADO',
  created_at,
  created_at
FROM rating_rows
ON CONFLICT (id) DO NOTHING;

COMMIT;
