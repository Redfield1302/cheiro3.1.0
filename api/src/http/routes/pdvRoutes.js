const express = require("express");
const { PrismaClient, OrderStatus, PaymentMethod, PaymentStatus } = require("@prisma/client");
const { auth } = require("../middlewares/auth");
const { transitionOrderState } = require("../../core/orderStateMachine");
const { calculatePizzaLine } = require("../../core/pizzaPricing");

const router = express.Router();
const prisma = new PrismaClient();

router.get("/products", auth, async (req, res) => {
  const tenantId = req.user.tenantId;
  const products = await prisma.product.findMany({
    where: { tenantId, active: true },
    include: { categoryRef: true },
    orderBy: [{ categoryId: "asc" }, { name: "asc" }]
  });
  res.json(products);
});

router.post("/cart", auth, async (req, res) => {
  const tenantId = req.user.tenantId;
  const order = await prisma.order.create({
    data: { tenantId, source: "PDV", status: OrderStatus.OPEN, total: 0, subtotal: 0 }
  });
  res.json({ cartId: order.id });
});

router.get("/cart/:cartId", auth, async (req, res) => {
  const order = await prisma.order.findUnique({
    where: { id: req.params.cartId },
    include: { items: { include: { modifiers: true } } }
  });
  if (!order) return res.status(404).json({ error: "Carrinho nao encontrado" });
  res.json(order);
});

router.post("/cart/:cartId/items", auth, async (req, res) => {
  const tenantId = req.user.tenantId;
  const { productId, quantity = 1, pizza = null } = req.body || {};
  if (!productId) return res.status(400).json({ error: "productId obrigatorio" });

  try {
    const result = await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { id: req.params.cartId } });
      if (!order || order.tenantId !== tenantId) return { error: "Carrinho invalido", status: 404 };
      if (order.status !== OrderStatus.OPEN) return { error: "Carrinho nao esta OPEN", status: 400 };

      const product = await tx.product.findUnique({ where: { id: productId } });
      if (!product || product.tenantId !== tenantId) return { error: "Produto nao encontrado", status: 404 };

      const q = Number(quantity || 1);

      let lineName = product.name;
      let unitPrice = Number(product.price);
      let totalPrice = unitPrice * q;
      let notes = null;
      let pizzaModifiers = [];

      if (product.isPizza) {
        const pizzaLine = await calculatePizzaLine(tx, { tenantId, product, quantity: q, pizza });
        lineName = pizzaLine.name;
        unitPrice = pizzaLine.unitPrice;
        totalPrice = pizzaLine.totalPrice;
        // Evita duplicidade: os sabores ja vao como modifiers.
        notes = null;
        pizzaModifiers = pizzaLine.modifiers;
      }

      const item = await tx.orderItem.create({
        data: {
          orderId: req.params.cartId,
          productId,
          name: lineName,
          quantity: q,
          unitPrice,
          totalPrice,
          notes
        }
      });

      for (const pm of pizzaModifiers) {
        await tx.orderItemModifier.create({
          data: {
            orderItemId: item.id,
            groupName: pm.groupName,
            name: pm.name,
            quantity: pm.quantity,
            price: pm.price,
            groupId: pm.groupId,
            optionId: pm.optionId
          }
        });
      }

      const items = await tx.orderItem.findMany({ where: { orderId: req.params.cartId } });
      const subtotal = items.reduce((s, it) => s + it.totalPrice, 0);

      await tx.order.update({
        where: { id: req.params.cartId },
        data: { subtotal, total: subtotal }
      });

      return { itemId: item.id, subtotal };
    });

    if (result.error) return res.status(result.status).json({ error: result.error });
    return res.json(result);
  } catch (e) {
    return res.status(400).json({ error: e.message || "Falha ao adicionar item" });
  }
});

router.delete("/cart/:cartId/items/:itemId", auth, async (req, res) => {
  await prisma.$transaction(async (tx) => {
    await tx.orderItemModifier.deleteMany({ where: { orderItemId: req.params.itemId } });
    await tx.orderItem.delete({ where: { id: req.params.itemId } });
  });

  const items = await prisma.orderItem.findMany({ where: { orderId: req.params.cartId } });
  const subtotal = items.reduce((s, it) => s + it.totalPrice, 0);

  await prisma.order.update({
    where: { id: req.params.cartId },
    data: { subtotal, total: subtotal }
  });

  res.json({ ok: true, subtotal });
});

router.post("/checkout", auth, async (req, res) => {
  const {
    cartId,
    paymentMethod = "PIX",
    customerName,
    customerPhone,
    customerAddress,
    customerReference,
    comanda,
    mode
  } = req.body || {};
  if (!cartId) return res.status(400).json({ error: "cartId obrigatorio" });
  if (!Object.values(PaymentMethod).includes(paymentMethod)) return res.status(400).json({ error: "paymentMethod invalido" });

  const tenantId = req.user.tenantId;

  const result = await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: cartId }, include: { items: true } });
    if (!order || order.tenantId !== tenantId) return { error: "Pedido invalido", status: 404 };
    if (order.status !== OrderStatus.OPEN) return { error: "Pedido nao esta OPEN", status: 400 };

    let customerId = null;
    const phone = String(customerPhone || "").trim() || null;
    const name = String(customerName || "").trim() || "Nao informado";

    if (phone) {
      const customer = await tx.customer.upsert({
        where: { tenantId_phone: { tenantId, phone } },
        update: { name },
        create: { tenantId, name, phone }
      });
      customerId = customer.id;
    } else if (name && name !== "Nao informado") {
      const customer = await tx.customer.create({
        data: { tenantId, name, phone: null }
      });
      customerId = customer.id;
    }

    let addressId = null;
    const streetRaw = String(customerAddress || "").trim();
    const referenceRaw = String(customerReference || "").trim();
    if (streetRaw || referenceRaw) {
      const createdAddress = await tx.address.create({
        data: {
          tenantId,
          customerId,
          street: streetRaw || "Nao informado",
          city: "Nao informado",
          state: "NA",
          reference: referenceRaw || null
        }
      });
      addressId = createdAddress.id;
    }

    await tx.order.update({
      where: { id: order.id },
      data: {
        customerId,
        addressId,
        displayId: comanda ? String(comanda).trim() : order.displayId,
        source: mode ? String(mode).trim() : order.source
      }
    });

    await tx.payment.create({
      data: { orderId: order.id, method: paymentMethod, amount: order.total, status: PaymentStatus.PAID }
    });

    const updated = await transitionOrderState(tx, {
      orderId: order.id,
      toStatus: OrderStatus.CONFIRMED,
      actorUserId: req.user.sub,
      extraPayload: { paymentMethod }
    });

    return { updated };
  });

  if (result.error) return res.status(result.status).json({ error: result.error });
  res.json(result.updated);
});

module.exports = router;
