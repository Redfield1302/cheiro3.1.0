import { useEffect, useState } from "react";
import { cashClose, cashOpen, cashStatus, createCashMovement, listCashMovements } from "../lib/api";
import PageState from "../components/PageState.jsx";
import { Card } from "../components/ui/Card.jsx";
import { Button } from "../components/ui/Button.jsx";
import { Input } from "../components/ui/Input.jsx";
import { Select } from "../components/ui/Select.jsx";
import { Table } from "../components/ui/Table.jsx";
import { EmptyState } from "../components/ui/EmptyState.jsx";
import { useToast } from "../components/ui/Toast.jsx";

export default function Cash() {
  const toast = useToast();
  const [s, setS] = useState(null);
  const [movs, setMovs] = useState([]);
  const [openVal, setOpenVal] = useState("0");
  const [closeVal, setCloseVal] = useState("0");
  const [mvType, setMvType] = useState("SUPPLY");
  const [mvAmount, setMvAmount] = useState("0");
  const [mvReason, setMvReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function refresh() {
    setErr("");
    setLoading(true);
    try {
      setS(await cashStatus());
      setMovs(await listCashMovements());
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(()=>{ refresh(); },[]);

  const isOpen = !!s?.isOpen;

  async function createMovement() {
    try {
      await createCashMovement({
        type: mvType,
        amount: Number(mvAmount || 0),
        reason: mvReason || null
      });
      toast.success("Movimentacao registrada");
      setMvAmount("0");
      setMvReason("");
      refresh();
    } catch (e) {
      toast.error(e.message);
    }
  }

  return (
    <div className="grid" style={{ maxWidth: 900 }}>
      <PageState loading={loading} error={err} />

      <Card>
        <div className="section-title">Status</div>
        <div style={{ marginTop: 8 }}>
          {isOpen ? "Caixa aberto" : "Caixa fechado"}
        </div>
        <pre className="state" style={{ marginTop: 8 }}>{JSON.stringify(s, null, 2)}</pre>
      </Card>

      <Card>
        {!isOpen ? (
          <div className="grid" style={{ maxWidth: 320 }}>
            <Input value={openVal} onChange={(e)=>setOpenVal(e.target.value)} placeholder="valor de abertura" />
            <Button variant="primary" onClick={()=>cashOpen(Number(openVal||0)).then(refresh).catch(e=>setErr(e.message))}>
              Abrir caixa
            </Button>
          </div>
        ) : (
          <div className="grid" style={{ maxWidth: 420 }}>
            <Input value={closeVal} onChange={(e)=>setCloseVal(e.target.value)} placeholder="valor de fechamento" />
            <div className="inline">
              <Button variant="primary" onClick={()=>cashClose(Number(closeVal||0)).then(()=>{ refresh(); window.print(); }).catch(e=>setErr(e.message))}>
                Fechar caixa
              </Button>
              <Button onClick={()=>window.print()}>Imprimir</Button>
            </div>
          </div>
        )}
      </Card>

      <Card>
        <div className="section-title">Movimentacoes manuais</div>
        <div className="grid" style={{ marginTop: 10, maxWidth: 520 }}>
          <Select value={mvType} onChange={(e)=>setMvType(e.target.value)}>
            <option value="SUPPLY">Suprimento</option>
            <option value="WITHDRAW">Retirada</option>
            <option value="EXPENSE">Despesa</option>
            <option value="INCOME">Receita</option>
          </Select>
          <Input value={mvAmount} onChange={(e)=>setMvAmount(e.target.value)} placeholder="valor" />
          <Input value={mvReason} onChange={(e)=>setMvReason(e.target.value)} placeholder="motivo (opcional)" />
          <Button variant="primary" onClick={createMovement} disabled={!isOpen}>Registrar movimentacao</Button>
          {!isOpen ? <div className="state">Abra o caixa para registrar movimentacoes.</div> : null}
        </div>
      </Card>

      <Card>
        <div className="section-title">Movimentacoes recentes</div>
        <div style={{ marginTop: 10 }}>
          {movs.length === 0 ? (
            <EmptyState title="Sem movimentacoes" />
          ) : (
            <Table
              head={["Tipo", "Valor", "Motivo", "Data"]}
              rows={movs.map(m => [
                m.type,
                Number(m.amount).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
                m.reason || "-",
                new Date(m.createdAt).toLocaleString()
              ])}
            />
          )}
        </div>
      </Card>
    </div>
  );
}
