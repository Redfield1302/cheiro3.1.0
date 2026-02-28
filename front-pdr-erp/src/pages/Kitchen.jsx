import { useEffect, useMemo, useRef, useState } from "react";
import PageState from "../components/PageState.jsx";
import { Card } from "../components/ui/Card.jsx";
import { Button } from "../components/ui/Button.jsx";
import { Select } from "../components/ui/Select.jsx";
import { EmptyState } from "../components/ui/EmptyState.jsx";
import { listKitchenOrders, updateKitchenOrderStatus } from "../lib/api";
import { useToast } from "../components/ui/Toast.jsx";
import { buildGoogleMapsSearchLink, buildWhatsAppLink, montarEnderecoParaMapa } from "../lib/contact.js";

const money = (n) => Number(n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const STATUS_FLOW = {
  CONFIRMED: ["PREPARING", "CANCELED"],
  PREPARING: ["READY", "CANCELED"],
  READY: ["DISPATCHED", "DELIVERED", "CANCELED"],
  DISPATCHED: ["DELIVERED", "CANCELED"]
};

export default function Kitchen() {
  const toast = useToast();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [statuses, setStatuses] = useState("CONFIRMED,PREPARING,READY,DISPATCHED");
  const [soundEnabled, setSoundEnabled] = useState(() => localStorage.getItem("cg_kitchen_sound") !== "0");
  const [autoPrintEnabled, setAutoPrintEnabled] = useState(() => localStorage.getItem("cg_kitchen_autoprint") === "1");
  const [printOrder, setPrintOrder] = useState(null);
  const seenOrderIdsRef = useRef(new Set());
  const firstLoadRef = useRef(true);

  function playNotificationSound() {
    if (!soundEnabled) return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = 880;
      gain.gain.value = 0.04;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } catch (_e) {
      // Nao quebra fluxo se o navegador bloquear audio automatico.
    }
  }

  function queuePrint(order) {
    if (!autoPrintEnabled) return;
    setPrintOrder(order);
    setTimeout(() => {
      try {
        window.print();
      } catch (_e) {
        toast.error("Falha ao abrir impressao automatica.");
      }
    }, 120);
  }

  function handleIncomingOrders(nextOrders) {
    if (firstLoadRef.current) {
      seenOrderIdsRef.current = new Set(nextOrders.map((o) => o.id));
      firstLoadRef.current = false;
      return;
    }

    const incoming = nextOrders.filter((o) => !seenOrderIdsRef.current.has(o.id) && o.status === "CONFIRMED");
    if (!incoming.length) {
      nextOrders.forEach((o) => seenOrderIdsRef.current.add(o.id));
      return;
    }

    incoming.forEach((order) => {
      toast.success(`Novo pedido ${order.displayId || order.id.slice(0, 6)} recebido`);
      playNotificationSound();
      queuePrint(order);
      seenOrderIdsRef.current.add(order.id);
    });

    nextOrders.forEach((o) => seenOrderIdsRef.current.add(o.id));
  }

  async function refresh(options = {}) {
    const { background = false } = options;
    setErr("");
    if (!background) setLoading(true);
    try {
      const data = await listKitchenOrders({ statuses });
      const nextOrders = Array.isArray(data) ? data : [];
      setOrders(nextOrders);
      handleIncomingOrders(nextOrders);
    } catch (e) {
      setErr(e.message);
    } finally {
      if (!background) setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      refresh({ background: true });
    }, 5000);
    return () => clearInterval(timer);
  }, [statuses, soundEnabled, autoPrintEnabled]);

  useEffect(() => {
    localStorage.setItem("cg_kitchen_sound", soundEnabled ? "1" : "0");
  }, [soundEnabled]);

  useEffect(() => {
    localStorage.setItem("cg_kitchen_autoprint", autoPrintEnabled ? "1" : "0");
  }, [autoPrintEnabled]);

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
    const whatsappLink = buildWhatsAppLink(order.customer?.phone);
    const enderecoMapsRaw = montarEnderecoParaMapa(order);
    const mapsLink = buildGoogleMapsSearchLink(enderecoMapsRaw);
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

  useEffect(() => {
    refresh({ background: true });
  }, [statuses]);

  return (
    <div className="grid">
      <div className="no-print">
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
              <Button onClick={() => setSoundEnabled((v) => !v)}>
                Som {soundEnabled ? "ON" : "OFF"}
              </Button>
              <Button onClick={() => setAutoPrintEnabled((v) => !v)}>
                Auto print {autoPrintEnabled ? "ON" : "OFF"}
              </Button>
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

      {printOrder ? (
        <section className="print-ticket print-only">
          <div className="print-ticket-title">COMANDA COZINHA</div>
          <div className="print-center">{new Date(printOrder.createdAt).toLocaleString()}</div>
          <hr />
          <div className="print-line"><b>ID:</b><b>{printOrder.displayId || printOrder.id.slice(0, 6)}</b></div>
          <div className="print-line"><b>CLIENTE:</b><b>{printOrder.customer?.name || "Nao informado"}</b></div>
          <div className="print-line"><b>FONE:</b><b>{printOrder.customer?.phone || "-"}</b></div>
          <div className="print-line"><b>PAGAMENTO:</b><b>{printOrder.payments?.[0]?.method || "Nao informado"}</b></div>
          <div className="print-line"><b>SOURCE:</b><b>{printOrder.source || "PDV"}</b></div>
          <hr />
          <div className="print-head">
            <b>ITEM</b><b>TOTAL</b>
          </div>
          {(printOrder.items || []).map((it) => (
            <div key={it.id}>
              <div className="print-line-3">
                <span>{it.quantity}x {it.name}</span>
                <span>{money(it.totalPrice)}</span>
              </div>
              {(it.modifiers || []).map((m) => (
                <div key={m.id || `${m.groupName}-${m.name}`} className="print-modifier-line">
                  + {m.quantity}x {m.name}
                </div>
              ))}
              {it.notes ? <div className="print-notes-line">obs: {it.notes}</div> : null}
            </div>
          ))}
          <hr />
          <div className="print-line"><b>TOTAL:</b><b>{money(printOrder.total)}</b></div>
        </section>
      ) : null}
    </div>
  );
}
