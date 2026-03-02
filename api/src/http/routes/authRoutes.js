const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const router = express.Router();
const { prisma } = require("../../lib/prisma");

function normalizeSlug(input) {
  return String(input || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

router.post("/register", async (req, res) => {
  const {
    tenantName,
    tenantSlug,
    segment = "pizzaria",
    name,
    email,
    password
  } = req.body || {};

  if (!tenantName || !name || !email || !password) {
    return res.status(400).json({
      error: "tenantName, name, email e password sao obrigatorios"
    });
  }

  if (String(password).length < 6) {
    return res.status(400).json({ error: "password deve ter pelo menos 6 caracteres" });
  }

  const slugBase = normalizeSlug(tenantSlug || tenantName);
  if (!slugBase) return res.status(400).json({ error: "tenantSlug invalido" });

  const emailNorm = String(email).trim().toLowerCase();
  const existingEmail = await prisma.user.findUnique({ where: { email: emailNorm } });
  if (existingEmail) return res.status(409).json({ error: "email ja cadastrado" });

  let finalSlug = slugBase;
  for (let i = 0; i < 20; i += 1) {
    const exists = await prisma.tenant.findUnique({ where: { slug: finalSlug } });
    if (!exists) break;
    finalSlug = `${slugBase}-${Math.floor(1000 + Math.random() * 9000)}`;
  }
  const slugTaken = await prisma.tenant.findUnique({ where: { slug: finalSlug } });
  if (slugTaken) return res.status(409).json({ error: "nao foi possivel gerar slug unico" });

  const hash = await bcrypt.hash(String(password), 10);

  const result = await prisma.$transaction(async (tx) => {
    const tenant = await tx.tenant.create({
      data: { name: String(tenantName).trim(), slug: finalSlug, segment: String(segment || "pizzaria") }
    });

    const user = await tx.user.create({
      data: {
        tenantId: tenant.id,
        name: String(name).trim(),
        email: emailNorm,
        password: hash,
        role: "ADMIN",
        active: true
      }
    });

    return { tenant, user };
  });

  const token = jwt.sign(
    {
      sub: result.user.id,
      tenantId: result.tenant.id,
      role: result.user.role,
      email: result.user.email
    },
    process.env.JWT_SECRET || "dev-secret",
    { expiresIn: "7d" }
  );

  return res.status(201).json({
    token,
    user: {
      id: result.user.id,
      name: result.user.name,
      email: result.user.email,
      role: result.user.role
    },
    tenant: {
      id: result.tenant.id,
      name: result.tenant.name,
      slug: result.tenant.slug
    }
  });
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: "email e password sÃ£o obrigatÃ³rios" });

  const user = await prisma.user.findUnique({ where: { email }, include: { tenant: true } });
  if (!user) return res.status(401).json({ error: "Credenciais invÃ¡lidas" });

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) return res.status(401).json({ error: "Credenciais invÃ¡lidas" });

  const token = jwt.sign(
    { sub: user.id, tenantId: user.tenantId, role: user.role, email: user.email },
    process.env.JWT_SECRET || "dev-secret",
    { expiresIn: "7d" }
  );

  res.json({
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
    tenant: { id: user.tenant.id, name: user.tenant.name, slug: user.tenant.slug }
  });
});

module.exports = router;


