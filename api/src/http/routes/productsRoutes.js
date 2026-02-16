const express = require("express");
const { PrismaClient } = require("@prisma/client");
const { auth } = require("../middlewares/auth");

const router = express.Router();
const prisma = new PrismaClient();

router.get("/", auth, async (req, res) => {
  const tenantId = req.user.tenantId;
  const { active } = req.query || {};
  const where = { tenantId };
  if (active !== undefined) where.active = String(active) === "true";

  const products = await prisma.product.findMany({
    where,
    include: { categoryRef: true },
    orderBy: [{ createdAt: "desc" }]
  });
  res.json(products);
});

router.post("/", auth, async (req, res) => {
  const tenantId = req.user.tenantId;
  const { name, price, categoryId, description, imageUrl, type = "PRODUCED", unit, cost } = req.body || {};
  if (!name || price == null) return res.status(400).json({ error: "name e price são obrigatórios" });

  const product = await prisma.product.create({
    data: {
      tenantId,
      name,
      price: Number(price),
      categoryId: categoryId || null,
      description: description || null,
      imageUrl: imageUrl || null,
      type,
      unit: unit || null,
      cost: cost == null ? null : Number(cost),
      active: true
    }
  });
  res.status(201).json(product);
});

// PATCH /api/products/:id
router.patch("/:id", auth, async (req, res) => {
  const tenantId = req.user.tenantId;
  const { name, price, categoryId, description, imageUrl, type, unit, cost, active } = req.body || {};

  const product = await prisma.product.findUnique({ where: { id: req.params.id } });
  if (!product || product.tenantId !== tenantId) return res.status(404).json({ error: "Produto não encontrado" });

  const updated = await prisma.product.update({
    where: { id: product.id },
    data: {
      name: name != null ? name : product.name,
      price: price != null ? Number(price) : product.price,
      categoryId: categoryId !== undefined ? categoryId : product.categoryId,
      description: description !== undefined ? description : product.description,
      imageUrl: imageUrl !== undefined ? imageUrl : product.imageUrl,
      type: type != null ? type : product.type,
      unit: unit !== undefined ? unit : product.unit,
      cost: cost !== undefined ? (cost == null ? null : Number(cost)) : product.cost,
      active: active != null ? Boolean(active) : product.active
    }
  });

  res.json(updated);
});

module.exports = router;
