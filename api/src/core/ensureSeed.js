const bcrypt = require("bcryptjs");

async function ensureSeed(prisma) {
  let tenant = await prisma.tenant.findFirst();
  if (!tenant) {
    tenant = await prisma.tenant.create({
      data: { slug: "minhapizzaria", segment: "pizzaria", name: "Minha Pizzaria" }
    });
  }

  let admin = await prisma.user.findUnique({ where: { email: "admin@test.com" } });
  if (!admin) {
    const hash = await bcrypt.hash("admin123", 10);
    admin = await prisma.user.create({
      data: {
        tenantId: tenant.id,
        name: "Admin",
        email: "admin@test.com",
        password: hash,
        role: "ADMIN",
        active: true
      }
    });
  }

  // categories
  const catCount = await prisma.productCategory.count({ where: { tenantId: tenant.id } });
  if (catCount === 0) {
    await prisma.productCategory.createMany({
      data: [
        { tenantId: tenant.id, name: "Pizzas", sort: 1, active: true },
        { tenantId: tenant.id, name: "Bebidas", sort: 2, active: true }
      ]
    });
  }

  const pizzas = await prisma.productCategory.findFirst({ where: { tenantId: tenant.id, name: "Pizzas" } });
  const bebidas = await prisma.productCategory.findFirst({ where: { tenantId: tenant.id, name: "Bebidas" } });

  // products
  const pCount = await prisma.product.count({ where: { tenantId: tenant.id } });
  if (pCount === 0) {
    await prisma.product.createMany({
      data: [
        { tenantId: tenant.id, categoryId: pizzas?.id, name: "Pizza Calabresa", price: 49.9, active: true, type: "PRODUCED" },
        { tenantId: tenant.id, categoryId: pizzas?.id, name: "Pizza Frango", price: 52.9, active: true, type: "PRODUCED" },
        { tenantId: tenant.id, categoryId: bebidas?.id, name: "Refrigerante 2L", price: 12.0, active: true, type: "RESELL" }
      ]
    });
  }

  return { tenant, admin };
}

module.exports = { ensureSeed };
