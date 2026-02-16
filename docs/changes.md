# Changelog v3.2.0

Data: 2026-02-07

## Front (ERP/PDV)

- Layout base com sidebar/topbar e tema magenta/vinho.
- Novas rotas: `/categories`, `/orders`, `/settings/tenant`.
- Design system minimo: Button, Input, Select, Card, Modal, Table, Badge, Toast, Skeleton, Empty State.
- PDV: busca, categorias ativas, carrinho e checkout.
- Caixa: abertura/fechamento + movimentacoes manuais + historico.
- Estoque: CRUD de insumos + movimentacoes via modal + historico por item.
- Produtos/Categorias: CRUD basico + ativar/desativar.
- Atendimento: inbox simples consumindo conversas.

## API

- Tenant: `GET /api/tenant/me`.
- Categorias: `PATCH /api/categories/:id` + filtro `?active=`.
- Produtos: `PATCH /api/products/:id` + filtro `?active=`.
- Caixa: `GET /api/cash/movements`.
- Estoque: `POST /api/inventory/movements` + `GET /api/inventory/items/:id/movements`.
- Pedidos: `GET /api/orders` com filtros `status/dateFrom/dateTo`.
- Atendimento: `GET /api/conversations`, `GET /api/conversations/:id`, `POST /api/conversations/:id/messages`.

## Observacoes

- API banner ainda loga v3.1.0; atualizar no servidor se quiser alinhar.
- Front-cardapio foi mantido sem mudancas.
