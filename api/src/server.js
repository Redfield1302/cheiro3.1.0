require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { PrismaClient } = require("@prisma/client");
const { ensureSeed } = require("./core/ensureSeed");

const authRoutes = require("./http/routes/authRoutes");
const categoriesRoutes = require("./http/routes/categoriesRoutes");
const productsRoutes = require("./http/routes/productsRoutes");
const inventoryRoutes = require("./http/routes/inventoryRoutes");
const pdvRoutes = require("./http/routes/pdvRoutes");
const cashRoutes = require("./http/routes/cashRoutes");
const menuRoutes = require("./http/routes/menuRoutes");
const tenantRoutes = require("./http/routes/tenantRoutes");
const ordersRoutes = require("./http/routes/ordersRoutes");
const conversationsRoutes = require("./http/routes/conversationsRoutes");
const kitchenRoutes = require("./http/routes/kitchenRoutes");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => res.json({ status: "ok", ts: new Date().toISOString() }));

app.use("/api/auth", authRoutes);
app.use("/api/login", authRoutes); // compat
app.use("/api/tenant", tenantRoutes);
app.use("/api/categories", categoriesRoutes);
app.use("/api/products", productsRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/pdv", pdvRoutes);
app.use("/api/cash", cashRoutes);
app.use("/api/menu", menuRoutes);
app.use("/api/orders", ordersRoutes);
app.use("/api/conversations", conversationsRoutes);
app.use("/api/kitchen", kitchenRoutes);

app.use((req, res) => res.status(404).json({ error: "Rota nao encontrada" }));

async function start() {
  const prisma = new PrismaClient();
  await prisma.$connect();
  await ensureSeed(prisma);
  await prisma.$disconnect();

  app.listen(PORT, () => console.log(`API v5.0.0-alpha rodando em http://localhost:${PORT}`));
}

start();

module.exports = app;
