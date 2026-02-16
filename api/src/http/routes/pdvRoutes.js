const express = require("express");
const { PrismaClient, OrderStatus, PaymentMethod, PaymentStatus } = require("@prisma/client");
const { auth } = require("../middlewares/auth");
const { transitionOrderState } = require("../../core/orderStateMachine");

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
  const order = await prisma.order.findUnique({ where: { id: req.params.cartId }, include: { items: true } });
  if (!order) return res.status(404).json({ error: "Carrinho não encontrado" });
  res.json(order);
});

router.post("/cart/:cartId/items", auth, async (req, res) => {
  const { productId, quantity = 1 } = req.body || {};
  if (!productId) return res.status(400).json({ error: "productId obrigatório" });

  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) return res.status(404).json({ error: "Produto não encontrado" });

  const q = Number(quantity);
  const item = await prisma.orderItem.create({
    data: {
      orderId: req.params.cartId,
      productId,
      name: product.name,
      quantity: q,
      unitPrice: product.price,
      totalPrice: product.price * q
    }
  });

  const items = await prisma.orderItem.findMany({ where: { orderId: req.params.cartId } });
  const subtotal = items.reduce((s, it) => s + it.totalPrice, 0);

  await prisma.order.update({
    where: { id: req.params.cartId },
    data: { subtotal, total: subtotal }
  });

  res.json({ itemId: item.id, subtotal });
});

router.delete("/cart/:cartId/items/:itemId", auth, async (req, res) => {
  await prisma.orderItem.delete({ where: { id: req.params.itemId } });

  const items = await prisma.orderItem.findMany({ where: { orderId: req.params.cartId } });
  const subtotal = items.reduce((s, it) => s + it.totalPrice, 0);

  await prisma.order.update({
    where: { id: req.params.cartId },
    data: { subtotal, total: subtotal }
  });

  res.json({ ok: true, subtotal });
});

router.post("/checkout", auth, async (req, res) => {
  const { cartId, paymentMethod = "PIX" } = req.body || {};
  if (!cartId) return res.status(400).json({ error: "cartId obrigatório" });
  if (!Object.values(PaymentMethod).includes(paymentMethod)) return res.status(400).json({ error: "paymentMethod inválido" });

  const tenantId = req.user.tenantId;

  const result = await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: cartId }, include: { items: true } });
    if (!order || order.tenantId !== tenantId) return { error: "Pedido inválido", status: 404 };
    if (order.status !== OrderStatus.OPEN) return { error: "Pedido não está OPEN", status: 400 };

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
