const express = require("express");
const { PrismaClient } = require("@prisma/client");
const { auth } = require("../middlewares/auth");

const router = express.Router();
const prisma = new PrismaClient();

router.get("/me", auth, async (req, res) => {
  const tenant = await prisma.tenant.findUnique({ where: { id: req.user.tenantId } });
  if (!tenant) return res.status(404).json({ error: "Tenant não encontrado" });
  res.json({ id: tenant.id, name: tenant.name, slug: tenant.slug, segment: tenant.segment, logoUrl: tenant.logoUrl });
});

module.exports = router;
