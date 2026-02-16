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

  const cats = await prisma.productCategory.findMany({
    where,
    orderBy: [{ sort: "asc" }, { name: "asc" }]
  });
  res.json(cats);
});

router.post("/", auth, async (req, res) => {
  const tenantId = req.user.tenantId;
  const { name, sort = 0, active = true } = req.body || {};
  if (!name) return res.status(400).json({ error: "name é obrigatório" });

  const cat = await prisma.productCategory.create({
    data: { tenantId, name, sort: Number(sort), active: Boolean(active) }
  });
  res.status(201).json(cat);
});

// PATCH /api/categories/:id
router.patch("/:id", auth, async (req, res) => {
  const tenantId = req.user.tenantId;
  const { name, sort, active } = req.body || {};

  const cat = await prisma.productCategory.findUnique({ where: { id: req.params.id } });
  if (!cat || cat.tenantId !== tenantId) return res.status(404).json({ error: "Categoria não encontrada" });

  const updated = await prisma.productCategory.update({
    where: { id: cat.id },
    data: {
      name: name != null ? name : cat.name,
      sort: sort != null ? Number(sort) : cat.sort,
      active: active != null ? Boolean(active) : cat.active
    }
  });

  res.json(updated);
});

module.exports = router;
