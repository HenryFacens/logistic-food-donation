# Hackathon demo script

Goal: show, with posts created live on stage, that matching reacts to real
inputs (location, category, NGO needs, capacity, decisions) and explains every
choice.

## Before going on stage

1. Stack running (`make lite` or `docker compose up -d`) with `ANTHROPIC_API_KEY`
   in `.env`, and `OFFER_TIMEOUT_SECONDS=600` so offers wait for the NGO.
2. Reset the data (restores NGO needs, capacity, and demo hours):

   ```bash
   curl -X POST http://localhost:8080/api/dev/reset \
     -H 'X-Demo-User: platform-resgata' -H "Idempotency-Key: reset-$(date +%s)"
   ```

3. Open two windows: one for the donor (**Doador — Padaria Cambuí**), one for
   the NGO (**ONG — Operação**, Prato Solidário). Use the demo profiles on
   `/entrar`; phone sign-in is optional and not needed for the demo. The reset
   above requires the platform profile (`platform-resgata`).
4. Have real food ready to photograph (bread works best for the story).

Demo NGO hours: every NGO receives around the clock except **Casa Acolhedora
(08:00–18:00)**, which shows the receiving-window rule outside those hours.

Seeded requests (restored by every reset):

| NGO | Requests |
|---|---|
| Prato Solidário (1.4 km from the bakery) | 60 French rolls; 30 kg soup vegetables |
| Casa Acolhedora (08:00–18:00) | 15 sliced-bread loaves; 40 yogurts |
| Mesa para Todos | 6 kg cake or sweets for a party; 25 kg bananas |
| Rede Barra de Alimentos | 50 kg rice and beans; 40 French rolls |
| Sementes do Amanhã | 40 L whole milk; 15 kg snack fruit |

## Story (about 4 minutes)

| Step | Who | Do | What the audience sees |
|---|---|---|---|
| 1 | Donor | *Doar* → **Tirar foto** of the bread | Claude names the food, estimates quantity, weight, and shelf life, and marks the condition. The form fills itself. |
| 2 | Donor | Point at *ONGs da região precisam de* | Live NGO needs near the shop. |
| 3 | Donor | **Publicar doação** → *Minhas doações* → **Ver histórico e por que esta ONG** | All NGOs ranked with road distance, drive time, open requests, and why any were excluded. Prato Solidário (1.4 km, asked for French rolls) gets the offer. |
| 4 | NGO | *Doações* | The photo, then plain reasons: "Atende sua solicitação de Pão francês", "1,4 km de vocês, ~12 min de carro", Claude's condition note. |
| 5 | NGO | **Não podemos** | Back in the donor window the ranking updates within seconds: *Recusou* on Prato, *Oferta enviada* to the next NGO. |
| 6 | NGO | *Solicitações* → *Horário e espaço para receber* → *Espaço livre hoje* 0 → donor posts again | Prato Solidário drops to the bottom: *Descartada: sem espaço livre hoje*. Restore the capacity afterwards. |
| 7 | Donor, then NGO | Donor posts yogurt (photo or *Descrever manualmente*) → Prato Solidário is *Descartada: não recebe esta categoria*. NGO: *Solicitações* → **Nova solicitação** → iogurte, 30 → donor posts yogurt again | Prato Solidário, which did not take dairy a minute ago, now ranks first with an open request. |
| 8 | Donor | *Local de retirada* → **Editar endereço** → CEP `13083-970` (Cidade Universitária, Barão Geraldo) → post again | The winner changes to Rede Barra de Alimentos, next door. |
| 9 | NGO | **Aceitar doação** → *Entregas* | The donation is *A caminho* with the NGO's delivery code; the request bar fills on *Solicitações*. |
| 10 | Driver | Switch to **Motorista** → select it → **Aceitar entregas** | *Minhas entregas* shows the optimized route on the Azure map. The donor's card now says "Ana Souza está a caminho" with a big **Código de retirada**. |
| 11 | Driver | **Confirmar retirada** with the donor's code, then **Confirmar entrega** with the NGO's code | Wrong codes are refused. The NGO sees the delivery under *Para conferir*. |
| 12 | NGO, donor | NGO: **Confirmar recebimento**. Donor: *Impacto* | kg checked by the NGO, estimated meals, and a prompt to rate the driver. The driver's *Prêmios* shows the new points. |

Steps 5–8 are the proof: each one changes a single input and the ranking
changes for the stated reason.

**Item-level matching (the strongest moment).** From the bakery, post a cake
(*Sem foto? Descreva o alimento* → "bolo de chocolate inteiro", or a photo).
It goes to **Mesa para Todos** (10 km, asked for cake for a party) instead of
Prato Solidário (1.4 km, asked for French rolls). The panel shows Claude's
reason for every NGO, e.g. "Bolo não substitui pão francês no café da manhã".
Then post French rolls: they go to Prato Solidário.

## Verified outcomes (2026-10-17, against the running stack)

Fresh posts made through the API produced these first choices:

| Scenario | First choice | Why |
|---|---|---|
| Bread posted in Cambuí | Prato Solidário, 95.6 | 1.4 km road, open bread need |
| Same bread posted in Barão Geraldo | Rede Barra de Alimentos, 97.4 | 0.9 km; two NGOs excluded as out of range |
| Yogurt in Cambuí | Mesa para Todos, 73.2 | Prato Solidário excluded: does not take dairy |
| Yogurt after Sementes do Amanhã published a dairy need | Sementes do Amanhã, 75.6 | Open need (need 1.0 vs 0.5) |
| Prato Solidário declines | Mesa para Todos receives the offer | Next eligible NGO, within seconds |
| Prato Solidário sets free capacity to 0 | Mesa para Todos | Prato Solidário excluded: no space today |
| Prato Solidário publishes a dairy need, yogurt posted | Prato Solidário, 95.6 | Now accepts dairy and has an open need |
| Bread posted at CEP 13083-970 | Rede Barra de Alimentos, 97.9 | 0.6 km road |

### Item-level results (verified 2026-10-17, Claude Sonnet 5.5)

| Post from the bakery | Goes to | Matched request | Fit |
|---|---|---|---|
| 25 French rolls | Prato Solidário (1.4 km) | Pão francês, covers 25 of 60 | 0.90 |
| Chocolate cake, 2 kg | Mesa para Todos (10.1 km) | Bolo ou doces para festa | 0.95 |
| Bananas, 12 kg | Mesa para Todos (10.1 km) | Banana, covers 12 of 25 kg | 0.95 |
| Carrots and potatoes, 8 kg | Prato Solidário (1.4 km) | Legumes para sopa | 0.95 |
| Rice, 5 kg | Rede Barra de Alimentos | Arroz e feijão | — |

Publishing to a visible ranking takes about 5–8 seconds with Claude.

## If something goes wrong

- **No photo analysis or request matching**: without `ANTHROPIC_API_KEY` the
  photo result comes from the offline classifier and requests are matched by rules
  (*avaliado por regras* in the panel); the rest of the flow still works.
- **Every NGO excluded**: check the clock against NGO hours on *Solicitações*, or run
  the reset again.
- **Offer expired before the NGO clicked**: raise `OFFER_TIMEOUT_SECONDS` and
  restart the workers.
