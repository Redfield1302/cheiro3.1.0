function toLower(v) {
  return String(v || "").trim().toLowerCase();
}

function parseFraction(value, totalParts) {
  const raw = String(value || "").trim();
  if (!raw) {
    if (totalParts <= 1) return { text: "1/1", den: 1 };
    return { text: `1/${totalParts}`, den: totalParts };
  }
  const m = raw.match(/^1\/(1|2|3|4)$/);
  if (!m) throw new Error("Fracao invalida. Use 1/2, 1/3 ou 1/4");
  const den = Number(m[1]);
  return { text: `1/${den}`, den };
}

function validateParts(parts, maxFlavors) {
  if (!Array.isArray(parts) || parts.length === 0) {
    throw new Error("Selecao de sabores obrigatoria para pizza");
  }

  const fractions = parts.map((p) => p.fractionParsed);
  const denSet = new Set(fractions.map((f) => f.den));
  if (denSet.size > 1) throw new Error("Todas as fracoes devem ser iguais");

  const den = fractions[0].den;
  if (![1, 2, 3, 4].includes(den)) throw new Error("Fracao nao suportada");
  if (parts.length !== den) throw new Error(`Para 1/${den}, informe ${den} sabores`);
  if (den > Number(maxFlavors || 1)) throw new Error("Quantidade de sabores excede o permitido no tamanho");

  return den;
}

async function calculatePizzaLine(tx, { tenantId, product, quantity, pizza }) {
  if (!pizza) throw new Error("Produto pizza exige selecao de tamanho e sabores");

  const loaded = await tx.product.findUnique({
    where: { id: product.id },
    include: {
      pizzaSizes: { where: { tenantId, active: true } },
      pizzaFlavors: {
        where: { tenantId, active: true },
        include: { prices: true }
      }
    }
  });

  if (!loaded) throw new Error("Produto nao encontrado");

  const sizeName = String(pizza.sizeName || pizza.size || "").trim();
  if (!sizeName) throw new Error("Tamanho da pizza obrigatorio");

  const size = loaded.pizzaSizes.find((s) => toLower(s.name) === toLower(sizeName));
  if (!size) throw new Error("Tamanho selecionado nao existe para este produto");

  const rawParts = Array.isArray(pizza.parts) ? pizza.parts : [];
  const parts = rawParts.map((p) => {
    const flavorName = String(p.flavorName || p.name || "").trim();
    if (!flavorName) throw new Error("Sabor obrigatorio");
    return {
      flavorName,
      fractionParsed: parseFraction(p.fraction, rawParts.length)
    };
  });

  const denominator = validateParts(parts, size.maxFlavors);

  const pricedParts = parts.map((p) => {
    const flavor = loaded.pizzaFlavors.find((f) => toLower(f.name) === toLower(p.flavorName));
    if (!flavor) throw new Error(`Sabor nao encontrado: ${p.flavorName}`);

    const priceRow = (flavor.prices || []).find((pr) => pr.sizeId === size.id);
    if (!priceRow) throw new Error(`Preco nao definido para sabor ${flavor.name} no tamanho ${size.name}`);

    return {
      flavorId: flavor.id,
      flavorName: flavor.name,
      fraction: p.fractionParsed.text,
      den: p.fractionParsed.den,
      fullPrice: Number(priceRow.price)
    };
  });

  let unitPrice = 0;
  if (loaded.pizzaPricingRule === "PROPORCIONAL") {
    unitPrice = pricedParts.reduce((sum, p) => sum + p.fullPrice / p.den, 0);
  } else {
    unitPrice = Math.max(...pricedParts.map((p) => p.fullPrice));
  }

  const q = Number(quantity || 1);
  const totalPrice = unitPrice * q;

  const modifiers = pricedParts.map((p) => ({
    groupName: `Pizza ${size.name}`,
    name: `${p.fraction} ${p.flavorName}`,
    quantity: 1,
    price: p.fullPrice,
    groupId: null,
    optionId: p.flavorId
  }));

  const flavorsText = pricedParts.map((p) => `${p.fraction} ${p.flavorName}`).join(" | ");

  return {
    name: `${product.name} (${size.name})`,
    unitPrice,
    totalPrice,
    notesSuffix: `Pizza ${size.name} ${denominator > 1 ? `(${flavorsText})` : `(${pricedParts[0].flavorName})`}`,
    modifiers
  };
}

module.exports = { calculatePizzaLine };
