import { useEffect, useState } from "react";
import PageState from "../components/PageState.jsx";
import { Card } from "../components/ui/Card.jsx";
import { Button } from "../components/ui/Button.jsx";
import { Input } from "../components/ui/Input.jsx";
import { Table } from "../components/ui/Table.jsx";
import { getOrdersDashboard } from "../lib/api";

const money = (n) => Number(n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const pct = (n) => `${Number(n || 0).toFixed(2)}%`;

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export default function Dashboard() {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [dateFrom, setDateFrom] = useState(todayIso());
  const [dateTo, setDateTo] = useState(todayIso());
  const [data, setData] = useState(null);

  async function load() {
    setErr("");
    setLoading(true);
    try {
      const dashboard = await getOrdersDashboard({ dateFrom, dateTo });
      setData(dashboard);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const totals = data?.totals || {};
  const bySource = data?.bySource || [];

  return (
    <div className="grid">
      <PageState loading={loading} error={err} />

      <Card>
        <div className="inline" style={{ gap: 8, flexWrap: "wrap" }}>
          <div className="section-title">Periodo</div>
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} style={{ maxWidth: 170 }} />
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} style={{ maxWidth: 170 }} />
          <Button variant="primary" onClick={load}>Atualizar</Button>
        </div>
      </Card>

      <div className="grid grid-3">
        <Card><div className="section-title">Vendas</div><h2>{money(totals.grossSales)}</h2></Card>
        <Card><div className="section-title">CMV</div><h2>{money(totals.cmvTotal)}</h2></Card>
        <Card><div className="section-title">Margem Bruta</div><h2>{money(totals.grossMarginValue)}</h2><div className="muted">{pct(totals.grossMarginPercent)}</div></Card>
      </div>

      <div className="grid grid-3">
        <Card><div className="section-title">Pedidos Processados</div><h2>{totals.ordersCount || 0}</h2></Card>
        <Card><div className="section-title">Pedidos Abertos</div><h2>{totals.openCount || 0}</h2></Card>
        <Card><div className="section-title">Ticket Medio</div><h2>{money(totals.avgTicket)}</h2><div className="muted">Cancelados: {totals.canceledCount || 0}</div></Card>
      </div>

      <Card>
        <div className="section-title">Origem</div>
        <Table
          head={["Origem", "Pedidos", "Vendas", "CMV", "Margem", "Margem %"]}
          rows={bySource.map((row) => [
            row.source,
            row.orders,
            money(row.grossSales),
            money(row.cmvTotal),
            money(row.grossMarginValue),
            pct(row.grossMarginPercent)
          ])}
        />
      </Card>
    </div>
  );
}
