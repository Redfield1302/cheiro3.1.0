import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { createOrder } from "../lib/api";

const money = (n) => Number(n||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});

export default function Cart() {
  const { slug } = useParams();
  const nav = useNavigate();
  const [err, setErr] = useState("");

  const cart = useMemo(()=>JSON.parse(localStorage.getItem("cg_cart") || "[]"),[]);
  const total = useMemo(()=>cart.reduce((s,i)=>s+(i.price*i.quantity),0),[cart]);

  async function checkout() {
    setErr("");
    try {
      const payload = {
        paymentMethod: "PIX",
        items: cart.map(i=>({ productId:i.productId, quantity:i.quantity }))
      };
      const res = await createOrder(slug, payload);
      localStorage.removeItem("cg_cart");
      alert(`Pedido criado: ${res.order.id}`);
      nav(`/t/${slug}`);
    } catch (e) {
      setErr(e.message);
    }
  }

  return (
    <div style={{ fontFamily:"system-ui", padding:16 }}>
      <h2>Carrinho</h2>
      {err ? <div style={{ background:"#ffecec", padding:10, borderRadius:10 }}>{err}</div> : null}

      <div style={{ display:"grid", gap:8 }}>
        {cart.map((i,idx)=>(
          <div key={idx} style={{ border:"1px solid #ddd", padding:10, borderRadius:10 }}>
            <b>{i.name}</b> x{i.quantity} — {money(i.price*i.quantity)}
          </div>
        ))}
      </div>

      <hr />
      <div style={{ display:"flex", justifyContent:"space-between" }}>
        <b>Total</b><b>{money(total)}</b>
      </div>

      <button onClick={checkout} disabled={!cart.length} style={{ padding:12, marginTop:10 }}>
        Finalizar (PIX)
      </button>
    </div>
  );
}
