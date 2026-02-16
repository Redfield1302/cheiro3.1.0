import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getProduct } from "../lib/api";

const money = (n) => Number(n||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});

export default function Product() {
  const { slug, id } = useParams();
  const nav = useNavigate();
  const [p, setP] = useState(null);
  const [qty, setQty] = useState(1);
  const [err, setErr] = useState("");

  useEffect(()=>{
    getProduct(slug, id).then(r=>setP(r.product)).catch(e=>setErr(e.message));
  },[slug,id]);

  function add() {
    const cart = JSON.parse(localStorage.getItem("cg_cart") || "[]");
    cart.push({ productId: p.id, name: p.name, price: p.price, quantity: qty });
    localStorage.setItem("cg_cart", JSON.stringify(cart));
    nav(`/t/${slug}/cart`);
  }

  return (
    <div style={{ fontFamily:"system-ui", padding:16 }}>
      <button onClick={()=>nav(-1)}>Voltar</button>
      {err ? <div style={{ background:"#ffecec", padding:10, borderRadius:10 }}>{err}</div> : null}
      {p ? (
        <div style={{ marginTop:10 }}>
          <h2>{p.name}</h2>
          <div style={{ opacity:.7 }}>{p.description || p.categoryRef?.name || ""}</div>
          <h3>{money(p.price)}</h3>
          <div style={{ display:"flex", gap:10, alignItems:"center" }}>
            <input type="number" min="1" value={qty} onChange={(e)=>setQty(Number(e.target.value))} />
            <button onClick={add}>Adicionar</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
