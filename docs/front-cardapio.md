# Front-Cardapio (Publico)

App: `front-cardapio`

## Rotas

- `/t/:slug` -> home do tenant
- `/t/:slug/menu` -> vitrine de produtos
- `/t/:slug/p/:id` -> detalhe/customizacao do produto
- `/t/:slug/cart` -> carrinho + checkout
- `/t/:slug/order/:id` -> acompanhamento de status do pedido

## Funcionalidades

- Mobile-first.
- Produtos e categorias vindos da mesma API do PDV.
- Pizza fracionada com:
  - selecao de tamanho
  - limite de sabores por tamanho
  - precificacao por regra (`MAIOR_SABOR` ou `PROPORCIONAL`)
- Carrinho com CRUD:
  - adicionar/remover quantidade
  - remover linha
  - limpar carrinho
- Checkout com:
  - dados do cliente (nome, telefone, endereco, referencia, observacoes)
  - forma de pagamento
  - chave PIX exibida quando pagamento = PIX
  - taxa de entrega e taxa de cartao
- Tela final de status com polling.

## Imagens

- Logo do estabelecimento via `tenant.logoUrl`.
- Foto de produto via `product.imageUrl`.
- Suporte a URL e imagem local (base64 salva no campo).

## API consumida

- `GET /api/menu/:slug`
- `GET /api/menu/:slug/categories`
- `GET /api/menu/:slug/products`
- `GET /api/menu/:slug/products/:id`
- `POST /api/menu/:slug/orders`
- `GET /api/menu/orders/:id`

## Storage local

- Carrinho salvo em `cg_cart`.

