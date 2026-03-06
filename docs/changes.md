# Changelog v6.0.0

Data: 2026-03-03

## Destaques

- Novo modulo de entregas separado do PDV/ERP:
  - login exclusivo para entregador
  - pagina simples em kanban para acompanhar pedidos
  - entregador so visualiza pedidos do proprio tenant
  - sem acesso as rotas internas do ERP.
- Fluxo de entrega:
  - pedidos `READY` ficam disponiveis para assumir
  - ao assumir, pedido vai para `DISPATCHED`
  - entregador finaliza em `DELIVERED`.
- Onboarding SaaS melhorado:
  - cadastro (`/api/auth/register`) retorna links do cardapio digital
  - link inclui id do estabelecimento para distribuicao.

## API

- Adicionado namespace `delivery`:
  - `POST /api/delivery/auth/login`
  - `GET /api/delivery/orders`
  - `PATCH /api/delivery/orders/:id/claim`
  - `PATCH /api/delivery/orders/:id/status`
  - `POST /api/delivery/agents`
- `POST /api/auth/register` agora retorna `menuLinks`.

## Banco (Prisma)

- `DeliveryPerson` agora pertence a `Tenant`:
  - novo campo `tenantId`
  - relacao com `Tenant`
  - unicidade por tenant: `@@unique([tenantId, email])`
- Migration: `api/prisma/migrations/20260303001000_delivery_person_tenant/migration.sql`

## Front ERP

- Novas rotas:
  - `/delivery/login`
  - `/delivery/board`
- Sessao dedicada para entregas:
  - localStorage: `cg_delivery_session_v1`

## Versoes

- `package.json`: `6.0.0`
- `api/package.json`: `6.0.0`
- `front-pdr-erp/package.json`: `6.0.0`
- `front-cardapio/package.json`: `6.0.0`
- Banner da API: `v6.0.0`
