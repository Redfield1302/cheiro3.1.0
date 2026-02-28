const express = require("express");
const { PrismaClient } = require("@prisma/client");
const { auth } = require("../middlewares/auth");

const router = express.Router();
const prisma = new PrismaClient();

router.get("/me", auth, async (req, res) => {
  const tenant = await prisma.tenant.findUnique({ where: { id: req.user.tenantId } });
  if (!tenant) return res.status(404).json({ error: "Tenant não encontrado" });
  const rules = tenant.rulesJson || {};
  const checkout = rules.checkout || {};
  res.json({
    id: tenant.id,
    name: tenant.name,
    slug: tenant.slug,
    segment: tenant.segment,
    logoUrl: tenant.logoUrl,
    rulesJson: rules,
    checkoutSettings: {
      pixKey: checkout.pixKey || "",
      deliveryFee: Number(checkout.deliveryFee || 0),
      cardFeePercent: Number(checkout.cardFeePercent || 0)
    }
  });
});

router.patch("/me", auth, async (req, res) => {
  const tenant = await prisma.tenant.findUnique({ where: { id: req.user.tenantId } });
  if (!tenant) return res.status(404).json({ error: "Tenant não encontrado" });

  const { logoUrl, openingHours, checkoutSettings } = req.body || {};
  const nextRules = { ...(tenant.rulesJson || {}) };
  if (openingHours !== undefined) nextRules.openingHours = openingHours;
  if (checkoutSettings !== undefined) {
    const current = nextRules.checkout || {};
    nextRules.checkout = {
      ...current,
      pixKey: String(checkoutSettings?.pixKey || "").trim(),
      deliveryFee: Number(checkoutSettings?.deliveryFee || 0),
      cardFeePercent: Number(checkoutSettings?.cardFeePercent || 0)
    };
  }

  const updated = await prisma.tenant.update({
    where: { id: tenant.id },
    data: {
      logoUrl: logoUrl !== undefined ? logoUrl : tenant.logoUrl,
      rulesJson: nextRules
    }
  });

  res.json({
    id: updated.id,
    name: updated.name,
    slug: updated.slug,
    segment: updated.segment,
    logoUrl: updated.logoUrl,
    rulesJson: updated.rulesJson || {},
    checkoutSettings: {
      pixKey: String(updated?.rulesJson?.checkout?.pixKey || ""),
      deliveryFee: Number(updated?.rulesJson?.checkout?.deliveryFee || 0),
      cardFeePercent: Number(updated?.rulesJson?.checkout?.cardFeePercent || 0)
    }
  });
});

module.exports = router;
