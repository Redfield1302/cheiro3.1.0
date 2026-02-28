const { calculatePizzaLine } = require("./pizzaPricing");

async function addItemToOrder(tx, { tenantId, orderId, itemInput }) {
  const { productId, quantity = 1, pizza = null, notes = null, modifiers = [] } = itemInput || {};
  if (!productId) {
    throw new Error("productId obrigatorio");
  }

  const product = await tx.product.findFirst({ where: { id: productId, tenantId } });
  if (!product) {
    throw new Error("Produto nao encontrado");
  }

  const qty = Number(quantity || 1);
  if (!Number.isFinite(qty) || qty <= 0) {
    throw new Error("quantity invalido");
  }

  let lineName = product.name;
  let unitPrice = Number(product.price || 0);
  let totalPrice = unitPrice * qty;
  let lineNotes = notes || null;
  let pizzaModifiers = [];

  if (product.isPizza) {
    const pizzaLine = await calculatePizzaLine(tx, {
      tenantId,
      product,
      quantity: qty,
      pizza
    });
    lineName = pizzaLine.name;
    unitPrice = pizzaLine.unitPrice;
    totalPrice = pizzaLine.totalPrice;
    lineNotes = lineNotes ? `${lineNotes} | ${pizzaLine.notesSuffix}` : pizzaLine.notesSuffix;
    pizzaModifiers = pizzaLine.modifiers;
  }

  const orderItem = await tx.orderItem.create({
    data: {
      orderId,
      productId: product.id,
      name: lineName,
      quantity: qty,
      unitPrice,
      totalPrice,
      notes: lineNotes
    }
  });

  const allModifiers = [
    ...pizzaModifiers.map((pm) => ({
      orderItemId: orderItem.id,
      groupName: pm.groupName,
      name: pm.name,
      quantity: pm.quantity,
      price: pm.price,
      groupId: pm.groupId,
      optionId: pm.optionId
    })),
    ...((Array.isArray(modifiers) ? modifiers : []).map((mod) => ({
      orderItemId: orderItem.id,
      groupName: mod.groupName || "Opcoes",
      name: mod.name,
      quantity: Number(mod.quantity || 1),
      price: Number(mod.price || 0),
      groupId: mod.groupId || null,
      optionId: mod.optionId || null
    })))
  ];

  if (allModifiers.length > 0) {
    await tx.orderItemModifier.createMany({ data: allModifiers });
  }

  return orderItem;
}

async function recalcOrderTotals(tx, orderId) {
  const items = await tx.orderItem.findMany({ where: { orderId } });
  const subtotal = items.reduce((sum, item) => sum + Number(item.totalPrice || 0), 0);
  const updated = await tx.order.update({
    where: { id: orderId },
    data: { subtotal, total: subtotal }
  });
  return updated;
}

module.exports = {
  addItemToOrder,
  recalcOrderTotals
};
