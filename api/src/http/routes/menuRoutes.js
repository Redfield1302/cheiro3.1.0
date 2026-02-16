const express = require("express");
const { PrismaClient, PaymentStatus, PaymentMethod, OrderStatus } = require("@prisma/client");

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/menu/:slug
router.get("/:slug", async (req, res) => {
  const tenant = await prisma.tenant.findUnique({ where: { slug: req.params.slug } });
  if (!tenant) return res.status(404).json({ error: "Tenant não encontrado" });

  res.json({ tenant: { id: tenant.id, name: tenant.name, slug: tenant.slug, logoUrl: tenant.logoUrl } });
});

// GET /api/menu/:slug/categories
router.get("/:slug/categories", async (req, res) => {
  const tenant = await prisma.tenant.findUnique({ where: { slug: req.params.slug } });
  if (!tenant) return res.status(404).json({ error: "Tenant não encontrado" });

  const categories = await prisma.productCategory.findMany({
    where: { tenantId: tenant.id, active: true },
    orderBy: [{ sort: "asc" }, { name: "asc" }]
  });
  res.json({ categories });
});

// GET /api/menu/:slug/products?categoryId=
router.get("/:slug/products", async (req, res) => {
  const tenant = await prisma.tenant.findUnique({ where: { slug: req.params.slug } });
  if (!tenant) return res.status(404).json({ error: "Tenant não encontrado" });

  const where = { tenantId: tenant.id, active: true };
  if (req.query.categoryId) where.categoryId = String(req.query.categoryId);

  const products = await prisma.product.findMany({
    where,
    include: {
      categoryRef: true
    },
    orderBy: [{ createdAt: "desc" }]
  });

  res.json({ products });
});

// GET /api/menu/:slug/products/:id
router.get("/:slug/products/:id", async (req, res) => {
  const tenant = await prisma.tenant.findUnique({ where: { slug: req.params.slug } });
  if (!tenant) return res.status(404).json({ error: "Tenant não encontrado" });

  const product = await prisma.product.findFirst({
    where: { id: req.params.id, tenantId: tenant.id },
    include: {
      categoryRef: true,
      modifierGroups: { include: { options: true }, orderBy: { sort: "asc" } }
    }
  });

  if (!product) return res.status(404).json({ error: "Produto não encontrado" });
  res.json({ product });
});

// POST /api/menu/:slug/orders
router.post("/:slug/orders", async (req, res) => {
  const tenant = await prisma.tenant.findUnique({ where: { slug: req.params.slug } });
  if (!tenant) return res.status(404).json({ error: "Tenant não encontrado" });

  const { items = [], paymentMethod = "PIX" } = req.body || {};
  if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ error: "items inválido" });

  const method = Object.values(PaymentMethod).includes(paymentMethod) ? paymentMethod : PaymentMethod.PIX;

  const created = await prisma.$transaction(async (tx) => {
    let subtotal = 0;

    // cria pedido
    const order = await tx.order.create({
      data: {
        tenantId: tenant.id,
        source: "MENU",
        status: OrderStatus.OPEN,
        subtotal: 0,
        total: 0
      }
    });

    for (const it of items) {
      const product = await tx.product.findFirst({ where: { id: it.productId, tenantId: tenant.id } });
      if (!product) continue;

      const qty = Number(it.quantity || 1);
      const totalPrice = product.price * qty;
      subtotal += totalPrice;

      const orderItem = await tx.orderItem.create({
        data: {
          orderId: order.id,
          productId: product.id,
          name: product.name,
          quantity: qty,
          unitPrice: product.price,
          totalPrice: totalPrice,
          notes: it.notes || null
        }
      });

      // modifiers (se vierem)
      const mods = Array.isArray(it.modifiers) ? it.modifiers : [];
      for (const m of mods) {
        await tx.orderItemModifier.create({
          data: {
            orderItemId: orderItem.id,
            groupName: m.groupName || "Opções",
            name: m.name,
            quantity: Number(m.quantity || 1),
            price: Number(m.price || 0),
            groupId: m.groupId || null,
            optionId: m.optionId || null
          }
        });
      }
    }

    const updated = await tx.order.update({
      where: { id: order.id },
      data: { subtotal, total: subtotal }
    });

    // cria pagamento (pix fake por enquanto)
    const payment = await tx.payment.create({
      data: {
        orderId: updated.id,
        method,
        amount: updated.total,
        status: PaymentStatus.PENDING,
        provider: "PIX_FAKE",
        externalId: "tx_" + Date.now(),
        pixCode: "000201...FAKE",
        pixExpiresAt: new Date(Date.now() + 15 * 60 * 1000)
      }
    });

    return { order: updated, payment };
  });

  res.status(201).json(created);
});

// POST /api/menu/payments/pix  (compat com apps antigos)
router.post("/payments/pix", async (req, res) => {
  const { orderId } = req.body || {};
  if (!orderId) return res.status(400).json({ error: "orderId obrigatório" });

  const payment = await prisma.payment.findFirst({ where: { orderId } });
  if (!payment) return res.status(404).json({ error: "Pagamento não encontrado" });

  res.json({ payment });
});

// GET /api/menu/payments/:id
router.get("/payments/:id", async (req, res) => {
  const payment = await prisma.payment.findUnique({ where: { id: req.params.id } });
  if (!payment) return res.status(404).json({ error: "Pagamento não encontrado" });
  res.json({ payment });
});

// GET /api/menu/orders/:id
router.get("/orders/:id", async (req, res) => {
  const order = await prisma.order.findUnique({
    where: { id: req.params.id },
    include: { items: { include: { modifiers: true } }, payments: true }
  });
  if (!order) return res.status(404).json({ error: "Pedido não encontrado" });
  res.json({ order });
});

module.exports = router;
