const { OrderStatus, PaymentStatus, InventoryMovementType } = require("@prisma/client");

function assertTransition(from, to) {
  const allowed = {
    [OrderStatus.OPEN]: [OrderStatus.CONFIRMED, OrderStatus.CANCELED],
    [OrderStatus.CONFIRMED]: [OrderStatus.PREPARING, OrderStatus.CANCELED],
    [OrderStatus.PREPARING]: [OrderStatus.READY, OrderStatus.CANCELED],
    [OrderStatus.READY]: [OrderStatus.DISPATCHED, OrderStatus.DELIVERED, OrderStatus.CANCELED],
    [OrderStatus.DISPATCHED]: [OrderStatus.DELIVERED, OrderStatus.CANCELED],
    [OrderStatus.DELIVERED]: [],
    [OrderStatus.CANCELED]: []
  };
  if (!allowed[from]?.includes(to)) {
    const err = new Error(`Transição inválida: ${from} -> ${to}`);
    err.code = "INVALID_TRANSITION";
    throw err;
  }
}

async function applyInventoryForOrder(tx, orderId, direction) {
  const order = await tx.order.findUnique({
    where: { id: orderId },
    include: { items: { include: { product: { include: { recipeItems: true } } } } }
  });
  if (!order) return;

  for (const item of order.items) {
    const recipe = item.product?.recipeItems || [];
    for (const r of recipe) {
      const qty = r.quantity * item.quantity;
      const signed = direction === "OUT" ? -qty : qty;

      await tx.inventoryItem.update({
        where: { id: r.inventoryItemId },
        data: { quantity: { increment: signed } }
      });

      await tx.inventoryMovement.create({
        data: {
          itemId: r.inventoryItemId,
          type: direction === "OUT" ? InventoryMovementType.OUT : InventoryMovementType.IN,
          quantity: qty,
          reason: direction === "OUT" ? `Baixa pedido ${orderId}` : `Reversão pedido ${orderId}`
        }
      });
    }
  }
}

async function transitionOrderState(tx, { orderId, toStatus, actorUserId = null, reason = null, extraPayload = null }) {
  const order = await tx.order.findUnique({ where: { id: orderId }, include: { payments: true } });
  if (!order) throw new Error("Pedido não encontrado");

  assertTransition(order.status, toStatus);

  if (toStatus === OrderStatus.CANCELED) {
    await tx.payment.updateMany({
      where: { orderId, status: PaymentStatus.PAID },
      data: { status: PaymentStatus.REFUNDED }
    });
    await applyInventoryForOrder(tx, orderId, "IN");
  }

  if (order.status === OrderStatus.OPEN && toStatus === OrderStatus.CONFIRMED) {
    await applyInventoryForOrder(tx, orderId, "OUT");
  }

  const updated = await tx.order.update({ where: { id: orderId }, data: { status: toStatus } });

  await tx.orderEvent.create({
    data: {
      orderId,
      type: "STATUS_CHANGED",
      payload: { from: order.status, to: toStatus, actorUserId, reason, ...extraPayload }
    }
  });

  return updated;
}

module.exports = { transitionOrderState };
