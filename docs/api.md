# Documentacao da API

Base URL (dev): `http://localhost:3000`

## Auth

JWT em rotas protegidas. Envie bearer token:

```
Authorization: Bearer <token>
```

### POST /api/auth/login

Body:
```
{ "email": "admin@test.com", "password": "admin123" }
```

Response:
```
{ "token": "...", "user": { ... }, "tenant": { ... } }
```

Alias de compatibilidade: o mesmo router tambem esta montado em `/api/login`, entao `/api/login/login` funciona.

## Health

### GET /health

Response:
```
{ "status": "ok", "ts": "2026-02-06T00:00:00.000Z" }
```

## Tenant

### GET /api/tenant/me

Retorna dados do tenant do usuario autenticado.

## Categorias (protegido)

### GET /api/categories?active=true|false

Retorna categorias por tenant. Se `active` for passado, filtra por status.

### POST /api/categories

Body:
```
{ "name": "Pizzas", "sort": 1, "active": true }
```

### PATCH /api/categories/:id

Body:
```
{ "name": "Pizzas", "sort": 1, "active": false }
```

## Produtos (protegido)

### GET /api/products?active=true|false

Retorna produtos por tenant. Inclui `categoryRef`.

### POST /api/products

Body:
```
{
  "name": "Pizza Calabresa",
  "price": 49.9,
  "categoryId": "...",
  "description": "...",
  "imageUrl": "...",
  "type": "PRODUCED",
  "unit": "un",
  "cost": 20
}
```

### PATCH /api/products/:id

Body:
```
{ "name": "Pizza", "price": 55, "active": false }
```

## Estoque (protegido)

### GET /api/inventory/items

### POST /api/inventory/items

Body:
```
{ "name": "Mussarela", "unit": "g", "cost": 0.06, "quantity": 5000, "minimum": 1000 }
```

### POST /api/inventory/movements

Body:
```
{ "itemId": "...", "type": "IN", "quantity": 100, "reason": "Ajuste" }
```

### GET /api/inventory/items/:id/movements

Retorna historico do item.

## PDV (protegido)

### GET /api/pdv/products

### POST /api/pdv/cart

### GET /api/pdv/cart/:cartId

### POST /api/pdv/cart/:cartId/items

### DELETE /api/pdv/cart/:cartId/items/:itemId

### POST /api/pdv/checkout

## Caixa (protegido)

### GET /api/cash/status

### POST /api/cash/open

### POST /api/cash/close

### GET /api/cash/movements

### POST /api/cash/movements

Body:
```
{ "type": "SUPPLY", "amount": 100, "reason": "Troco" }
```

## Pedidos

### GET /api/orders?status=&dateFrom=YYYY-MM-DD&dateTo=YYYY-MM-DD

Retorna lista simples (ultima 100).

## Atendimento

### GET /api/conversations

### GET /api/conversations/:id

### POST /api/conversations/:id/messages

Body:
```
{ "content": "ola", "sender": "HUMAN" }
```

## Cardapio (publico)

### GET /api/menu/:slug

### GET /api/menu/:slug/categories

### GET /api/menu/:slug/products?categoryId=

### GET /api/menu/:slug/products/:id

### POST /api/menu/:slug/orders

## Formato de erro

```
{ "error": "mensagem" }
```
