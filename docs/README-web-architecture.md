# Resgata web architecture

Organize by feature. Dependencies flow from `app` to `features` to `shared`;
`shared` never imports upward and features do not deep-import one another.

Each feature owns network hooks, components, pages, view models, pt-BR
messages, routes, and a public `index.ts`. Network access stays in `api/`;
components receive props or call feature hooks. Shared components move to
`shared/ui` instead of being copied.

Routes choose layout and role guard in `app/router`. Reads use TanStack Query,
one app-level SSE connection invalidates query keys, and offline writes retain
the same `Idempotency-Key` when replayed from IndexedDB.

| Route | Feature | Layout | Role |
|---|---|---|---|
| `/entrar` | session | public | any |
| `/doar` | vision, donations | mobile | seller |
| `/minhas-doacoes` | donations | mobile | seller |
| `/ong/ofertas` | offers | mobile | ngo |
| `/ong/recebimentos` | pickups | mobile | ngo |
| `/coleta` | pickups | mobile | driver |
| `/cupons` | coupons | mobile | driver |
| `/painel` | impact, donations | desktop | seller |
| `/parceiro` | partner | desktop | partner |
| `/admin/queues` | admin | desktop | any demo user |

Enforce boundaries in lint. Status uses icon, color, and text; actions have
48-pixel targets and icon plus label; simulated data uses `SimuladoBadge`.
