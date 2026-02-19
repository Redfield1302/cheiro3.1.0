# Front-PDR-ERP (Backoffice/PDV)

App: `front-pdr-erp`

## Rotas

- `/login` -> login
- `/pdv` -> tela de PDV
- `/cash` -> caixa (abrir/fechar + movimentacoes)
- `/inventory` -> insumos (CRUD + movimentacoes)
- `/products` -> produtos (CRUD basico)
- `/categories` -> categorias (CRUD basico)
- `/orders` -> pedidos (lista simples + filtros)
- `/kitchen` -> painel da cozinha por status
- `/conversations` -> atendimento (inbox)
- `/settings/tenant` -> dados do estabelecimento

## Auth + sessao

- Login: `POST /api/auth/login`
- Sessao em localStorage `cg_session_v3`:

```
{ "token": "...", "user": { ... }, "tenant": { ... } }
```

Rotas sao protegidas por role. Sem token redireciona para `/login`.

## Design system minimo

- Button, Input, Select
- Card, Modal/Dialog, Table
- Badge/Tag, Toast
- Skeleton loading, Empty state

## Uso de API

- Tenant: `GET /api/tenant/me`
- Estoque: `GET/POST /api/inventory/items`, `POST /api/inventory/movements`, `GET /api/inventory/items/:id/movements`
- PDV: `GET /api/pdv/products`, `POST /api/pdv/cart`, `GET /api/pdv/cart/:id`,
  `POST /api/pdv/cart/:id/items`, `DELETE /api/pdv/cart/:id/items/:itemId`,
  `POST /api/pdv/checkout`
- Ficha tecnica: `GET/PUT /api/products/:id/recipe`
- Caixa: `GET /api/cash/status`, `POST /api/cash/open`, `POST /api/cash/close`, `GET/POST /api/cash/movements`
- Produtos/Categorias: `GET/POST/PATCH /api/products`, `GET/POST/PATCH /api/categories`
- Pedidos: `GET /api/orders?status=&dateFrom=&dateTo=`
- Cozinha: `GET /api/kitchen/orders`, `PATCH /api/kitchen/orders/:id/status`
- Atendimento: `GET /api/conversations`, `GET /api/conversations/:id`, `POST /api/conversations/:id/messages`

## UX

- Tema com 2 opcoes: magenta/vinho e azul corporativo
- Layout consistente com Sidebar/Topbar
- Status da API (online/offline)
- Toasts para feedback
- Cozinha com dropdown de detalhes por pedido
- Atalhos de WhatsApp e Google Maps na cozinha
