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
    const err = new Error(`Transicao invalida: ${from} -> ${to}`);
    err.code = "INVALID_TRANSITION";
    throw err;
  }
}

async function collectInventoryConsumption(tx, { tenantId, productId, multiplier, cache, stack, consumed }) {
  if (!productId || !Number.isFinite(multiplier) || multiplier <= 0) return;
  if (stack.has(productId)) throw new Error("Ciclo detectado na ficha tecnica");

  let recipe = cache.get(productId);
  if (!recipe) {
    const product = await tx.product.findUnique({
      where: { id: productId },
      include: {
        recipeItems: {
          include: {
            inventoryItem: true,
            ingredientProduct: true
          }
        }
      }
    });
    if (!product || product.tenantId !== tenantId) return;
    recipe = product.recipeItems || [];
    cache.set(productId, recipe);
  }

  if (recipe.length === 0) return;

  stack.add(productId);
  for (const r of recipe) {
    const qty = Number(r.quantity || 0) * multiplier;
    if (!Number.isFinite(qty) || qty <= 0) continue;

    if (r.inventoryItemId) {
      consumed.set(r.inventoryItemId, (consumed.get(r.inventoryItemId) || 0) + qty);
      continue;
    }

    if (r.ingredientProductId) {
      await collectInventoryConsumption(tx, {
        tenantId,
        productId: r.ingredientProductId,
        multiplier: qty,
        cache,
        stack,
        consumed
      });
    }
  }
  stack.delete(productId);
}

async function applyInventoryForOrder(tx, orderId, direction) {
  const order = await tx.order.findUnique({
    where: { id: orderId },
    include: { items: true }
  });
  if (!order) return;

  const consumed = new Map();
  const cache = new Map();

  for (const item of order.items) {
    if (!item.productId) continue;
    await collectInventoryConsumption(tx, {
      tenantId: order.tenantId,
      productId: item.productId,
      multiplier: Number(item.quantity || 0),
      cache,
      stack: new Set(),
      consumed
    });
  }

  for (const [inventoryItemId, qty] of consumed.entries()) {
    const signed = direction === "OUT" ? -qty : qty;

    await tx.inventoryItem.update({
      where: { id: inventoryItemId },
      data: { quantity: { increment: signed } }
    });

    await tx.inventoryMovement.create({
      data: {
        itemId: inventoryItemId,
        type: direction === "OUT" ? InventoryMovementType.OUT : InventoryMovementType.IN,
        quantity: qty,
        reason: direction === "OUT" ? `Baixa pedido ${orderId}` : `Reversao pedido ${orderId}`
      }
    });
  }
}

async function transitionOrderState(tx, { orderId, toStatus, actorUserId = null, reason = null, extraPayload = null }) {
  const order = await tx.order.findUnique({ where: { id: orderId }, include: { payments: true } });
  if (!order) throw new Error("Pedido nao encontrado");

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

