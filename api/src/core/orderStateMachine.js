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
      const unitCost = Number(r.inventoryItem?.cost || 0);
      const current = consumed.get(r.inventoryItemId) || { qty: 0, costTotal: 0 };
      current.qty += qty;
      current.costTotal += qty * unitCost;
      consumed.set(r.inventoryItemId, current);
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
  let orderCmvTotal = 0;

  for (const item of order.items) {
    if (!item.productId) continue;
    const itemConsumed = new Map();
    await collectInventoryConsumption(tx, {
      tenantId: order.tenantId,
      productId: item.productId,
      multiplier: Number(item.quantity || 0),
      cache,
      stack: new Set(),
      consumed: itemConsumed
    });

    for (const [inventoryItemId, payload] of itemConsumed.entries()) {
      const current = consumed.get(inventoryItemId) || { qty: 0, costTotal: 0 };
      current.qty += Number(payload.qty || 0);
      current.costTotal += Number(payload.costTotal || 0);
      consumed.set(inventoryItemId, current);
    }

    if (direction === "OUT") {
      let itemCmv = 0;
      for (const payload of itemConsumed.values()) itemCmv += Number(payload.costTotal || 0);

      const lineRevenue = Number(item.totalPrice || 0);
      const lineMarginValue = lineRevenue - itemCmv;
      const lineMarginPercent = lineRevenue > 0 ? (lineMarginValue / lineRevenue) * 100 : 0;

      await tx.orderItem.update({
        where: { id: item.id },
        data: {
          cmvUnit: Number(item.quantity || 0) > 0 ? itemCmv / Number(item.quantity) : itemCmv,
          cmvTotal: itemCmv,
          marginValue: lineMarginValue,
          marginPercent: lineMarginPercent
        }
      });
      orderCmvTotal += itemCmv;
    }
  }

  for (const [inventoryItemId, payload] of consumed.entries()) {
    const qty = Number(payload.qty || 0);
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

  if (direction === "OUT") {
    const revenue = Number(order.total || 0);
    const grossMarginValue = revenue - orderCmvTotal;
    const grossMarginPercent = revenue > 0 ? (grossMarginValue / revenue) * 100 : 0;
    await tx.order.update({
      where: { id: orderId },
      data: {
        cmvTotal: orderCmvTotal,
        grossMarginValue,
        grossMarginPercent
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
