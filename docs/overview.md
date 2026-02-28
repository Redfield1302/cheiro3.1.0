# Visao Geral

Cheiro3 v5.0.0-alpha e um monorepo com tres apps:

- API: Node.js + Express + Prisma (PostgreSQL)
- front-cardapio: cardapio digital mobile e checkout publico (React + Vite)
- front-pdr-erp: ERP/PDV/Cozinha interno (React + Vite)

## Arquitetura

- Multi-tenant: dados isolados por `tenantId`.
- Auth no ERP/PDV por JWT.
- Cardapio digital com rotas publicas por slug (`/t/:slug`).
- Reuso de regra de negocio:
  - montagem de item/pizza compartilhada entre PDV e cardapio (`orderBuilder`)
  - transicao de status + CMV/estoque centralizada em `orderStateMachine`.

## Fluxo principal

1. Cliente cria pedido no cardapio digital.
2. Pedido entra na mesma API/banco do ERP.
3. Cozinha acompanha status e atualiza producao.
4. PDV e cozinha refletem o mesmo pedido em tempo real por polling.

## Checkout do estabelecimento

Configurado em `Opcoes do estabelecimento`:

- `pixKey`
- `deliveryFee`
- `cardFeePercent`

Esses dados refletem em:

- checkout do cardapio digital
- faturamento do PDV
- impressao da comanda

## Versao atual

- API banner: `v5.0.0-alpha`
- Monorepo e frontends: `v5.0.0-alpha`

