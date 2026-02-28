import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getTenant } from "../lib/api";

export default function Home() {
  const { slug } = useParams();
  const nav = useNavigate();
  const [tenant, setTenant] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    getTenant(slug)
      .then((res) => setTenant(res.tenant))
      .catch((e) => setErr(e.message));
  }, [slug]);

  return (
    <div className="m-app">
      <header className="m-home-hero">
        <div className="m-home-overlay">
          {tenant?.logoUrl ? (
            <img className="m-home-logo" src={tenant.logoUrl} alt={`Logo ${tenant?.name || ""}`} />
          ) : null}
          <h1 className="m-home-title">{tenant?.name || "Cardapio Digital"}</h1>
          <p className="m-home-subtitle">Pedido online rapido, seguro e direto para a cozinha.</p>
        </div>
      </header>

      <main className="m-body m-home-body">
        {err ? <div className="m-surface">{err}</div> : null}

        <section className="m-surface">
          <h2 className="m-home-section-title">Como funciona</h2>
          <div className="m-home-list">
            <div>1. Escolha os produtos no cardapio.</div>
            <div>2. Personalize os itens e confirme o pagamento.</div>
            <div>3. Pedido entra no ERP e vai para producao.</div>
          </div>
        </section>

        <section className="m-surface">
          <h2 className="m-home-section-title">Entrega e atendimento</h2>
          <div className="m-muted">
            Seus dados de pedido ficam vinculados ao estabelecimento deste link: <strong>/{slug}</strong>.
          </div>
        </section>
      </main>

      <footer className="m-bottom-nav">
        <div className="m-bottom-row">
          <button className="m-primary m-primary-block" onClick={() => nav(`/t/${slug}/menu`)}>
            Ver cardapio
          </button>
        </div>
      </footer>
    </div>
  );
}
