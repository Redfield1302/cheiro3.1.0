# Visao Geral

Cheiro3 v3.2.0 e um monorepo com tres apps:

- API: Node.js + Express + Prisma (PostgreSQL)
- front-cardapio: cardapio publico e pedidos (React + Vite)
- front-pdr-erp: ERP/PDV interno (React + Vite)

## Arquitetura

- Multi-tenant: cada registro fica ligado a um `Tenant` via `tenantId`.
- Auth: JWT bearer token emitido pela API e salvo em localStorage no ERP.
- Cardapio: rotas publicas em `/api/menu/:slug` sem auth.
- PDV/ERP: rotas autenticadas em `/api/*`.

## Responsabilidades em runtime

- `api/src/server.js` inicia o servidor, conecta o Prisma, faz seed inicial e sobe a API.
- `api/src/core/ensureSeed.js` cria tenant inicial, admin, categorias e produtos.
- `api/src/core/orderStateMachine.js` valida transicoes de status e aplica movimento de estoque.

## Banco de dados

- Schema Prisma em `api/prisma/schema.prisma`
- Banco: PostgreSQL via `DATABASE_URL`

## Versoes

- API banner atual: `API v3.1.0` (ainda nao atualizado)
- Fronts e docs: `v3.2.0`
