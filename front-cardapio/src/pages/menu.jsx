import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getCategories, getProducts, getTenant } from "../lib/api";

const money = (n) => Number(n||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});

export default function Menu() {
  const { slug } = useParams();
  const [tenant, setTenant] = useState(null);
  const [cats, setCats] = useState([]);
  const [catId, setCatId] = useState("");
  const [products, setProducts] = useState([]);
  const [err, setErr] = useState("");

  async function load() {
    setErr("");
    const t = await getTenant(slug);
    setTenant(t.tenant);
    const c = await getCategories(slug);
    setCats(c.categories);
    const first = c.categories?.[0]?.id || "";
    setCatId(first);
    const p = await getProducts(slug, first);
    setProducts(p.products);
  }

  useEffect(()=>{ load().catch(e=>setErr(e.message)); },[slug]);

  async function changeCategory(id) {
    setCatId(id);
    const p = await getProducts(slug, id);
    setProducts(p.products);
  }

  return (
    <div style={{ fontFamily:"system-ui", padding:16 }}>
      <h2>Cardápio — {tenant?.name || slug}</h2>
      {err ? <div style={{ background:"#ffecec", padding:10, borderRadius:10 }}>{err}</div> : null}

      <div style={{ display:"flex", gap:10, overflow:"auto", padding:"8px 0" }}>
        {cats.map(c=>(
          <button key={c.id} onClick={()=>changeCategory(c.id)} style={{ padding:10, borderRadius:10, border:"1px solid #ddd", background: c.id===catId ? "#f2f2f2" : "white" }}>
            {c.name}
          </button>
        ))}
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(2, 1fr)", gap:10, marginTop:10 }}>
        {products.map(p=>(
          <Link key={p.id} to={`/t/${slug}/p/${p.id}`} style={{ textDecoration:"none", color:"inherit" }}>
            <div style={{ border:"1px solid #ddd", padding:10, borderRadius:10 }}>
              <b>{p.name}</b>
              <div style={{ opacity:.7 }}>{p.description || ""}</div>
              <div>{money(p.price)}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
