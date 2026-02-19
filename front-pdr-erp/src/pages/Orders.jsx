import { useEffect, useMemo, useState } from "react";
import PageState from "../components/PageState.jsx";
import { Card } from "../components/ui/Card.jsx";
import { EmptyState } from "../components/ui/EmptyState.jsx";
import { Input } from "../components/ui/Input.jsx";
import { Select } from "../components/ui/Select.jsx";
import { Button } from "../components/ui/Button.jsx";
import { listOrdersSimple } from "../lib/api";

const money = (n) => Number(n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function inferPaid(order) {
  return ["DELIVERED"].includes(order.status);
}

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [status, setStatus] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function refresh() {
    setErr("");
    setLoading(true);
    try {
      const res = await listOrdersSimple({ status, dateFrom, dateTo });
      setOrders(res || []);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { refresh(); }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return orders;
    return orders.filter((o) => {
      const id = String(o.displayId || o.id || "").toLowerCase();
      const source = String(o.source || "").toLowerCase();
      return id.includes(q) || source.includes(q);
    });
  }, [orders, search]);

  return (
    <div className="grid">
      <PageState loading={loading} error={err} />

      <Card>
        <div className="section-title">Filtros</div>
        <div className="inline" style={{ marginTop: 10, flexWrap: "wrap" }}>
          <Input placeholder="Buscar por pedido/fonte" value={search} onChange={(e) => setSearch(e.target.value)} style={{ minWidth: 240 }} />
          <Select value={status} onChange={(e) => setStatus(e.target.value)} style={{ maxWidth: 210 }}>
            <option value="">Todos status</option>
            <option value="OPEN">OPEN</option>
            <option value="CONFIRMED">CONFIRMED</option>
            <option value="PREPARING">PREPARING</option>
            <option value="READY">READY</option>
            <option value="DISPATCHED">DISPATCHED</option>
            <option value="DELIVERED">DELIVERED</option>
            <option value="CANCELED">CANCELED</option>
          </Select>
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          <Button variant="primary" onClick={refresh}>Atualizar</Button>
        </div>
      </Card>

      <Card>
        <div className="section-title">Pedidos</div>
        <div style={{ marginTop: 10, overflowX: "auto" }}>
          {filtered.length === 0 ? (
            <EmptyState title="Sem pedidos" description="Ajuste filtros ou periodo." />
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Pedido</th>
                  <th>Iniciado em</th>
                  <th>Status</th>
                  <th>Pago?</th>
                  <th>Fonte</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((o) => {
                  const paid = inferPaid(o);
                  return (
                    <tr key={o.id}>
                      <td>{o.displayId || o.id.slice(0, 8)}</td>
                      <td>{new Date(o.createdAt).toLocaleString()}</td>
                      <td><span className="badge">{o.status}</span></td>
                      <td><span className={`badge ${paid ? "ok" : ""}`}>{paid ? "Sim" : "Nao"}</span></td>
                      <td>{o.source}</td>
                      <td>{money(o.total)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </Card>
    </div>
  );
}
