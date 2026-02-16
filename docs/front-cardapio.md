# Front-Cardapio (Publico)

App: `front-cardapio`

## Rotas

- `/t/:slug` -> lista do cardapio
- `/t/:slug/p/:id` -> detalhe do produto
- `/t/:slug/cart` -> carrinho e checkout

## Local storage

Carrinho em `cg_cart`:

```
[
  { "productId": "...", "name": "...", "price": 49.9, "quantity": 2 }
]
```

## Uso de API

- `GET /api/menu/:slug`
- `GET /api/menu/:slug/categories`
- `GET /api/menu/:slug/products?categoryId=`
- `GET /api/menu/:slug/products/:id`
- `POST /api/menu/:slug/orders`

## UX

- UI minima com inline styles.
- Sem auth.
- Checkout envia PIX por padrao e limpa o carrinho.
