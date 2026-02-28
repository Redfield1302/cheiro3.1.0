# Documentacao da API

Base URL (dev): `http://localhost:3000`

## Auth

- `POST /api/auth/login`
- Header nas rotas protegidas:
  - `Authorization: Bearer <token>`

## Health

- `GET /health`

## Tenant

- `GET /api/tenant/me`
  - inclui `checkoutSettings`:
    - `pixKey`
    - `deliveryFee`
    - `cardFeePercent`
- `PATCH /api/tenant/me`
  - atualiza dados do tenant, horarios e checkout settings.

## Cardapio (publico)

- `GET /api/menu/:slug`
- `GET /api/menu/:slug/categories`
- `GET /api/menu/:slug/products`
- `GET /api/menu/:slug/products/:id`
- `POST /api/menu/:slug/orders`
  - suporta:
    - `items[]` com pizza/modifiers
    - `customerName`, `customerPhone`, `customerAddress`, `customerReference`
    - `paymentMethod`
    - `deliveryFee`, `cardFeeAmount`
- `GET /api/menu/orders/:id`

## PDV (protegido)

- `GET /api/pdv/products`
- `POST /api/pdv/cart`
- `GET /api/pdv/cart/:cartId`
- `POST /api/pdv/cart/:cartId/items`
- `DELETE /api/pdv/cart/:cartId/items/:itemId`
- `POST /api/pdv/checkout`
  - suporta:
    - dados do cliente
    - `deliveryFee`, `cardFeeAmount`
    - `mode`, `comanda`

## Produtos e ficha tecnica

- `GET/POST/PATCH /api/products`
- `GET/PUT /api/products/:id/pizza-config`
- `GET/PUT /api/products/:id/recipe`

## Estoque

- `GET /api/inventory/items`
- `POST /api/inventory/items`
- `POST /api/inventory/movements`
- `GET /api/inventory/items/:id/movements`

## Cozinha

- `GET /api/kitchen/orders`
- `PATCH /api/kitchen/orders/:id/status`

## Pedidos e dashboard

- `GET /api/orders`
- `GET /api/orders/dashboard`

## Tratamento de erro

- Padrao de resposta:
  - `{ "error": "mensagem" }`
- Falha de banco (`P1001`) retorna `503` nas rotas principais.

