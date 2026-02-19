const express = require("express");
const { PrismaClient, OrderStatus } = require("@prisma/client");
const { auth } = require("../middlewares/auth");
const { transitionOrderState } = require("../../core/orderStateMachine");

const router = express.Router();
const prisma = new PrismaClient();

function parseStatuses(raw) {
  if (!raw) return [OrderStatus.CONFIRMED, OrderStatus.PREPARING, OrderStatus.READY, OrderStatus.DISPATCHED];
  return String(raw)
    .split(",")
    .map((s) => s.trim())
    .filter((s) => Object.values(OrderStatus).includes(s));
}

router.get("/orders", auth, async (req, res) => {
  const tenantId = req.user.tenantId;
  const statuses = parseStatuses(req.query.statuses);

  const orders = await prisma.order.findMany({
    where: {
      tenantId,
      status: { in: statuses }
    },
    orderBy: [{ createdAt: "asc" }],
    include: {
      customer: true,
      address: true,
      payments: {
        where: { status: "PAID" },
        orderBy: { createdAt: "desc" },
        take: 1
      },
      items: {
        orderBy: { id: "asc" },
        include: {
          modifiers: { orderBy: { createdAt: "asc" } }
        }
      }
    },
    take: 120
  });

  res.json(orders);
});

router.patch("/orders/:id/status", auth, async (req, res) => {
  const tenantId = req.user.tenantId;
  const { toStatus, reason } = req.body || {};

  if (!toStatus || !Object.values(OrderStatus).includes(toStatus)) {
    return res.status(400).json({ error: "toStatus invalido" });
  }

  const order = await prisma.order.findUnique({ where: { id: req.params.id } });
  if (!order || order.tenantId !== tenantId) {
    return res.status(404).json({ error: "Pedido nao encontrado" });
  }

  try {
    const updated = await prisma.$transaction((tx) =>
      transitionOrderState(tx, {
        orderId: order.id,
        toStatus,
        actorUserId: req.user.sub,
        reason: reason || "kitchen_update"
      })
    );
    return res.json(updated);
  } catch (e) {
    if (e.code === "INVALID_TRANSITION") return res.status(400).json({ error: e.message });
    return res.status(500).json({ error: "Falha ao atualizar status" });
  }
});

module.exports = router;
