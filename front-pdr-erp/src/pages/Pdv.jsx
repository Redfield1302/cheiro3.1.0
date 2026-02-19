import { useEffect, useMemo, useRef, useState } from "react";
import { addItem, checkout, createCart, getCart, getPizzaConfig, listCategories, listPdvProducts, removeItem } from "../lib/api";
import PageState from "../components/PageState.jsx";
import { useToast } from "../components/ui/Toast.jsx";
import { Modal } from "../components/ui/Modal.jsx";

const money = (n) => Number(n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const moneyPlain = (n) => Number(n || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const MODES = [
  { id: "RAPIDA", label: "Venda Rapida" },
  { id: "DELIVERY", label: "Venda Delivery" },
  { id: "BALCAO", label: "Venda Balcao" }
];

const ORDER_STATUS = [
  "Iniciado",
  "Aguardando / Em espera",
  "Saiu para entrega",
  "Finalizado / Entregue"
];

export default function Pdv() {
  const toast = useToast();
  const searchRef = useRef(null);

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [cartId, setCartId] = useState("");
  const [cart, setCart] = useState(null);
  const [pay, setPay] = useState("PIX");
  const [search, setSearch] = useState("");
  const [catId, setCatId] = useState("ALL");
  const [mode, setMode] = useState("RAPIDA");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [customerReference, setCustomerReference] = useState("");
  const [comanda, setComanda] = useState("");
  const [deliveryPerson, setDeliveryPerson] = useState("Renato Almeida");
  const [statusStep, setStatusStep] = useState(0);
  const [startedAt, setStartedAt] = useState(Date.now());
  const [nowTick, setNowTick] = useState(Date.now());

  const [history, setHistory] = useState([]);
  const [pizzaOpen, setPizzaOpen] = useState(false);
  const [pizzaLoading, setPizzaLoading] = useState(false);
  const [pizzaErr, setPizzaErr] = useState("");
  const [pizzaProduct, setPizzaProduct] = useState(null);
  const [pizzaSizes, setPizzaSizes] = useState([]);
  const [pizzaFlavors, setPizzaFlavors] = useState([]);
  const [pizzaSizeName, setPizzaSizeName] = useState("");
  const [pizzaSelected, setPizzaSelected] = useState([]);

  const total = useMemo(() => Number(cart?.total || 0), [cart]);
  const subtotal = useMemo(() => Number(cart?.subtotal || 0), [cart]);
  const deliveryFee = useMemo(() => 0, []);
  const totalWithDelivery = useMemo(() => subtotal + deliveryFee, [subtotal, deliveryFee]);

  async function init() {
    setErr("");
    setLoading(true);
    try {
      const [ps, cs, c] = await Promise.all([
        listPdvProducts(),
        listCategories({ active: "true" }).catch(() => []),
        createCart()
      ]);
      setProducts(ps);
      setCategories(cs);
      setCartId(c.cartId);
      setCart(await getCart(c.cartId));
      setSearch("");
      setCatId("ALL");
      setComanda(String(Math.floor(Math.random() * 900) + 100));
      setStartedAt(Date.now());
      setStatusStep(0);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function refresh() {
    if (!cartId) return;
    setCart(await getCart(cartId));
  }

  useEffect(() => {
    init();
    setHistory(JSON.parse(localStorage.getItem("cg_pdv_history") || "[]"));
  }, []);

  useEffect(() => {
    if (searchRef.current) searchRef.current.focus();
  }, [mode]);

  const runningTime = useMemo(() => {
    const elapsed = Math.floor((nowTick - startedAt) / 1000);
    const min = Math.floor(elapsed / 60);
    const sec = elapsed % 60;
    return `${String(min).padStart(2, "0")}m${String(sec).padStart(2, "0")}s`;
  }, [nowTick, startedAt, cartId, loading]);

  useEffect(() => {
    const id = setInterval(() => {
      setNowTick(Date.now());
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const filtered = products.filter((p) => {
    const byCat = catId === "ALL" ? true : p.categoryId === catId;
    const bySearch = (p.name || "").toLowerCase().includes(search.toLowerCase());
    return byCat && bySearch;
  });

  async function decItem(it) {
    if (it.quantity <= 1) {
      await removeItem(cartId, it.id);
      return refresh();
    }
    await removeItem(cartId, it.id);
    await addItem(cartId, it.productId, it.quantity - 1);
    return refresh();
  }

  function saveHistory(entry) {
    const next = [entry, ...history].slice(0, 5);
    setHistory(next);
    localStorage.setItem("cg_pdv_history", JSON.stringify(next));
  }

  async function onSelectProduct(product) {
    if (!product?.isPizza) {
      return addItem(cartId, product.id, 1).then(refresh).catch((e) => setErr(e.message));
    }

    setPizzaOpen(true);
    setPizzaLoading(true);
    setPizzaErr("");
    setPizzaProduct(product);
    setPizzaSelected([]);
    try {
      const cfg = await getPizzaConfig(product.id);
      const sizes = cfg.sizes || [];
      setPizzaSizes(sizes);
      setPizzaFlavors(cfg.flavors || []);
      setPizzaSizeName(sizes[0]?.name || "");
    } catch (e) {
      setPizzaErr(e.message);
    } finally {
      setPizzaLoading(false);
    }
  }

  const selectedSize = useMemo(
    () => pizzaSizes.find((s) => String(s.name) === String(pizzaSizeName)) || null,
    [pizzaSizes, pizzaSizeName]
  );

  const maxFlavors = Number(selectedSize?.maxFlavors || 1);

  const flavorOptions = useMemo(() => {
    return pizzaFlavors.map((f) => ({
      name: f.name,
      description: f.description || "",
      price: Number((f.prices || {})[pizzaSizeName] || 0)
    }));
  }, [pizzaFlavors, pizzaSizeName]);

  const pizzaValue = useMemo(() => {
    if (!pizzaSelected.length) return 0;
    const values = flavorOptions
      .filter((f) => pizzaSelected.includes(f.name))
      .map((f) => Number(f.price || 0));
    return values.length ? Math.max(...values) : 0;
  }, [flavorOptions, pizzaSelected]);

  function toggleFlavor(name) {
    setPizzaSelected((prev) => {
      if (prev.includes(name)) return prev.filter((n) => n !== name);
      if (prev.length >= maxFlavors) return prev;
      return [...prev, name];
    });
  }

  function buildFraction(count) {
    if (count <= 1) return "1/1";
    if (count === 2) return "1/2";
    if (count === 3) return "1/3";
    return "1/4";
  }

  async function confirmPizza() {
    if (!pizzaProduct) return;
    if (!pizzaSizeName) return setPizzaErr("Selecione o tamanho");
    if (!pizzaSelected.length) return setPizzaErr("Selecione ao menos 1 sabor");

    const fraction = buildFraction(pizzaSelected.length);
    const pizza = {
      sizeName: pizzaSizeName,
      parts: pizzaSelected.map((name) => ({ fraction, flavorName: name }))
    };

    try {
      await addItem(cartId, pizzaProduct.id, 1, pizza);
      await refresh();
      setPizzaOpen(false);
      setPizzaErr("");
      toast.success(`Pizza adicionada (${money(pizzaValue)})`);
    } catch (e) {
      setPizzaErr(e.message);
    }
  }

  async function sendToKitchen() {
    if (!cart?.items?.length) return;
    toast.success("Comanda enviada para cozinha");
    setStatusStep((prev) => Math.min(prev + 1, ORDER_STATUS.length - 1));
  }

  async function finalizeSale() {
    try {
      const closed = await checkout(cartId, pay, {
        customerName,
        customerPhone,
        customerAddress,
        customerReference,
        comanda,
        mode
      });
      saveHistory({
        id: closed.id,
        total: closed.total,
        createdAt: new Date().toISOString(),
        mode,
        payment: pay
      });
      setStatusStep(ORDER_STATUS.length - 1);
      window.print();
      init();
    } catch (e) {
      setErr(e.message);
      toast.error(e.message);
    }
  }

  return (
    <div className="pdv-shell">
      <div className="no-print">
        <PageState loading={loading} error={err} />

        <div className="pdv-mode-tabs">
          {MODES.map((m) => (
            <button key={m.id} className={`pdv-tab ${mode === m.id ? "active" : ""}`} onClick={() => setMode(m.id)}>
              {m.label}
            </button>
          ))}
          <div className="pdv-toolbar-actions">
            <button className="btn" title="Menu">Menu</button>
            <button className="btn" title="Novo carrinho" onClick={init}>Novo</button>
          </div>
        </div>

        <div className="pdv-layout">
          <aside className="card pdv-left-panel">
            <div className="pdv-left-title">({mode})</div>
            <div className="pdv-left-meta">Pedido N: {cartId ? cartId.slice(0, 8) : "--"}</div>
            <div className="pdv-left-meta">Tempo: {runningTime}</div>

            <div style={{ marginTop: 14 }} className="section-title">ENTREGADOR</div>
            <select className="select" value={deliveryPerson} onChange={(e) => setDeliveryPerson(e.target.value)}>
              <option value="Renato Almeida">Renato Almeida</option>
              <option value="Carlos">Carlos</option>
              <option value="Equipe">Equipe</option>
            </select>

            <div className="pdv-left-actions">
              <button className="btn" onClick={init}>Excluir Pedido</button>
              <button className="btn" onClick={() => window.location.assign("/orders")}>Sair (ESC)</button>
            </div>
          </aside>

        <section className="card pdv-center-panel">
          <div className="inline" style={{ alignItems: "stretch" }}>
            <input
              ref={searchRef}
              className="input"
              placeholder="Pesquisar produto"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="pdv-categories">
            <button className={`pdv-cat-chip ${catId === "ALL" ? "active" : ""}`} onClick={() => setCatId("ALL")}>Todas</button>
            {categories.map((c) => (
              <button key={c.id} className={`pdv-cat-chip ${catId === c.id ? "active" : ""}`} onClick={() => setCatId(c.id)}>
                {c.name}
              </button>
            ))}
          </div>

          <div className="pdv-products-grid">
            {filtered.map((p) => (
              <button
                key={p.id}
                className="pdv-product-card"
                onClick={() => onSelectProduct(p)}
              >
                <b>{p.name}</b>
                <span className="muted" style={{ fontSize: 12 }}>{p.categoryRef?.name || ""}</span>
                <span>{money(p.price)}</span>
                {p.isPizza ? <span className="muted" style={{ fontSize: 11 }}>Pizza fracionada</span> : null}
              </button>
            ))}
          </div>
        </section>

        <aside className="card pdv-right-panel">
          <div className="pdv-right-tabs">
            <button className={`pdv-mini-tab ${mode === "DELIVERY" ? "active" : ""}`} onClick={() => setMode("DELIVERY")}>Delivery</button>
            <button className="pdv-mini-tab" onClick={() => window.location.assign("/orders")}>Historico</button>
          </div>

          <div className="pdv-form-grid">
            <label>Telefone</label>
            <input className="input" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} />

            <label>Cliente</label>
            <input className="input" value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Nao informado" />

            <label>Endereco</label>
            <input className="input" value={customerAddress} onChange={(e) => setCustomerAddress(e.target.value)} />

            <label>Referencia</label>
            <input className="input" value={customerReference} onChange={(e) => setCustomerReference(e.target.value)} />

            <label>Comanda</label>
            <input className="input" value={comanda} onChange={(e) => setComanda(e.target.value)} />

            <label>Forma de pagamento</label>
            <select className="select" value={pay} onChange={(e) => setPay(e.target.value)}>
              <option value="PIX">PIX</option>
              <option value="CASH">Dinheiro</option>
              <option value="CREDIT">Credito</option>
              <option value="DEBIT">Debito</option>
              <option value="MEAL_VOUCHER">Vale</option>
            </select>
          </div>

          <div className="section-title" style={{ marginTop: 4 }}>Resumo do pedido</div>
          <div className="pdv-comanda-list">
            {(cart?.items || []).map((it) => (
              <div key={it.id} className="pdv-line-item">
                <div>
                  <b>{it.name}</b>
                  <div className="muted" style={{ fontSize: 12 }}>{it.quantity} x {money(it.unitPrice)}</div>
                </div>
                <div className="pdv-line-actions">
                  <button className="btn" onClick={() => decItem(it).catch((e) => setErr(e.message))}>-</button>
                  <button className="btn" onClick={() => addItem(cartId, it.productId, 1).then(refresh).catch((e) => setErr(e.message))}>+</button>
                  <button className="btn" onClick={() => removeItem(cartId, it.id).then(refresh).catch((e) => setErr(e.message))}>x</button>
                </div>
                <div>{money(it.totalPrice)}</div>
              </div>
            ))}
          </div>

          <div className="pdv-total-breakdown">
            <div>Subtotal: {money(subtotal)}</div>
            <div>Entrega: {money(deliveryFee)}</div>
            <div className="pdv-total-main">Total: {money(totalWithDelivery || total)}</div>
          </div>

          <div className="pdv-action-row">
            <button className="btn" disabled={!cart?.items?.length} onClick={() => window.print()}>Imprimir</button>
            <button className="btn" disabled={!cart?.items?.length} onClick={sendToKitchen}>Enviar cozinha</button>
            <button className="btn btn-primary" disabled={!cart?.items?.length} onClick={finalizeSale}>Pagamento / Finalizar</button>
          </div>

          <div className="section-title" style={{ marginTop: 12 }}>Status</div>
          <div className="pdv-status-list">
            {ORDER_STATUS.map((item, idx) => (
              <div key={item} className={`pdv-status-item ${idx === statusStep ? "active" : ""}`}>
                <span className="pdv-status-dot" />
                <span>{item}</span>
              </div>
            ))}
          </div>

          <div className="section-title" style={{ marginTop: 12 }}>Historico rapido</div>
          <div className="list" style={{ marginTop: 8 }}>
            {history.length === 0 ? <div className="state">Sem vendas recentes.</div> : history.map((h) => (
              <div key={h.id} className="state">
                {h.id.slice(0, 8)} - {money(h.total)} - {h.payment}
              </div>
            ))}
          </div>
          </aside>
        </div>
      </div>

      <section className="print-ticket print-only">
        <div className="print-ticket-title">SIMPLES CONFERENCIA DA CONTA</div>
        <div className="print-center">{new Date().toLocaleString()}</div>
        <div className="print-center">*** NAO E DOCUMENTO FISCAL ***</div>
        <hr />
        <div>{customerName || "Nao informado"}</div>
        <div>{customerPhone || "-"}</div>
        <div>{customerAddress || "-"}</div>
        <div>{customerReference || "-"}</div>
        <div>Comanda: {comanda || "-"}</div>
        <div>Entregador: {deliveryPerson || "-"}</div>
        <div className="print-center">(Pedido N.: {cartId ? cartId.slice(0, 8) : "--"})</div>
        <hr />
        <div className="print-head">
          <div>ITEM</div>
          <div>V.Unit</div>
          <div>Total</div>
        </div>
        {(cart?.items || []).map((it) => (
          <div key={it.id}>
            <div className="print-line-3">
              <div>{it.quantity} {it.name}</div>
              <div>{moneyPlain(it.unitPrice)}</div>
              <div>{moneyPlain(it.totalPrice)}</div>
            </div>
            {(it.modifiers || []).map((m) => (
              <div key={`${it.id}-${m.id || `${m.groupName}-${m.name}`}`} className="print-modifier-line">
                + {m.name}
              </div>
            ))}
            {it.notes && !(it.modifiers?.length && String(it.notes).toLowerCase().startsWith("pizza "))
              ? <div className="print-notes-line">obs: {it.notes}</div>
              : null}
          </div>
        ))}
        <hr />
        <div className="print-line"><b>TOTAL:</b><b>{moneyPlain(subtotal || 0)}</b></div>
        <div className="print-line"><b>+ ENTREGA:</b><b>{moneyPlain(deliveryFee || 0)}</b></div>
        <div className="print-line"><b>= TOTAL A PAGAR:</b><b>{moneyPlain(totalWithDelivery || total || 0)}</b></div>
        <div className="print-line"><b>PAGAMENTO:</b><b>{pay}</b></div>
        <hr />
        <div>Usuario: {customerName || "operador"}</div>
        <div className="print-center">* Obrigado pela preferencia! *</div>
      </section>

      <Modal open={pizzaOpen} title={`Montar pizza - ${pizzaProduct?.name || ""}`} onClose={() => setPizzaOpen(false)}>
        <div className="grid">
          {pizzaLoading ? <div className="state">Carregando configuracao...</div> : null}
          {pizzaErr ? <div className="state error">{pizzaErr}</div> : null}

          {!pizzaLoading ? (
            <>
              <div className="inline">
                <div style={{ minWidth: 120 }}>Tamanho</div>
                <select className="select" value={pizzaSizeName} onChange={(e) => { setPizzaSizeName(e.target.value); setPizzaSelected([]); }}>
                  {pizzaSizes.map((s) => (
                    <option key={s.id || s.name} value={s.name}>{s.name} (ate {s.maxFlavors} sabores)</option>
                  ))}
                </select>
              </div>

              <div className="state">
                Tamanho: <b>{pizzaSizeName || "-"}</b> | Max sabores: <b>{maxFlavors}</b> | Selecionados: <b>{pizzaSelected.length}</b>
              </div>

              <div className="grid" style={{ gridTemplateColumns: "repeat(2, minmax(180px, 1fr))", gap: 8 }}>
                {flavorOptions.map((f) => {
                  const checked = pizzaSelected.includes(f.name);
                  const blocked = !checked && pizzaSelected.length >= maxFlavors;
                  return (
                    <label
                      key={f.name}
                      className="state"
                      style={{ opacity: blocked ? 0.6 : 1, cursor: blocked ? "not-allowed" : "pointer" }}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={blocked}
                        onChange={() => toggleFlavor(f.name)}
                        style={{ marginRight: 8 }}
                      />
                      <span>
                        {f.name} - {money(f.price)}
                        {f.description ? <span className="muted" style={{ display: "block", marginLeft: 22 }}>{f.description}</span> : null}
                      </span>
                    </label>
                  );
                })}
              </div>

              <div className="state">
                Valor da pizza (maior sabor): <b>{money(pizzaValue)}</b>
              </div>

              <div className="inline">
                <button className="btn btn-primary" onClick={confirmPizza}>Confirmar item</button>
                <button className="btn" onClick={() => setPizzaOpen(false)}>Cancelar</button>
              </div>
            </>
          ) : null}
        </div>
      </Modal>
    </div>
  );
}
