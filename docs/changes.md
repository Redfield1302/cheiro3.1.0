# Changelog v4.0.0

Data: 2026-02-19

## Front (ERP/PDV/Cozinha)

- Tema com suporte a variacao `magenta` e `corporate-blue`.
- PDV com impressao de comanda melhorada (itens, modifiers e observacoes).
- PDV envia metadados no checkout: cliente, telefone, endereco, referencia, comanda e modo.
- Produtos:
  - configuracao de pizza com descricoes por sabor;
  - ficha tecnica via modal com campos guiados;
  - ficha tecnica aceita insumo e produto base.
- Estoque: cadastro de insumo via modal com descricoes de campo.
- Cozinha:
  - cards com resumo + dropdown de detalhes;
  - exibicao de notes/modifiers;
  - telefone, pagamento, atalho WhatsApp e atalho Google Maps.

## API

- `GET /api/kitchen/orders` agora retorna `items.modifiers` e `payments`.
- `POST /api/pdv/checkout` persiste dados de cliente/endereco/comanda/origem do pedido.
- `GET/PUT /api/products/:id/recipe` ampliado para suportar:
  - `inventoryItemId` (insumo)
  - `ingredientProductId` (produto base/semiacabado)
- `orderStateMachine` com baixa de estoque recursiva para ficha tecnica multinivel.

## Banco (Prisma)

- `ProductPizzaFlavor.description` adicionado.
- `RecipeItem` agora suporta ingrediente por produto base (`ingredientProductId`) alem de insumo.
- Relacoes adicionais em `Product` para uso como ingrediente de outro produto.

## Versoes

- `api/package.json`: `4.0.0`
- `front-pdr-erp/package.json`: `4.0.0`
- `front-cardapio/package.json`: `4.0.0`
- Banner da API atualizado para `v4.0.0`.
