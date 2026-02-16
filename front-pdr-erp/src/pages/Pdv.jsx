import { useEffect, useMemo, useState } from "react";
import { addItem, checkout, createCart, getCart, listPdvProducts, listCategories, removeItem } from "../lib/api";
import PageState from "../components/PageState.jsx";

const money = (n) => Number(n||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});

export default function Pdv() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [cartId, setCartId] = useState("");
  const [cart, setCart] = useState(null);
  const [pay, setPay] = useState("PIX");
  const [search, setSearch] = useState("");
  const [catId, setCatId] = useState("ALL");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const total = useMemo(()=>Number(cart?.total||0),[cart]);

  async function init() {
    setErr("");
    setLoading(true);
    try {
      const [ps, cs, c] = await Promise.all([
        listPdvProducts(),
        listCategories({ active: "true" }).catch(()=>[]),
        createCart()
      ]);
      setProducts(ps);
      setCategories(cs);
      setCartId(c.cartId);
      setCart(await getCart(c.cartId));
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

  useEffect(()=>{ init(); },[]);

  const filtered = products.filter(p => {
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

  return (
    <div className="grid" style={{ gap: 20 }}>
      <PageState loading={loading} error={err} />

      <div className="inline">
        <input className="input" placeholder="Buscar produto" value={search} onChange={(e)=>setSearch(e.target.value)} />
        <select className="select" value={catId} onChange={(e)=>setCatId(e.target.value)} style={{ maxWidth: 260 }}>
          <option value="ALL">Todas categorias</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select className="select" value={pay} onChange={(e)=>setPay(e.target.value)} style={{ maxWidth: 160 }}>
          <option value="PIX">PIX</option>
          <option value="CASH">Dinheiro</option>
          <option value="CREDIT">Credito</option>
          <option value="DEBIT">Debito</option>
          <option value="MEAL_VOUCHER">Vale</option>
        </select>
        <button className="btn" onClick={init}>Novo carrinho</button>
      </div>

      <div className="grid grid-2">
        <div className="card">
          <div className="section-title">Catalogo</div>
          <div className="grid grid-3" style={{ marginTop: 12 }}>
            {filtered.map(p => (
              <div key={p.id} className="card" style={{ padding: 12 }}>
                <b>{p.name}</b>
                <div className="muted" style={{ fontSize: 12 }}>{p.categoryRef?.name || ""}</div>
                <div style={{ marginTop: 6 }}>{money(p.price)}</div>
                <button className="btn btn-primary" style={{ marginTop: 8 }}
                  onClick={()=>addItem(cartId,p.id,1).then(refresh).catch(e=>setErr(e.message))}>
                  Adicionar
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="section-title">Carrinho</div>
          <div className="muted" style={{ fontSize: 12 }}>cartId: {cartId}</div>
          <div className="list" style={{ marginTop: 10 }}>
            {cart?.items?.map(it => (
              <div key={it.id} className="card" style={{ padding: 10 }}>
                <b>{it.name}</b> <span className="muted">x{it.quantity}</span>
                <div>{money(it.totalPrice)}</div>
                <div className="inline" style={{ marginTop: 8 }}>
                  <button className="btn" onClick={()=>decItem(it).catch(e=>setErr(e.message))}>-</button>
                  <button className="btn" onClick={()=>addItem(cartId,it.productId,1).then(refresh).catch(e=>setErr(e.message))}>+</button>
                  <button className="btn" onClick={()=>removeItem(cartId,it.id).then(refresh).catch(e=>setErr(e.message))}>Remover</button>
                </div>
              </div>
            ))}
          </div>

          <div className="inline" style={{ justifyContent: "space-between", marginTop: 12 }}>
            <b>Total</b><b>{money(total)}</b>
          </div>

          <button
            className="btn btn-primary"
            disabled={!cart?.items?.length}
            onClick={()=>checkout(cartId,pay).then(()=>{ window.print(); init(); }).catch(e=>setErr(e.message))}
            style={{ width: "100%", marginTop: 12 }}
          >
            Finalizar venda
          </button>

          <div className="section-title" style={{ marginTop: 16 }}>Historico rapido</div>
          <div className="state" style={{ marginTop: 8 }}>Em breve: ultimas vendas do dia.</div>
        </div>
      </div>
    </div>
  );
}
