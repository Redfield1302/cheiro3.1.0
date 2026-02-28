# Changelog v5.0.0-alpha

Data: 2026-02-28

## Destaques

- Cardapio digital mobile com fluxo completo:
  - home por tenant em `/t/:slug`
  - menu em `/t/:slug/menu`
  - produto com montagem de pizza (tamanho + sabores)
  - carrinho com CRUD (somar, reduzir, remover, limpar)
  - checkout com dados do cliente
  - tela final de status do pedido em `/t/:slug/order/:id`
- Cozinha com monitoramento ativo:
  - polling automatico
  - alerta sonoro para novo pedido
  - auto impressao de comanda (opcional)
- Unificacao de logica de montagem:
  - PDV e cardapio usam o mesmo builder (`orderBuilder`)
- Checkout com regras do estabelecimento:
  - chave PIX
  - taxa de entrega
  - taxa de cartao
  - refletido no ERP, PDV e cardapio digital
- Upload de imagens do dispositivo:
  - logo do tenant
  - imagem de produto
  - mantido suporte por URL

## API

- `POST /api/menu/:slug/orders` agora aceita dados de cliente e taxas de checkout.
- `POST /api/pdv/checkout` agora aceita `deliveryFee` e `cardFeeAmount`.
- `GET /api/menu/:slug` e `GET /api/tenant/me` retornam `checkoutSettings`.
- Padrao de tratamento de erro aplicado nas rotas principais com fallback para `503` em `P1001`.

## Banco e regras

- Fluxo de pedido confirmado segue disparando baixa de estoque/CMV pelo state machine.
- Normalizacao de telefone/endereco para persistencia e integracoes (WhatsApp/Maps).

## Versoes

- `package.json`: `5.0.0-alpha`
- `api/package.json`: `5.0.0-alpha`
- `front-pdr-erp/package.json`: `5.0.0-alpha`
- `front-cardapio/package.json`: `5.0.0-alpha`
- Banner da API: `v5.0.0-alpha`

