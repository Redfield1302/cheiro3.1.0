const express = require("express");
const { PrismaClient, CashMovementType } = require("@prisma/client");
const { auth } = require("../middlewares/auth");

const router = express.Router();
const prisma = new PrismaClient();

router.get("/status", auth, async (req, res) => {
  const tenantId = req.user.tenantId;

  const last = await prisma.cashRegister.findFirst({
    where: { tenantId },
    orderBy: { openedAt: "desc" }
  });

  if (!last) return res.json({ isOpen: false });

  res.json({ ...last, isOpen: !last.closedAt });
});

router.post("/open", auth, async (req, res) => {
  const tenantId = req.user.tenantId;
  const { openingAmount = 0 } = req.body || {};

  const open = await prisma.cashRegister.findFirst({
    where: { tenantId, closedAt: null },
    orderBy: { openedAt: "desc" }
  });
  if (open) return res.status(400).json({ error: "Já existe caixa aberto" });

  const cash = await prisma.cashRegister.create({
    data: { tenantId, userId: req.user.sub, openedAt: new Date(), openingAmount: Number(openingAmount) }
  });

  res.json({ ...cash, isOpen: true });
});

router.post("/close", auth, async (req, res) => {
  const tenantId = req.user.tenantId;
  const { closingAmount = 0 } = req.body || {};

  const open = await prisma.cashRegister.findFirst({
    where: { tenantId, closedAt: null },
    orderBy: { openedAt: "desc" }
  });
  if (!open) return res.status(400).json({ error: "Nenhum caixa aberto" });

  const closed = await prisma.cashRegister.update({
    where: { id: open.id },
    data: { closedAt: new Date(), closingAmount: Number(closingAmount) }
  });

  res.json({ ...closed, isOpen: false });
});

// GET /api/cash/movements
router.get("/movements", auth, async (req, res) => {
  const tenantId = req.user.tenantId;
  const { cashRegisterId } = req.query || {};

  let registerId = cashRegisterId || null;
  if (!registerId) {
    const open = await prisma.cashRegister.findFirst({
      where: { tenantId, closedAt: null },
      orderBy: { openedAt: "desc" }
    });
    if (open) registerId = open.id;
  }
  if (!registerId) {
    const last = await prisma.cashRegister.findFirst({
      where: { tenantId },
      orderBy: { openedAt: "desc" }
    });
    if (last) registerId = last.id;
  }
  if (!registerId) return res.json([]);

  const movements = await prisma.cashMovement.findMany({
    where: { cashRegisterId: registerId },
    orderBy: { createdAt: "desc" },
    take: 100
  });

  res.json(movements);
});

// POST /api/cash/movements
router.post("/movements", auth, async (req, res) => {
  const tenantId = req.user.tenantId;
  const { type = "INCOME", amount, reason, meta } = req.body || {};
  if (amount == null) return res.status(400).json({ error: "amount é obrigatório" });

  const open = await prisma.cashRegister.findFirst({
    where: { tenantId, closedAt: null },
    orderBy: { openedAt: "desc" }
  });
  if (!open) return res.status(400).json({ error: "Nenhum caixa aberto" });

  const t = Object.values(CashMovementType).includes(type) ? type : CashMovementType.INCOME;

  const movement = await prisma.cashMovement.create({
    data: {
      cashRegisterId: open.id,
      type: t,
      amount: Number(amount),
      reason: reason || null,
      meta: meta || null
    }
  });

  res.status(201).json(movement);
});

module.exports = router;
