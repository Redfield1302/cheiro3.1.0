# Front-PDR-ERP (Backoffice/PDV/Cozinha)

App: `front-pdr-erp`

## Rotas principais

- `/login`
- `/dashboard`
- `/pdv`
- `/cash`
- `/inventory`
- `/products`
- `/categories`
- `/orders`
- `/kitchen`
- `/conversations`
- `/settings/tenant`

## Funcionalidades recentes

- PDV com montagem de pizza, checkout, impressao e envio para cozinha.
- Faturamento com taxas de checkout:
  - taxa de entrega
  - taxa de cartao (credito/debito)
  - exibicao de chave PIX no modal.
- Cozinha com:
  - cards por status
  - detalhes (itens/modifiers/obs)
  - atalho WhatsApp e Google Maps
  - som e auto-impressao opcionais para novos pedidos.
- Configuracao do estabelecimento com:
  - logo (URL ou arquivo local)
  - chave PIX
  - taxa de entrega
  - taxa de cartao
  - horarios de funcionamento.
- Produtos com upload de imagem local (alem de URL).

## Sessao

- LocalStorage: `cg_session_v3`
- Estrutura: token + user + tenant

## API principal usada

- Auth: `POST /api/auth/login`
- Tenant: `GET/PATCH /api/tenant/me`
- PDV: `/api/pdv/*`
- Cozinha: `/api/kitchen/*`
- Produtos/Categorias: `/api/products/*`, `/api/categories/*`
- Estoque: `/api/inventory/*`
- Caixa: `/api/cash/*`
- Pedidos: `/api/orders/*`
- Atendimento: `/api/conversations/*`

