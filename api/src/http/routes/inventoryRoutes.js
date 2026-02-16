const express = require("express");
const { PrismaClient, InventoryMovementType } = require("@prisma/client");
const { auth } = require("../middlewares/auth");

const router = express.Router();
const prisma = new PrismaClient();

router.get("/items", auth, async (req, res) => {
  const tenantId = req.user.tenantId;
  const items = await prisma.inventoryItem.findMany({ where: { tenantId }, orderBy: { name: "asc" } });
  res.json(items);
});

router.post("/items", auth, async (req, res) => {
  const tenantId = req.user.tenantId;
  const { name, unit, cost, quantity, minimum } = req.body || {};
  if (!name || !unit || quantity == null || minimum == null) {
    return res.status(400).json({ error: "name, unit, quantity, minimum são obrigatórios" });
  }

  const item = await prisma.inventoryItem.create({
    data: {
      tenantId,
      name,
      unit,
      cost: cost == null ? null : Number(cost),
      quantity: Number(quantity),
      minimum: Number(minimum)
    }
  });
  res.status(201).json(item);
});

// POST /api/inventory/movements
router.post("/movements", auth, async (req, res) => {
  const tenantId = req.user.tenantId;
  const { itemId, type = "IN", quantity, reason, meta } = req.body || {};
  if (!itemId || quantity == null) return res.status(400).json({ error: "itemId e quantity são obrigatórios" });

  const item = await prisma.inventoryItem.findUnique({ where: { id: itemId } });
  if (!item || item.tenantId !== tenantId) return res.status(404).json({ error: "Item não encontrado" });

  const t = Object.values(InventoryMovementType).includes(type) ? type : InventoryMovementType.IN;

  const result = await prisma.$transaction(async (tx) => {
    let increment = 0;
    let movementQty = Number(quantity);

    if (t === InventoryMovementType.IN) increment = movementQty;
    if (t === InventoryMovementType.OUT) increment = -movementQty;
    if (t === InventoryMovementType.ADJUSTMENT) {
      const diff = Number(quantity) - Number(item.quantity);
      increment = diff;
      movementQty = diff;
    }

    await tx.inventoryItem.update({
      where: { id: item.id },
      data: { quantity: { increment } }
    });

    return tx.inventoryMovement.create({
      data: {
        itemId: item.id,
        type: t,
        quantity: movementQty,
        reason: reason || null,
        meta: meta || null
      }
    });
  });

  res.status(201).json(result);
});

// GET /api/inventory/items/:id/movements
router.get("/items/:id/movements", auth, async (req, res) => {
  const tenantId = req.user.tenantId;
  const item = await prisma.inventoryItem.findUnique({ where: { id: req.params.id } });
  if (!item || item.tenantId !== tenantId) return res.status(404).json({ error: "Item não encontrado" });

  const movements = await prisma.inventoryMovement.findMany({
    where: { itemId: item.id },
    orderBy: { createdAt: "desc" },
    take: 100
  });

  res.json(movements);
});

module.exports = router;
