const express = require("express");
const { PrismaClient, PaymentStatus, PaymentMethod, OrderStatus } = require("@prisma/client");
const { calculatePizzaLine } = require("../../core/pizzaPricing");

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/menu/:slug
router.get("/:slug", async (req, res) => {
  const tenant = await prisma.tenant.findUnique({ where: { slug: req.params.slug } });
  if (!tenant) return res.status(404).json({ error: "Tenant nao encontrado" });

  res.json({ tenant: { id: tenant.id, name: tenant.name, slug: tenant.slug, logoUrl: tenant.logoUrl } });
});

// GET /api/menu/:slug/categories
router.get("/:slug/categories", async (req, res) => {
  const tenant = await prisma.tenant.findUnique({ where: { slug: req.params.slug } });
  if (!tenant) return res.status(404).json({ error: "Tenant nao encontrado" });

  const categories = await prisma.productCategory.findMany({
    where: { tenantId: tenant.id, active: true },
    orderBy: [{ sort: "asc" }, { name: "asc" }]
  });
  res.json({ categories });
});

// GET /api/menu/:slug/products?categoryId=
router.get("/:slug/products", async (req, res) => {
  const tenant = await prisma.tenant.findUnique({ where: { slug: req.params.slug } });
  if (!tenant) return res.status(404).json({ error: "Tenant nao encontrado" });

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
  if (!tenant) return res.status(404).json({ error: "Tenant nao encontrado" });

  const product = await prisma.product.findFirst({
    where: { id: req.params.id, tenantId: tenant.id },
    include: {
      categoryRef: true,
      modifierGroups: { include: { options: true }, orderBy: { sort: "asc" } },
      pizzaSizes: { where: { tenantId: tenant.id, active: true }, orderBy: [{ sort: "asc" }, { name: "asc" }] },
      pizzaFlavors: {
        where: { tenantId: tenant.id, active: true },
        orderBy: [{ sort: "asc" }, { name: "asc" }],
        include: { prices: { include: { size: true } } }
      }
    }
  });

  if (!product) return res.status(404).json({ error: "Produto nao encontrado" });
  res.json({ product });
});

// POST /api/menu/:slug/orders
router.post("/:slug/orders", async (req, res) => {
  const tenant = await prisma.tenant.findUnique({ where: { slug: req.params.slug } });
  if (!tenant) return res.status(404).json({ error: "Tenant nao encontrado" });

  const { items = [], paymentMethod = "PIX" } = req.body || {};
  if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ error: "items invalido" });

  const method = Object.values(PaymentMethod).includes(paymentMethod) ? paymentMethod : PaymentMethod.PIX;

  try {
    const created = await prisma.$transaction(async (tx) => {
      let subtotal = 0;

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

        let lineName = product.name;
        let unitPrice = Number(product.price);
        let totalPrice = unitPrice * qty;
        let notes = it.notes || null;
        let pizzaModifiers = [];

        if (product.isPizza) {
          const pizzaLine = await calculatePizzaLine(tx, {
            tenantId: tenant.id,
            product,
            quantity: qty,
            pizza: it.pizza
          });
          lineName = pizzaLine.name;
          unitPrice = pizzaLine.unitPrice;
          totalPrice = pizzaLine.totalPrice;
          notes = notes ? `${notes} | ${pizzaLine.notesSuffix}` : pizzaLine.notesSuffix;
          pizzaModifiers = pizzaLine.modifiers;
        }

        subtotal += totalPrice;

        const orderItem = await tx.orderItem.create({
          data: {
            orderId: order.id,
            productId: product.id,
            name: lineName,
            quantity: qty,
            unitPrice,
            totalPrice,
            notes
          }
        });

        for (const pm of pizzaModifiers) {
          await tx.orderItemModifier.create({
            data: {
              orderItemId: orderItem.id,
              groupName: pm.groupName,
              name: pm.name,
              quantity: pm.quantity,
              price: pm.price,
              groupId: pm.groupId,
              optionId: pm.optionId
            }
          });
        }

        const mods = Array.isArray(it.modifiers) ? it.modifiers : [];
        for (const m of mods) {
          await tx.orderItemModifier.create({
            data: {
              orderItemId: orderItem.id,
              groupName: m.groupName || "Opcoes",
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

    return res.status(201).json(created);
  } catch (e) {
    return res.status(400).json({ error: e.message || "Falha ao criar pedido" });
  }
});

router.post("/payments/pix", async (req, res) => {
  const { orderId } = req.body || {};
  if (!orderId) return res.status(400).json({ error: "orderId obrigatorio" });

  const payment = await prisma.payment.findFirst({ where: { orderId } });
  if (!payment) return res.status(404).json({ error: "Pagamento nao encontrado" });

  res.json({ payment });
});

router.get("/payments/:id", async (req, res) => {
  const payment = await prisma.payment.findUnique({ where: { id: req.params.id } });
  if (!payment) return res.status(404).json({ error: "Pagamento nao encontrado" });
  res.json({ payment });
});

router.get("/orders/:id", async (req, res) => {
  const order = await prisma.order.findUnique({
    where: { id: req.params.id },
    include: { items: { include: { modifiers: true } }, payments: true }
  });
  if (!order) return res.status(404).json({ error: "Pedido nao encontrado" });
  res.json({ order });
});

module.exports = router;
