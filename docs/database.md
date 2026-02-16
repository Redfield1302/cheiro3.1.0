# Banco (Prisma)

Schema: `api/prisma/schema.prisma`

## Entidades principais

- Tenant: raiz de multi-tenant.
- User: pertence a um tenant, usado no login do ERP/PDV.
- ProductCategory / Product: catalogo. Product pode referenciar categoria normalizada.
- ProductModifierGroup / ProductModifierOption: complementos e opcoes do cardapio.
- Order / OrderItem / OrderItemModifier: pedidos e snapshots dos itens/modificadores.
- Payment: pagamentos, PIX fake no fluxo do cardapio.
- InventoryItem / InventoryMovement / RecipeItem: estoque e consumo.
- CashRegister / CashMovement: abertura/fechamento e movimentacoes manuais.
- Customer / Address: clientes e enderecos.
- DeliveryPerson / Delivery: entrega.
- Conversation / Message: atendimento/automacao.

## Enums

- OrderStatus: OPEN, CONFIRMED, PREPARING, READY, DISPATCHED, DELIVERED, CANCELED
- PaymentMethod: CASH, PIX, CREDIT, DEBIT, MEAL_VOUCHER
- PaymentStatus: PENDING, PAID, CANCELED, REFUNDED
- DeliveryStatus: PENDING, ASSIGNED, PICKED_UP, DELIVERED, CANCELED
- InventoryMovementType: IN, OUT, ADJUSTMENT
- CashMovementType: INCOME, EXPENSE, SUPPLY, WITHDRAW
- MessageSender: CUSTOMER, BOT, HUMAN
- ModifierGroupType: ADD, REMOVE, FLAVOR

## State machine

`api/src/core/orderStateMachine.js` valida transicoes e aplica estoque:

- OPEN -> CONFIRMED: estoque OUT
- Qualquer -> CANCELED: estorna pagamento e estoque IN

Usado em `/api/pdv/checkout`.
