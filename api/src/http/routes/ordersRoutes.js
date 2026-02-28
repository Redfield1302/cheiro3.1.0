const express = require("express");
const { PrismaClient } = require("@prisma/client");
const { auth } = require("../middlewares/auth");

const router = express.Router();
const prisma = new PrismaClient();
function handleRouteError(res, scope, e) {
  console.error(`${scope}_error`, e);
  if (e?.code === "P1001") {
    return res.status(503).json({ error: "Banco indisponivel no momento. Tente novamente." });
  }
  return res.status(500).json({ error: "Falha interna ao processar pedidos" });
}

function parseDateRange(dateFrom, dateTo) {
  const from = dateFrom ? new Date(`${dateFrom}T00:00:00.000Z`) : null;
  const to = dateTo ? new Date(`${dateTo}T23:59:59.999Z`) : null;
  if (from && isNaN(from.getTime())) return { error: "dateFrom invalido" };
  if (to && isNaN(to.getTime())) return { error: "dateTo invalido" };
  return { from, to };
}

// GET /api/orders/dashboard?dateFrom=YYYY-MM-DD&dateTo=YYYY-MM-DD
router.get("/dashboard", auth, async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const { dateFrom, dateTo } = req.query || {};
    const { from, to, error } = parseDateRange(dateFrom, dateTo);
    if (error) return res.status(400).json({ error });

    const where = { tenantId };
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = from;
      if (to) where.createdAt.lte = to;
    }

    const rows = await prisma.order.findMany({
      where,
      select: {
        id: true,
        status: true,
        source: true,
        total: true,
        cmvTotal: true
      }
    });

    const finalized = rows.filter((r) => ["CONFIRMED", "PREPARING", "READY", "DISPATCHED", "DELIVERED"].includes(r.status));
    const canceledCount = rows.filter((r) => r.status === "CANCELED").length;
    const openCount = rows.filter((r) => r.status === "OPEN").length;
    const grossSales = finalized.reduce((s, r) => s + Number(r.total || 0), 0);
    const cmvTotal = finalized.reduce((s, r) => s + Number(r.cmvTotal || 0), 0);
    const grossMarginValue = grossSales - cmvTotal;
    const grossMarginPercent = grossSales > 0 ? (grossMarginValue / grossSales) * 100 : 0;
    const avgTicket = finalized.length > 0 ? grossSales / finalized.length : 0;

    const bySourceMap = new Map();
    for (const r of finalized) {
      const key = String(r.source || "UNKNOWN");
      const current = bySourceMap.get(key) || { source: key, orders: 0, grossSales: 0, cmvTotal: 0 };
      current.orders += 1;
      current.grossSales += Number(r.total || 0);
      current.cmvTotal += Number(r.cmvTotal || 0);
      bySourceMap.set(key, current);
    }

    const bySource = Array.from(bySourceMap.values()).map((row) => {
      const rowMarginValue = row.grossSales - row.cmvTotal;
      const rowMarginPercent = row.grossSales > 0 ? (rowMarginValue / row.grossSales) * 100 : 0;
      return {
        ...row,
        grossMarginValue: rowMarginValue,
        grossMarginPercent: rowMarginPercent
      };
    });

    return res.json({
      period: { dateFrom: dateFrom || null, dateTo: dateTo || null },
      totals: {
        ordersCount: finalized.length,
        openCount,
        canceledCount,
        grossSales,
        cmvTotal,
        grossMarginValue,
        grossMarginPercent,
        avgTicket
      },
      bySource
    });
  } catch (e) {
    return handleRouteError(res, "orders_dashboard", e);
  }
});

// GET /api/orders?status=&dateFrom=YYYY-MM-DD&dateTo=YYYY-MM-DD
router.get("/", auth, async (req, res) => {
  try {
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
        cmvTotal: true,
        grossMarginValue: true,
        grossMarginPercent: true,
        createdAt: true,
        source: true
      }
    });
    return res.json(orders);
  } catch (e) {
    return handleRouteError(res, "orders_list", e);
  }
});

module.exports = router;
