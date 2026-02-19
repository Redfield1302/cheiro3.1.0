import { useEffect, useMemo, useState } from "react";
import PageState from "../components/PageState.jsx";
import { Card } from "../components/ui/Card.jsx";
import { Button } from "../components/ui/Button.jsx";
import { Select } from "../components/ui/Select.jsx";
import { EmptyState } from "../components/ui/EmptyState.jsx";
import { listKitchenOrders, updateKitchenOrderStatus } from "../lib/api";
import { useToast } from "../components/ui/Toast.jsx";

const money = (n) => Number(n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const STATUS_FLOW = {
  CONFIRMED: ["PREPARING", "CANCELED"],
  PREPARING: ["READY", "CANCELED"],
  READY: ["DISPATCHED", "DELIVERED", "CANCELED"],
  DISPATCHED: ["DELIVERED", "CANCELED"]
};

function formatarTelefoneParaWhatsApp(telefone) {
  const raw = String(telefone || "").replace(/\D/g, "");
  if (!raw) return "";
  if (raw.startsWith("55")) return raw;
  return `55${raw}`;
}

function montarEnderecoParaMapa(order) {
  const parts = [
    order.address?.street || "",
    order.address?.number || "",
    order.address?.neighborhood || "",
    order.address?.city || "",
    order.address?.state || "",
    order.address?.postalCode || ""
  ].filter(Boolean);
  return parts.join(", ");
}

export default function Kitchen() {
  const toast = useToast();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [statuses, setStatuses] = useState("CONFIRMED,PREPARING,READY,DISPATCHED");

  async function refresh() {
    setErr("");
    setLoading(true);
    try {
      const data = await listKitchenOrders({ statuses });
      setOrders(Array.isArray(data) ? data : []);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  const grouped = useMemo(() => {
    const map = {
      CONFIRMED: [],
      PREPARING: [],
      READY: [],
      DISPATCHED: []
    };
    for (const order of orders) {
      if (map[order.status]) map[order.status].push(order);
    }
    return map;
  }, [orders]);

  async function advance(orderId, nextStatus) {
    try {
      await updateKitchenOrderStatus(orderId, nextStatus);
      toast.success(`Status atualizado para ${nextStatus}`);
      refresh();
    } catch (e) {
      toast.error(e.message);
    }
  }

  function card(order) {
    const customerName = order.customer?.name || "Nao informado";
    const customerPhone = order.customer?.phone || "Nao informado";
    const source = String(order.source || "").toLowerCase();
    const address =
      order.address?.street
        ? `${order.address.street}${order.address.number ? `, ${order.address.number}` : ""}`
        : "Sem endereco";
    const paymentMethod = order.payments?.[0]?.method || "Nao informado";
    const telefoneWhatsApp = formatarTelefoneParaWhatsApp(order.customer?.phone);
    const whatsappLink = telefoneWhatsApp ? `https://wa.me/${telefoneWhatsApp}` : "";
    const enderecoMapsRaw = montarEnderecoParaMapa(order);
    const mapsLink = enderecoMapsRaw
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(enderecoMapsRaw)}`
      : "";
    const next = STATUS_FLOW[order.status] || [];

    return (
      <Card key={order.id} className="kitchen-card">
        <div className="kitchen-head">
          <b>ID: {order.displayId || order.id.slice(0, 6)}</b>
          <b>{customerName}</b>
          <b>Source: {source || "pdv"}</b>
        </div>

        <div className="kitchen-items-summary">
          {order.items.length} item(ns) - {money(order.total)}
        </div>

        <div className="kitchen-meta">
          <div className="kitchen-meta-line">
            <b>telefone:</b> {customerPhone}
            {whatsappLink ? (
              <a className="kitchen-link-btn" href={whatsappLink} target="_blank" rel="noreferrer" title="Abrir WhatsApp">
                WhatsApp
              </a>
            ) : null}
          </div>
          <div className="kitchen-meta-line">
            <b>endereco:</b> {address}
            {mapsLink ? (
              <a className="kitchen-link-btn" href={mapsLink} target="_blank" rel="noreferrer" title="Abrir no Google Maps">
                Maps
              </a>
            ) : null}
          </div>
          <div><b>pagamento:</b> {paymentMethod}</div>
          <div><b>status:</b> {order.status}</div>
          <div><b>total:</b> {money(order.total)}</div>
        </div>

        <details className="kitchen-details">
          <summary>Ver detalhes do pedido</summary>
          <div className="kitchen-items">
            {order.items.map((it) => (
              <div key={it.id} className="kitchen-item-line">
                <div>
                  <b>{it.quantity}x {it.name}</b>
                  <div className="muted">{money(it.unitPrice)} x {it.quantity}</div>
                  {it.notes ? <div className="kitchen-item-notes">obs: {it.notes}</div> : null}
                  {(it.modifiers || []).length > 0 ? (
                    <div className="kitchen-item-modifiers">
                      {(it.modifiers || []).map((m) => (
                        <div key={m.id}>+ {m.quantity}x {m.name}</div>
                      ))}
                    </div>
                  ) : null}
                </div>
                <div>{money(it.totalPrice)}</div>
              </div>
            ))}
          </div>
        </details>

        <div className="kitchen-actions">
          {next.map((s) => (
            <Button
              key={s}
              variant={s === "CANCELED" ? "default" : "primary"}
              onClick={() => advance(order.id, s)}
            >
              {s}
            </Button>
          ))}
        </div>
      </Card>
    );
  }

  return (
    <div className="grid">
      <PageState loading={loading} error={err} />

      <Card>
        <div className="inline" style={{ justifyContent: "space-between", flexWrap: "wrap" }}>
          <div className="section-title">Fila da cozinha por tenant</div>
          <div className="inline">
            <Select value={statuses} onChange={(e) => setStatuses(e.target.value)} style={{ minWidth: 260 }}>
              <option value="CONFIRMED,PREPARING,READY,DISPATCHED">Ativos da cozinha</option>
              <option value="CONFIRMED">Somente confirmados</option>
              <option value="PREPARING">Somente preparando</option>
              <option value="READY">Somente prontos</option>
              <option value="DISPATCHED">Somente despachados</option>
            </Select>
            <Button variant="primary" onClick={refresh}>Atualizar</Button>
          </div>
        </div>
      </Card>

      <div className="kitchen-board">
        <Card>
          <div className="section-title">Confirmados</div>
          <div className="kitchen-column">{grouped.CONFIRMED.map(card)}</div>
        </Card>
        <Card>
          <div className="section-title">Preparando</div>
          <div className="kitchen-column">{grouped.PREPARING.map(card)}</div>
        </Card>
        <Card>
          <div className="section-title">Prontos</div>
          <div className="kitchen-column">{grouped.READY.map(card)}</div>
        </Card>
        <Card>
          <div className="section-title">Despachados</div>
          <div className="kitchen-column">{grouped.DISPATCHED.map(card)}</div>
        </Card>
      </div>

      {orders.length === 0 ? <EmptyState title="Sem pedidos na cozinha" description="Nao ha pedidos no filtro atual." /> : null}
    </div>
  );
}
