const express = require("express");
const { PrismaClient } = require("@prisma/client");
const { auth } = require("../middlewares/auth");

const router = express.Router();
const prisma = new PrismaClient();

function parseDateRange(dateFrom, dateTo) {
  const from = dateFrom ? new Date(`${dateFrom}T00:00:00.000Z`) : null;
  const to = dateTo ? new Date(`${dateTo}T23:59:59.999Z`) : null;
  if (from && isNaN(from.getTime())) return { error: "dateFrom inválido" };
  if (to && isNaN(to.getTime())) return { error: "dateTo inválido" };
  return { from, to };
}

// GET /api/orders?status=&dateFrom=YYYY-MM-DD&dateTo=YYYY-MM-DD
router.get("/", auth, async (req, res) => {
  const tenantId = req.user.tenantId;
  const { status, dateFrom, dateTo } = req.query || {};

  const { from, to, error } = parseDateRange(dateFrom, dateTo);
  if (error) return res.status(400).json({ error });

  const where = { tenantId };
  if (status) where.status = String(status);
  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt.gte = from;
    if (to) where.createdAt.lte = to;
  }

  const orders = await prisma.order.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      displayId: true,
      status: true,
      total: true,
      createdAt: true,
      source: true
    }
  });
  res.json(orders);
});

module.exports = router;
