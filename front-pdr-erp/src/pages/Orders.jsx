import { useEffect, useState } from "react";
import PageState from "../components/PageState.jsx";
import { Card } from "../components/ui/Card.jsx";
import { EmptyState } from "../components/ui/EmptyState.jsx";
import { Input } from "../components/ui/Input.jsx";
import { Select } from "../components/ui/Select.jsx";
import { Button } from "../components/ui/Button.jsx";
import { Table } from "../components/ui/Table.jsx";
import { listOrdersSimple } from "../lib/api";

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [status, setStatus] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
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

  useEffect(()=>{ refresh(); },[]);

  return (
    <div className="grid">
      <PageState loading={loading} error={err} />
      <Card>
        <div className="section-title">Filtros</div>
        <div className="inline" style={{ marginTop: 10, flexWrap: "wrap" }}>
          <Select value={status} onChange={(e)=>setStatus(e.target.value)} style={{ maxWidth: 200 }}>
            <option value="">Todos status</option>
            <option value="OPEN">OPEN</option>
            <option value="CONFIRMED">CONFIRMED</option>
            <option value="PREPARING">PREPARING</option>
            <option value="READY">READY</option>
            <option value="DISPATCHED">DISPATCHED</option>
            <option value="DELIVERED">DELIVERED</option>
            <option value="CANCELED">CANCELED</option>
          </Select>
          <Input type="date" value={dateFrom} onChange={(e)=>setDateFrom(e.target.value)} />
          <Input type="date" value={dateTo} onChange={(e)=>setDateTo(e.target.value)} />
          <Button variant="primary" onClick={refresh}>Aplicar</Button>
        </div>
      </Card>

      <Card>
        <div className="section-title">Pedidos (simples)</div>
        <div style={{ marginTop: 10 }}>
          {orders.length === 0 ? (
            <EmptyState title="Sem pedidos" />
          ) : (
            <Table
              head={["ID", "Status", "Total", "Fonte", "Criado em"]}
              rows={orders.map(o => [
                o.displayId || o.id,
                o.status,
                Number(o.total).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
                o.source,
                new Date(o.createdAt).toLocaleString()
              ])}
            />
          )}
        </div>
      </Card>
    </div>
  );
}
