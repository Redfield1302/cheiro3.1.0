import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getProduct } from "../lib/api";

const money = (n) =>
  Number(n || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });

function normalizeGroups(product) {
  const groups = Array.isArray(product?.modifierGroups) ? product.modifierGroups : [];
  return groups
    .filter((group) => group?.active !== false && Array.isArray(group.options))
    .map((group) => ({
      id: group.id,
      name: group.name,
      type: group.type,
      minSelect: Number(group.minSelect || 0),
      maxSelect: Number(group.maxSelect || 0),
      required: Boolean(group.required),
      options: group.options
        .filter((option) => option?.active !== false)
        .map((option) => ({
          id: option.id,
          name: option.name,
          price: Number(option.price || 0),
          groupId: group.id,
          groupName: group.name
        }))
    }));
}

function buildFraction(partsCount) {
  if (partsCount <= 1) return "1/1";
  if (partsCount === 2) return "1/2";
  if (partsCount === 3) return "1/3";
  if (partsCount === 4) return "1/4";
  return `1/${partsCount}`;
}

export default function Product() {
  const { slug, id } = useParams();
  const nav = useNavigate();
  const [product, setProduct] = useState(null);
  const [qty, setQty] = useState(1);
  const [notes, setNotes] = useState("");
  const [err, setErr] = useState("");
  const [selected, setSelected] = useState({});
  const [pizzaSizeName, setPizzaSizeName] = useState("");
  const [pizzaFlavorNames, setPizzaFlavorNames] = useState([]);

  useEffect(() => {
    getProduct(slug, id)
      .then((res) => {
        setProduct(res.product);
        setSelected({});
        const firstSize = Array.isArray(res.product?.pizzaSizes) ? res.product.pizzaSizes[0] : null;
        setPizzaSizeName(firstSize?.name || "");
        setPizzaFlavorNames([]);
      })
      .catch((e) => setErr(e.message));
  }, [slug, id]);

  const groups = useMemo(() => normalizeGroups(product), [product]);
  const hasGroups = groups.length > 0;
  const removeGroups = groups.filter((group) => group.type === "REMOVE");
  const addGroups = groups.filter((group) => group.type !== "REMOVE");

  const pizzaSizes = useMemo(
    () => (Array.isArray(product?.pizzaSizes) ? product.pizzaSizes : []),
    [product]
  );
  const pizzaFlavors = useMemo(
    () => (Array.isArray(product?.pizzaFlavors) ? product.pizzaFlavors : []),
    [product]
  );
  const selectedPizzaSize = useMemo(
    () => pizzaSizes.find((size) => String(size.name) === String(pizzaSizeName)) || null,
    [pizzaSizes, pizzaSizeName]
  );
  const maxPizzaFlavors = Number(selectedPizzaSize?.maxFlavors || 1);

  const pizzaFlavorOptions = useMemo(() => {
    return pizzaFlavors.map((flavor) => {
      const row = (flavor.prices || []).find((p) => String(p?.size?.name) === String(pizzaSizeName));
      return {
        id: flavor.id,
        name: flavor.name,
        description: flavor.description || "",
        price: Number(row?.price || 0)
      };
    });
  }, [pizzaFlavors, pizzaSizeName]);

  const selectedOptions = useMemo(() => {
    const list = [];
    groups.forEach((group) => {
      const inGroup = selected[group.id] || [];
      const map = new Map(group.options.map((opt) => [opt.id, opt]));
      inGroup.forEach((optionId) => {
        const found = map.get(optionId);
        if (found) list.push(found);
      });
    });
    return list;
  }, [groups, selected]);

  const pizzaValue = useMemo(() => {
    if (!product?.isPizza || !pizzaFlavorNames.length) return Number(product?.price || 0);
    const selectedPrices = pizzaFlavorOptions
      .filter((f) => pizzaFlavorNames.includes(f.name))
      .map((f) => Number(f.price || 0));
    if (!selectedPrices.length) return Number(product?.price || 0);

    if (product?.pizzaPricingRule === "PROPORCIONAL") {
      const fraction = 1 / selectedPrices.length;
      const sum = selectedPrices.reduce((acc, p) => acc + p * fraction, 0);
      return Number(sum.toFixed(2));
    }

    return Math.max(...selectedPrices);
  }, [pizzaFlavorNames, pizzaFlavorOptions, product]);

  const optionsTotal = useMemo(() => selectedOptions.reduce((sum, opt) => sum + Number(opt.price || 0), 0), [selectedOptions]);
  const linePrice = (product?.isPizza ? pizzaValue : Number(product?.price || 0)) + optionsTotal;
  const total = linePrice * qty;

  function toggleOption(group, optionId) {
    const current = selected[group.id] || [];
    const exists = current.includes(optionId);
    let next;

    if (exists) {
      next = current.filter((id) => id !== optionId);
    } else {
      const limit = Number(group.maxSelect || 0);
      if (limit > 0 && current.length >= limit) return;
      next = [...current, optionId];
    }

    setSelected((prev) => ({ ...prev, [group.id]: next }));
  }

  function addToCart() {
    if (!product) return;
    if (product.isPizza) {
      if (!pizzaSizeName) {
        setErr("Selecione o tamanho da pizza.");
        return;
      }
      if (!pizzaFlavorNames.length) {
        setErr("Selecione ao menos 1 sabor.");
        return;
      }
    }

    const missingRequired = groups.some((group) => group.required && (selected[group.id] || []).length < Number(group.minSelect || 1));
    if (missingRequired) {
      setErr("Selecione as opcoes obrigatorias antes de adicionar.");
      return;
    }

    const modifiers = selectedOptions.map((opt) => ({
      groupId: opt.groupId,
      groupName: opt.groupName,
      optionId: opt.id,
      name: opt.name,
      quantity: 1,
      price: Number(opt.price || 0)
    }));

    const cart = JSON.parse(localStorage.getItem("cg_cart") || "[]");
    const pizzaPayload = product.isPizza
      ? {
          sizeName: pizzaSizeName,
          parts: pizzaFlavorNames.map((flavorName) => ({
            fraction: buildFraction(pizzaFlavorNames.length),
            flavorName
          }))
        }
      : null;

    cart.push({
      productId: product.id,
      name: product.isPizza ? `${product.name} (${pizzaSizeName})` : product.name,
      price: linePrice,
      basePrice: Number(product.price || 0),
      quantity: qty,
      notes: notes.trim() || null,
      modifiers,
      pizza: pizzaPayload
    });
    localStorage.setItem("cg_cart", JSON.stringify(cart));
    nav(`/t/${slug}/cart`);
  }

  function togglePizzaFlavor(flavorName) {
    const exists = pizzaFlavorNames.includes(flavorName);
    if (exists) {
      setPizzaFlavorNames((prev) => prev.filter((n) => n !== flavorName));
      return;
    }
    if (pizzaFlavorNames.length >= maxPizzaFlavors) return;
    setPizzaFlavorNames((prev) => [...prev, flavorName]);
  }

  function renderGroup(group) {
    const count = (selected[group.id] || []).length;
    return (
      <section key={group.id} className="m-custom-group">
        <div className="m-custom-head">
          <div className="m-custom-title">{group.name}</div>
          <div className="m-muted">
            Selecione ate {group.maxSelect} • {count}/{group.maxSelect}
          </div>
        </div>
        <div className="m-custom-list">
          {group.options.map((opt) => {
            const active = (selected[group.id] || []).includes(opt.id);
            const disabled = !active && group.maxSelect > 0 && count >= group.maxSelect;
            return (
              <button
                key={opt.id}
                type="button"
                className={`m-custom-option ${active ? "active" : ""}`}
                onClick={() => toggleOption(group, opt.id)}
                disabled={disabled}
              >
                <div>
                  <div className="m-custom-name">{opt.name}</div>
                  {opt.price > 0 ? <div className="m-custom-price">+{money(opt.price)}</div> : null}
                </div>
                <span className="m-custom-toggle">{active ? "-" : "+"}</span>
              </button>
            );
          })}
        </div>
      </section>
    );
  }

  return (
    <div className="m-app">
      <header className="m-header m-header-minimal">
        <div className="m-header-row">
          <button className="m-icon-btn" onClick={() => nav(-1)} aria-label="Voltar">
            ✕
          </button>
          <div className="m-title-ellipsis">{product?.name || "Produto"}</div>
          <button className="m-icon-btn" onClick={() => nav(`/t/${slug}/cart`)} aria-label="Carrinho">
            🛒
          </button>
        </div>
      </header>

      <main className="m-body m-product-body">
        {err ? <div className="m-surface">{err}</div> : null}
        {product ? (
          <>
            <section className="m-surface">
              {product.imageUrl ? <img className="m-product-image" src={product.imageUrl} alt={product.name} /> : null}
              <div className="m-product-name">{product.name}</div>
              <div className="m-product-line">
                <span className="m-product-price">{money(linePrice)}</span>
                <span className="m-muted">Base {money(product.price)}</span>
              </div>
              {product.description ? <p className="m-product-desc">{product.description}</p> : null}
            </section>

            {product.isPizza ? (
              <section className="m-surface">
                <div className="m-custom-head">
                  <div className="m-custom-title">Monte seu pedido</div>
                  <div className="m-muted">
                    Selecione tamanho e sabores
                  </div>
                </div>

                <div className="m-field-group">
                  <label className="m-label">Tamanho</label>
                  <select
                    className="m-select"
                    value={pizzaSizeName}
                    onChange={(e) => {
                      setPizzaSizeName(e.target.value);
                      setPizzaFlavorNames([]);
                    }}
                  >
                    {pizzaSizes.map((size) => (
                      <option key={size.id || size.name} value={size.name}>
                        {size.name} (ate {size.maxFlavors} sabores)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="m-muted">
                  Sabores selecionados: <b>{pizzaFlavorNames.length}</b>/{maxPizzaFlavors}
                </div>
                <div className="m-custom-list" style={{ marginTop: 8 }}>
                  {pizzaFlavorOptions.map((flavor) => {
                    const active = pizzaFlavorNames.includes(flavor.name);
                    const disabled = !active && pizzaFlavorNames.length >= maxPizzaFlavors;
                    return (
                      <button
                        key={flavor.id || flavor.name}
                        type="button"
                        className={`m-custom-option ${active ? "active" : ""}`}
                        onClick={() => togglePizzaFlavor(flavor.name)}
                        disabled={disabled}
                      >
                        <div>
                          <div className="m-custom-name">{flavor.name}</div>
                          {flavor.description ? <div className="m-custom-desc">{flavor.description}</div> : null}
                          <div className="m-custom-price">{money(flavor.price)}</div>
                        </div>
                        <span className="m-custom-toggle">{active ? "-" : "+"}</span>
                      </button>
                    );
                  })}
                </div>
              </section>
            ) : null}

            {hasGroups ? (
              <>
                {removeGroups.length ? (
                  <section className="m-custom-block">
                    <h3 className="m-custom-block-title">Deseja remover algum ingrediente?</h3>
                    {removeGroups.map(renderGroup)}
                  </section>
                ) : null}

                {addGroups.length ? (
                  <section className="m-custom-block">
                    <h3 className="m-custom-block-title">Deseja adicionar algum ingrediente?</h3>
                    {addGroups.map(renderGroup)}
                  </section>
                ) : null}
              </>
            ) : (
              <section className="m-surface">
                <div className="m-muted">Este produto nao tem opcoes de personalizacao.</div>
              </section>
            )}

            <section className="m-surface">
              <label className="m-label" htmlFor="notes">
                Observacoes do pedido
              </label>
              <textarea
                id="notes"
                className="m-textarea"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ex: sem cebola, caprichar no molho"
              />
            </section>
          </>
        ) : null}
      </main>

      <footer className="m-bottom-nav">
        <div className="m-bottom-row">
          <div className="m-qty">
            <button className="m-qty-btn" onClick={() => setQty((v) => Math.max(1, v - 1))}>
              -
            </button>
            <strong>{qty}</strong>
            <button className="m-qty-btn" onClick={() => setQty((v) => v + 1)}>
              +
            </button>
          </div>
          <button className="m-primary" onClick={addToCart} disabled={!product}>
            Adicionar • {money(total)}
          </button>
        </div>
      </footer>
    </div>
  );
}
