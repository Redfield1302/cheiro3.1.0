import { useEffect, useState } from "react";
import { createInventory, createInventoryMovement, listInventory, listInventoryMovements } from "../lib/api";
import PageState from "../components/PageState.jsx";
import { Card } from "../components/ui/Card.jsx";
import { Button } from "../components/ui/Button.jsx";
import { Input } from "../components/ui/Input.jsx";
import { Select } from "../components/ui/Select.jsx";
import { Modal } from "../components/ui/Modal.jsx";
import { Table } from "../components/ui/Table.jsx";
import { EmptyState } from "../components/ui/EmptyState.jsx";
import { useToast } from "../components/ui/Toast.jsx";

export default function Inventory() {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [name, setName] = useState("Mussarela");
  const [unit, setUnit] = useState("g");
  const [cost, setCost] = useState("0.06");
  const [qty, setQty] = useState("5000");
  const [min, setMin] = useState("1000");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [currentItem, setCurrentItem] = useState(null);
  const [mvType, setMvType] = useState("IN");
  const [mvQty, setMvQty] = useState("0");
  const [mvReason, setMvReason] = useState("");
  const [history, setHistory] = useState([]);

  async function refresh() {
    setErr("");
    setLoading(true);
    try {
      setItems(await listInventory());
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(()=>{ refresh(); },[]);

  async function save() {
    setErr("");
    await createInventory({ name, unit, cost:Number(cost), quantity:Number(qty), minimum:Number(min) });
    await refresh();
  }

  async function openMovement(it) {
    setCurrentItem(it);
    setMvType("IN");
    setMvQty("0");
    setMvReason("");
    setModalOpen(true);
    try {
      const h = await listInventoryMovements(it.id);
      setHistory(h || []);
    } catch {
      setHistory([]);
    }
  }

  async function submitMovement() {
    if (!currentItem) return;
    try {
      await createInventoryMovement({
        itemId: currentItem.id,
        type: mvType,
        quantity: Number(mvQty || 0),
        reason: mvReason || null
      });
      toast.success("Movimentacao registrada");
      setModalOpen(false);
      await refresh();
    } catch (e) {
      toast.error(e.message);
    }
  }

  return (
    <div className="grid">
      <PageState loading={loading} error={err} />

      <Card>
        <div className="section-title">Novo insumo</div>
        <div className="grid" style={{ maxWidth: 420, marginTop: 10 }}>
          <Input value={name} onChange={(e)=>setName(e.target.value)} placeholder="nome" />
          <Input value={unit} onChange={(e)=>setUnit(e.target.value)} placeholder="unidade" />
          <Input value={cost} onChange={(e)=>setCost(e.target.value)} placeholder="custo" />
          <Input value={qty} onChange={(e)=>setQty(e.target.value)} placeholder="quantidade" />
          <Input value={min} onChange={(e)=>setMin(e.target.value)} placeholder="minimo" />
          <Button variant="primary" onClick={()=>save().catch(e=>setErr(e.message))}>Salvar</Button>
        </div>
      </Card>

      <Card>
        <div className="section-title">Itens</div>
        <div className="list" style={{ marginTop: 10 }}>
          {items.length === 0 ? (
            <EmptyState title="Sem insumos" description="Cadastre o primeiro item." />
          ) : items.map(it => (
            <Card key={it.id} style={{ padding: 10 }}>
              <b>{it.name}</b> - {it.quantity} {it.unit} - min {it.minimum}
              {Number(it.quantity) <= Number(it.minimum) ? (
                <div className="state error" style={{ marginTop: 6 }}>Abaixo do minimo</div>
              ) : null}
              <div className="inline" style={{ marginTop: 8 }}>
                <Button onClick={()=>openMovement(it)}>Movimentar</Button>
              </div>
            </Card>
          ))}
        </div>
      </Card>

      <Modal open={modalOpen} title={`Movimentar: ${currentItem?.name || ""}`} onClose={()=>setModalOpen(false)}>
        <div className="grid">
          <Select value={mvType} onChange={(e)=>setMvType(e.target.value)}>
            <option value="IN">Entrada</option>
            <option value="OUT">Saida</option>
            <option value="ADJUSTMENT">Ajuste</option>
          </Select>
          <Input value={mvQty} onChange={(e)=>setMvQty(e.target.value)} placeholder="quantidade" />
          <Input value={mvReason} onChange={(e)=>setMvReason(e.target.value)} placeholder="motivo (opcional)" />
          <Button variant="primary" onClick={submitMovement}>Confirmar</Button>

          <div className="section-title" style={{ marginTop: 6 }}>Historico</div>
          {history.length === 0 ? (
            <EmptyState title="Sem movimentacoes" />
          ) : (
            <Table
              head={["Tipo", "Qtd", "Motivo", "Data"]}
              rows={history.map(h => [
                h.type,
                h.quantity,
                h.reason || "-",
                new Date(h.createdAt).toLocaleString()
              ])}
            />
          )}
        </div>
      </Modal>
    </div>
  );
}
