BEGIN;

-- Hackathon presentation: demo data is shown as real. The `simulated` flags
-- and `simulation_label` columns stay for internal bookkeeping; only the
-- visible "SIMULADO" wording is removed from names, descriptions, and notes.
CREATE OR REPLACE FUNCTION present_demo_as_real() RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Names and short labels: drop the marker wherever it appears.
  UPDATE users SET display_name = btrim(regexp_replace(display_name, '\s*SIMULADO\s*', ' ', 'g'))
  WHERE display_name LIKE '%SIMULADO%';
  UPDATE sellers SET legal_name = btrim(regexp_replace(legal_name, '\s*SIMULADO\s*', ' ', 'g'))
  WHERE legal_name LIKE '%SIMULADO%';
  UPDATE ngos SET name = btrim(regexp_replace(name, '\s*SIMULADO\s*', ' ', 'g'))
  WHERE name LIKE '%SIMULADO%';
  UPDATE drivers
  SET name = btrim(regexp_replace(name, '\s*SIMULADO\s*', ' ', 'g')),
      vehicle = btrim(regexp_replace(vehicle, '\s*SIMULADO\s*', ' ', 'g'))
  WHERE name LIKE '%SIMULADO%' OR vehicle LIKE '%SIMULADO%';
  UPDATE partners SET name = btrim(regexp_replace(name, '\s*SIMULADO\s*', ' ', 'g'))
  WHERE name LIKE '%SIMULADO%';
  UPDATE platform_operators SET name = btrim(regexp_replace(name, '\s*SIMULADO\s*', ' ', 'g'))
  WHERE name LIKE '%SIMULADO%';
  UPDATE freight_requests SET provider_name = 'Frete parceiro'
  WHERE provider_name LIKE '%SIMULADO%';

  -- Coupons: "Café pequeno grátis SIMULADO", "SIMULADO. Um resgate por pessoa."
  UPDATE coupons
  SET title = btrim(regexp_replace(title, '\s*SIMULADO\.?\s*', ' ', 'g')),
      terms = btrim(regexp_replace(terms, '\s*SIMULADO\.?\s*', ' ', 'g'))
  WHERE title LIKE '%SIMULADO%' OR terms LIKE '%SIMULADO%';

  -- Notes written for the demo: "Café comunitário (SIMULADO)".
  UPDATE ngo_needs SET notes = btrim(regexp_replace(notes, '\s*\(SIMULADO\)', '', 'g'))
  WHERE notes LIKE '%SIMULADO%';

  UPDATE forecast_snapshots
  SET methodology = 'Média móvel sobre o histórico de doações da loja'
  WHERE methodology LIKE '%SIMULADO%';

  UPDATE delivery_receipts
  SET notes = 'Recebimento conferido pela equipe da ONG.'
  WHERE notes LIKE '%SIMULADO%';

  UPDATE driver_ratings
  SET comment = (ARRAY[
    'Coleta pontual e cuidadosa.',
    'Motorista atencioso, chegou no horário combinado.',
    'Tudo certo com a retirada, alimentos bem acondicionados.',
    'Comunicação clara e retirada rápida.'
  ])[1 + abs(hashtext(id::text)) % 4]
  WHERE comment LIKE '%SIMULADO%';

  -- Historical donations: "SIMULADO - doação histórica 07" becomes a
  -- plausible description for its category.
  UPDATE donations AS donation
  SET description = picked.description,
      classification = CASE
        WHEN donation.classification IS NULL THEN NULL
        ELSE jsonb_set(donation.classification, '{description}', to_jsonb(picked.description))
      END
  FROM (
    SELECT id,
      (CASE category
        WHEN 'bakery' THEN ARRAY['Pães franceses do dia', 'Pães e bolos do dia', 'Bisnaguinhas e pão de forma']
        WHEN 'produce' THEN ARRAY['Frutas e verduras da feira', 'Bananas e laranjas', 'Legumes para sopa']
        WHEN 'dairy' THEN ARRAY['Iogurtes e bebidas lácteas', 'Queijos e requeijão', 'Leite integral']
        WHEN 'prepared' THEN ARRAY['Marmitas do almoço', 'Refeições prontas do dia', 'Sopas e caldos']
        WHEN 'pantry' THEN ARRAY['Arroz, feijão e macarrão', 'Enlatados e grãos', 'Cestas de mercearia']
        ELSE ARRAY['Alimentos variados', 'Excedente do dia', 'Itens de mercearia variados']
      END)[1 + abs(hashtext(id::text)) % 3] AS description
    FROM donations
    WHERE description LIKE '%SIMULADO%'
  ) AS picked
  WHERE donation.id = picked.id;

  UPDATE donations
  SET classification = jsonb_set(
        classification,
        '{description}',
        to_jsonb(btrim(regexp_replace(classification ->> 'description', '\s*(—\s*)?SIMULADO\s*', ' ', 'g')))
      )
  WHERE classification ->> 'description' LIKE '%SIMULADO%';
END;
$$;

SELECT present_demo_as_real();

COMMIT;
