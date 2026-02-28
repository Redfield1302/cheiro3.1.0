import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getOrder } from "../lib/api";

const STATUS_STEPS = ["CONFIRMED", "PREPARING", "READY", "DISPATCHED", "DELIVERED"];
const STATUS_LABEL = {
  OPEN: "Recebido",
  CONFIRMED: "Confirmado",
  PREPARING: "Em preparo",
  READY: "Pronto",
  DISPATCHED: "Saiu para entrega",
  DELIVERED: "Entregue",
  CANCELED: "Cancelado"
};

function stepState(status, step) {
  const currentIndex = STATUS_STEPS.indexOf(status);
  const stepIndex = STATUS_STEPS.indexOf(step);
  if (currentIndex < 0 || stepIndex < 0) return "pending";
  if (currentIndex === stepIndex) return "active";
  if (currentIndex > stepIndex) return "done";
  return "pending";
}

export default function OrderStatus() {
  const { slug, id } = useParams();
  const nav = useNavigate();
  const [order, setOrder] = useState(null);
  const [err, setErr] = useState("");

  async function refresh() {
    try {
      const res = await getOrder(id);
      setOrder(res.order);
      setErr("");
    } catch (e) {
      setErr(e.message);
    }
  }

  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, 5000);
    return () => clearInterval(timer);
  }, [id]);

  const humanStatus = useMemo(() => STATUS_LABEL[order?.status] || order?.status || "-", [order?.status]);

  return (
    <div className="m-app">
      <header className="m-header m-header-minimal">
        <div className="m-header-row">
          <button className="m-icon-btn" onClick={() => nav(`/t/${slug}/menu`)} aria-label="Menu">
            &#8249;
          </button>
          <div className="m-title">Pedido realizado</div>
          <div className="m-icon-btn m-icon-placeholder" />
        </div>
      </header>

      <main className="m-body m-cart-body">
        {err ? <div className="m-surface">{err}</div> : null}

        <section className="m-surface">
          <div className="m-status-hero">
            <div className="m-status-img">🍕</div>
            <h2 className="m-status-title">Seu pedido esta em andamento</h2>
            <div className="m-muted">Acompanhe a producao e entrega em tempo real.</div>
          </div>
          <div className="m-status-meta">
            <div className="m-row">
              <span>ID do pedido</span>
              <strong>{order?.displayId || order?.id || id}</strong>
            </div>
            <div className="m-row">
              <span>Status atual</span>
              <strong>{humanStatus}</strong>
            </div>
          </div>
        </section>

        <section className="m-surface">
          <div className="m-status-steps">
            {STATUS_STEPS.map((step) => {
              const state = stepState(order?.status, step);
              return (
                <article key={step} className={`m-status-step ${state}`}>
                  <div className="m-status-step-icon">
                    {step === "CONFIRMED" ? "🧾" : null}
                    {step === "PREPARING" ? "👨‍🍳" : null}
                    {step === "READY" ? "📦" : null}
                    {step === "DISPATCHED" ? "🛵" : null}
                    {step === "DELIVERED" ? "✅" : null}
                  </div>
                  <div>
                    <div className="m-status-step-title">{STATUS_LABEL[step]}</div>
                    <div className="m-muted">
                      {state === "done" ? "Concluido" : state === "active" ? "Em andamento" : "Aguardando"}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </main>

      <footer className="m-bottom-nav">
        <div className="m-bottom-row">
          <button className="m-primary m-primary-block" onClick={refresh}>
            Atualizar status
          </button>
        </div>
      </footer>
    </div>
  );
}

