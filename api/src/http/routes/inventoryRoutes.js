const express = require("express");
const { PrismaClient, InventoryMovementType } = require("@prisma/client");
const { auth } = require("../middlewares/auth");

const router = express.Router();
const prisma = new PrismaClient();

function handleRouteError(res, scope, e) {
  console.error(`${scope}_error`, e);
  if (e?.code === "P1001") {
    return res.status(503).json({ error: "Banco indisponivel no momento. Tente novamente." });
  }
  return res.status(500).json({ error: "Falha interna de estoque" });
}

router.get("/items", auth, async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const items = await prisma.inventoryItem.findMany({ where: { tenantId }, orderBy: { name: "asc" } });
    return res.json(items);
  } catch (e) {
    return handleRouteError(res, "inventory_items", e);
  }
});

router.post("/items", auth, async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const { name, unit, cost, quantity, minimum } = req.body || {};
    if (!name || !unit || quantity == null || minimum == null) {
      return res.status(400).json({ error: "name, unit, quantity, minimum sao obrigatorios" });
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
    return res.status(201).json(item);
  } catch (e) {
    return handleRouteError(res, "inventory_create_item", e);
  }
});

// POST /api/inventory/movements
router.post("/movements", auth, async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const { itemId, type = "IN", quantity, reason, meta } = req.body || {};
    if (!itemId || quantity == null) return res.status(400).json({ error: "itemId e quantity sao obrigatorios" });

    const item = await prisma.inventoryItem.findUnique({ where: { id: itemId } });
    if (!item || item.tenantId !== tenantId) return res.status(404).json({ error: "Item nao encontrado" });

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

    return res.status(201).json(result);
  } catch (e) {
    return handleRouteError(res, "inventory_movement", e);
  }
});

// GET /api/inventory/items/:id/movements
router.get("/items/:id/movements", auth, async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const item = await prisma.inventoryItem.findUnique({ where: { id: req.params.id } });
    if (!item || item.tenantId !== tenantId) return res.status(404).json({ error: "Item nao encontrado" });

    const movements = await prisma.inventoryMovement.findMany({
      where: { itemId: item.id },
      orderBy: { createdAt: "desc" },
      take: 100
    });

    return res.json(movements);
  } catch (e) {
    return handleRouteError(res, "inventory_list_movements", e);
  }
});

module.exports = router;
