const express = require("express");
const { randomUUID } = require("crypto");
const { PrismaClient } = require("@prisma/client");
const { auth } = require("../middlewares/auth");

const router = express.Router();
const prisma = new PrismaClient();

function parsePriceNumber(value) {
  if (value == null || value === "") return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : NaN;
  const raw = String(value).trim();
  const normalized = raw.includes(",") ? raw.replace(/\./g, "").replace(",", ".") : raw;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : NaN;
}

function formatRecipeItem(r) {
  const isInventory = Boolean(r.inventoryItemId);
  const sourceName = isInventory ? (r.inventoryItem?.name || "") : (r.ingredientProduct?.name || "");
  const sourceUnit = isInventory ? (r.inventoryItem?.unit || "") : (r.ingredientProduct?.unit || "");
  const sourceCostRaw = isInventory ? r.inventoryItem?.cost : r.ingredientProduct?.cost;
  const sourceCost = sourceCostRaw == null ? null : Number(sourceCostRaw);
  const quantity = Number(r.quantity || 0);

  return {
    id: r.id,
    ingredientType: isInventory ? "INVENTORY" : "PRODUCT",
    inventoryItemId: r.inventoryItemId || null,
    ingredientProductId: r.ingredientProductId || null,
    sourceName,
    sourceUnit,
    sourceCost,
    quantity,
    lineCost: quantity * Number(sourceCost || 0)
  };
}

router.get("/", auth, async (req, res) => {
  const tenantId = req.user.tenantId;
  const { active } = req.query || {};
  const where = { tenantId };
  if (active !== undefined) where.active = String(active) === "true";

  const products = await prisma.product.findMany({
    where,
    include: { categoryRef: true },
    orderBy: [{ createdAt: "desc" }]
  });
  res.json(products);
});

router.post("/", auth, async (req, res) => {
  const tenantId = req.user.tenantId;
  const {
    name,
    price,
    categoryId,
    description,
    imageUrl,
    type = "PRODUCED",
    unit,
    cost,
    isPizza = false,
    pizzaPricingRule = "MAIOR_SABOR"
  } = req.body || {};

  if (!name || price == null) return res.status(400).json({ error: "name e price sao obrigatorios" });

  const product = await prisma.product.create({
    data: {
      tenantId,
      name,
      price: Number(price),
      categoryId: categoryId || null,
      description: description || null,
      imageUrl: imageUrl || null,
      type,
      isPizza: Boolean(isPizza),
      pizzaPricingRule,
      unit: unit || null,
      cost: cost == null ? null : Number(cost),
      active: true
    }
  });
  res.status(201).json(product);
});

// PATCH /api/products/:id
router.patch("/:id", auth, async (req, res) => {
  const tenantId = req.user.tenantId;
  const {
    name,
    price,
    categoryId,
    description,
    imageUrl,
    type,
    unit,
    cost,
    active,
    isPizza,
    pizzaPricingRule
  } = req.body || {};

  const product = await prisma.product.findUnique({ where: { id: req.params.id } });
  if (!product || product.tenantId !== tenantId) return res.status(404).json({ error: "Produto nao encontrado" });

  const updated = await prisma.product.update({
    where: { id: product.id },
    data: {
      name: name != null ? name : product.name,
      price: price != null ? Number(price) : product.price,
      categoryId: categoryId !== undefined ? categoryId : product.categoryId,
      description: description !== undefined ? description : product.description,
      imageUrl: imageUrl !== undefined ? imageUrl : product.imageUrl,
      type: type != null ? type : product.type,
      isPizza: isPizza != null ? Boolean(isPizza) : product.isPizza,
      pizzaPricingRule: pizzaPricingRule != null ? pizzaPricingRule : product.pizzaPricingRule,
      unit: unit !== undefined ? unit : product.unit,
      cost: cost !== undefined ? (cost == null ? null : Number(cost)) : product.cost,
      active: active != null ? Boolean(active) : product.active
    }
  });

  res.json(updated);
});

// GET /api/products/:id/pizza-config
router.get("/:id/pizza-config", auth, async (req, res) => {
  const tenantId = req.user.tenantId;
  const product = await prisma.product.findUnique({
    where: { id: req.params.id },
    include: {
      pizzaSizes: { where: { tenantId }, orderBy: [{ sort: "asc" }, { name: "asc" }] },
      pizzaFlavors: {
        where: { tenantId },
        orderBy: [{ sort: "asc" }, { name: "asc" }],
        include: { prices: { include: { size: true } } }
      }
    }
  });

  if (!product || product.tenantId !== tenantId) return res.status(404).json({ error: "Produto nao encontrado" });

  const flavors = product.pizzaFlavors.map((f) => ({
    id: f.id,
    name: f.name,
    description: f.description || null,
    active: f.active,
    sort: f.sort,
    prices: Object.fromEntries((f.prices || []).map((p) => [p.size.name, p.price]))
  }));

  res.json({
    productId: product.id,
    isPizza: product.isPizza,
    pizzaPricingRule: product.pizzaPricingRule,
    sizes: product.pizzaSizes,
    flavors
  });
});

// PUT /api/products/:id/pizza-config
router.put("/:id/pizza-config", auth, async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const { isPizza = true, pizzaPricingRule = "MAIOR_SABOR", sizes = [], flavors = [] } = req.body || {};

    const product = await prisma.product.findUnique({ where: { id: req.params.id } });
    if (!product || product.tenantId !== tenantId) return res.status(404).json({ error: "Produto nao encontrado" });

    const sizeNames = new Set();
    const preparedSizes = [];
    for (let i = 0; i < sizes.length; i += 1) {
      const s = sizes[i];
      if (!s?.name) return res.status(400).json({ error: "size.name obrigatorio" });
      const key = String(s.name).toLowerCase();
      if (sizeNames.has(key)) return res.status(400).json({ error: "Tamanho duplicado" });
      sizeNames.add(key);
      preparedSizes.push({
        id: randomUUID(),
        tenantId,
        productId: product.id,
        name: String(s.name),
        maxFlavors: Number(s.maxFlavors || 1),
        active: s.active == null ? true : Boolean(s.active),
        sort: Number(s.sort ?? i)
      });
    }

    const flavorNames = new Set();
    const preparedFlavors = [];
    const preparedPrices = [];
    const sizeIdByName = new Map(preparedSizes.map((s) => [s.name.toLowerCase(), s.id]));
    for (let i = 0; i < flavors.length; i += 1) {
      const f = flavors[i];
      if (!f?.name) return res.status(400).json({ error: "flavor.name obrigatorio" });
      const key = String(f.name).toLowerCase();
      if (flavorNames.has(key)) return res.status(400).json({ error: "Sabor duplicado" });
      flavorNames.add(key);
      const flavorId = randomUUID();
      preparedFlavors.push({
        id: flavorId,
        tenantId,
        productId: product.id,
        name: String(f.name),
        description: f.description == null || f.description === "" ? null : String(f.description),
        active: f.active == null ? true : Boolean(f.active),
        sort: Number(f.sort ?? i)
      });

      const prices = f.prices || {};
      for (const [sizeName, rawPrice] of Object.entries(prices)) {
        const sizeId = sizeIdByName.get(String(sizeName).toLowerCase());
        if (!sizeId || rawPrice == null || rawPrice === "") continue;
        const parsedPrice = parsePriceNumber(rawPrice);
        if (!Number.isFinite(parsedPrice)) {
          return res.status(400).json({ error: `Preco invalido para sabor "${f.name}" no tamanho "${sizeName}"` });
        }
        preparedPrices.push({
          id: randomUUID(),
          tenantId,
          flavorId,
          sizeId,
          price: parsedPrice
        });
      }
    }

    await prisma.$transaction(async (tx) => {
      await tx.product.update({
        where: { id: product.id },
        data: {
          isPizza: Boolean(isPizza),
          pizzaPricingRule
        }
      });

      await tx.productPizzaFlavorPrice.deleteMany({ where: { tenantId, flavor: { productId: product.id } } });
      await tx.productPizzaFlavor.deleteMany({ where: { tenantId, productId: product.id } });
      await tx.productPizzaSize.deleteMany({ where: { tenantId, productId: product.id } });

      if (preparedSizes.length > 0) {
        await tx.productPizzaSize.createMany({ data: preparedSizes });
      }
      if (preparedFlavors.length > 0) {
        await tx.productPizzaFlavor.createMany({ data: preparedFlavors });
      }
      if (preparedPrices.length > 0) {
        await tx.productPizzaFlavorPrice.createMany({ data: preparedPrices });
      }
    }, { timeout: 15000, maxWait: 10000 });

    const saved = await prisma.product.findUnique({
      where: { id: product.id },
      include: {
        pizzaSizes: { where: { tenantId }, orderBy: [{ sort: "asc" }, { name: "asc" }] },
        pizzaFlavors: {
          where: { tenantId },
          orderBy: [{ sort: "asc" }, { name: "asc" }],
          include: { prices: { include: { size: true } } }
        }
      }
    });

    const flavorsOut = (saved.pizzaFlavors || []).map((f) => ({
      id: f.id,
      name: f.name,
      description: f.description || null,
      active: f.active,
      sort: f.sort,
      prices: Object.fromEntries((f.prices || []).map((p) => [p.size.name, p.price]))
    }));

    return res.json({
      productId: saved.id,
      isPizza: saved.isPizza,
      pizzaPricingRule: saved.pizzaPricingRule,
      sizes: saved.pizzaSizes,
      flavors: flavorsOut
    });
  } catch (error) {
    if (error?.message?.startsWith("Preco invalido")) {
      return res.status(400).json({ error: error.message });
    }
    return res.status(500).json({ error: error?.message || "Erro ao salvar configuracao de pizza" });
  }
});

// GET /api/products/:id/recipe
router.get("/:id/recipe", auth, async (req, res) => {
  const tenantId = req.user.tenantId;
  const product = await prisma.product.findUnique({
    where: { id: req.params.id },
    include: {
      recipeItems: {
        include: { inventoryItem: true, ingredientProduct: true }
      }
    }
  });

  if (!product || product.tenantId !== tenantId) {
    return res.status(404).json({ error: "Produto nao encontrado" });
  }

  const items = (product.recipeItems || [])
    .filter((r) => {
      if (r.inventoryItemId) return r.inventoryItem?.tenantId === tenantId;
      if (r.ingredientProductId) return r.ingredientProduct?.tenantId === tenantId;
      return false;
    })
    .map(formatRecipeItem)
    .sort((a, b) => a.sourceName.localeCompare(b.sourceName, "pt-BR"));

  const totalCost = items.reduce((sum, it) => sum + it.lineCost, 0);

  res.json({
    productId: product.id,
    productName: product.name,
    unit: product.unit || "UN",
    totalCost,
    items
  });
});

// PUT /api/products/:id/recipe
router.put("/:id/recipe", auth, async (req, res) => {
  const tenantId = req.user.tenantId;
  const { items = [] } = req.body || {};
  if (!Array.isArray(items)) return res.status(400).json({ error: "items deve ser array" });

  const product = await prisma.product.findUnique({ where: { id: req.params.id } });
  if (!product || product.tenantId !== tenantId) {
    return res.status(404).json({ error: "Produto nao encontrado" });
  }

  const normalized = [];
  const dedupe = new Set();
  for (const raw of items) {
    const inventoryItemId = raw?.inventoryItemId ? String(raw.inventoryItemId).trim() : "";
    const ingredientProductId = raw?.ingredientProductId ? String(raw.ingredientProductId).trim() : "";
    if (!inventoryItemId && !ingredientProductId) {
      return res.status(400).json({ error: "Informe inventoryItemId ou ingredientProductId" });
    }
    if (inventoryItemId && ingredientProductId) {
      return res.status(400).json({ error: "Cada linha deve ter apenas 1 origem (insumo ou produto base)" });
    }
    if (ingredientProductId === product.id) {
      return res.status(400).json({ error: "Produto nao pode ser ingrediente dele mesmo" });
    }

    const dedupeKey = inventoryItemId ? `INV:${inventoryItemId}` : `PROD:${ingredientProductId}`;
    if (dedupe.has(dedupeKey)) return res.status(400).json({ error: "Ingrediente duplicado na ficha tecnica" });
    dedupe.add(dedupeKey);

    const quantity = Number(raw?.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      return res.status(400).json({ error: "quantity deve ser numero maior que zero" });
    }
    normalized.push({ inventoryItemId: inventoryItemId || null, ingredientProductId: ingredientProductId || null, quantity });
  }

  try {
    await prisma.$transaction(async (tx) => {
      const inventoryIds = normalized.map((it) => it.inventoryItemId).filter(Boolean);
      if (inventoryIds.length > 0) {
        const found = await tx.inventoryItem.findMany({
          where: { tenantId, id: { in: inventoryIds } },
          select: { id: true }
        });
        if (found.length !== inventoryIds.length) {
          throw new Error("Um ou mais insumos nao pertencem ao tenant");
        }
      }

      const ingredientProductIds = normalized.map((it) => it.ingredientProductId).filter(Boolean);
      if (ingredientProductIds.length > 0) {
        const foundProducts = await tx.product.findMany({
          where: { tenantId, id: { in: ingredientProductIds } },
          select: { id: true }
        });
        if (foundProducts.length !== ingredientProductIds.length) {
          throw new Error("Um ou mais produtos base nao pertencem ao tenant");
        }
      }

      await tx.recipeItem.deleteMany({ where: { productId: product.id } });

      if (normalized.length > 0) {
        await tx.recipeItem.createMany({
          data: normalized.map((it) => ({
            productId: product.id,
            inventoryItemId: it.inventoryItemId,
            ingredientProductId: it.ingredientProductId,
            quantity: it.quantity
          }))
        });
      }

      const recipeRows = await tx.recipeItem.findMany({
        where: { productId: product.id },
        include: { inventoryItem: true, ingredientProduct: true }
      });
      const calculatedCost = recipeRows.reduce(
        (sum, row) =>
          sum + Number(row.quantity || 0) * Number(row.inventoryItem?.cost ?? row.ingredientProduct?.cost ?? 0),
        0
      );

      await tx.product.update({
        where: { id: product.id },
        data: { cost: calculatedCost }
      });
    });
  } catch (error) {
    return res.status(400).json({ error: error.message || "Falha ao salvar ficha tecnica" });
  }

  const recipe = await prisma.recipeItem.findMany({
    where: { productId: product.id },
    include: { inventoryItem: true, ingredientProduct: true }
  });

  const outItems = recipe
    .filter((r) => {
      if (r.inventoryItemId) return r.inventoryItem?.tenantId === tenantId;
      if (r.ingredientProductId) return r.ingredientProduct?.tenantId === tenantId;
      return false;
    })
    .map(formatRecipeItem);

  const totalCost = outItems.reduce((sum, it) => sum + it.lineCost, 0);
  res.json({ ok: true, productId: product.id, totalCost, items: outItems });
});

module.exports = router;
