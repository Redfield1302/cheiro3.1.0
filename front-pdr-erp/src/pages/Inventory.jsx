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
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("");
  const [cost, setCost] = useState("");
  const [qty, setQty] = useState("");
  const [min, setMin] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [itemModalOpen, setItemModalOpen] = useState(false);

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

  function parseDecimal(v) {
    const raw = String(v ?? "").trim();
    if (!raw) return NaN;
    const normalized = raw.includes(",") ? raw.replace(/\./g, "").replace(",", ".") : raw;
    return Number(normalized);
  }

  async function save() {
    const parsedCost = cost === "" ? null : parseDecimal(cost);
    const parsedQty = parseDecimal(qty);
    const parsedMin = parseDecimal(min);

    if (!name.trim()) return toast.error("Nome do insumo e obrigatorio");
    if (!unit.trim()) return toast.error("Unidade e obrigatoria");
    if (!Number.isFinite(parsedQty)) return toast.error("Quantidade atual invalida");
    if (!Number.isFinite(parsedMin)) return toast.error("Estoque minimo invalido");
    if (parsedCost != null && !Number.isFinite(parsedCost)) return toast.error("Custo unitario invalido");

    setErr("");
    await createInventory({
      name: name.trim(),
      unit: unit.trim(),
      cost: parsedCost,
      quantity: parsedQty,
      minimum: parsedMin
    });
    setName("");
    setUnit("");
    setCost("");
    setQty("");
    setMin("");
    setItemModalOpen(false);
    toast.success("Insumo cadastrado");
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
        <div className="inline" style={{ justifyContent: "space-between" }}>
          <div className="section-title">Cadastro de insumos</div>
          <Button variant="primary" onClick={()=>setItemModalOpen(true)}>Adicionar insumo</Button>
        </div>
        <div className="muted" style={{ marginTop: 8, fontSize: 13 }}>
          Use o botao para cadastrar novos itens de estoque com nome, unidade, custo e niveis de quantidade.
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

      <Modal open={itemModalOpen} title="Adicionar insumo" onClose={()=>setItemModalOpen(false)}>
        <div className="grid">
          <div className="field-help">
            <div className="section-title">Nome do insumo</div>
            <div className="muted" style={{ fontSize: 12 }}>Descricao clara para busca e baixa automatica na ficha tecnica.</div>
            <Input value={name} onChange={(e)=>setName(e.target.value)} placeholder="Ex.: Queijo Mussarela" />
          </div>

          <div className="field-help">
            <div className="section-title">Unidade</div>
            <div className="muted" style={{ fontSize: 12 }}>Unidade de controle do estoque. Exemplos: kg, g, l, ml, un.</div>
            <Input value={unit} onChange={(e)=>setUnit(e.target.value)} placeholder="Ex.: kg" />
          </div>

          <div className="field-help">
            <div className="section-title">Custo unitario</div>
            <div className="muted" style={{ fontSize: 12 }}>Valor por unidade informada. Aceita virgula ou ponto.</div>
            <Input value={cost} onChange={(e)=>setCost(e.target.value)} placeholder="Ex.: 37,00" />
          </div>

          <div className="field-help">
            <div className="section-title">Quantidade atual</div>
            <div className="muted" style={{ fontSize: 12 }}>Estoque disponivel no momento para este item.</div>
            <Input value={qty} onChange={(e)=>setQty(e.target.value)} placeholder="Ex.: 12,500" />
          </div>

          <div className="field-help">
            <div className="section-title">Estoque minimo</div>
            <div className="muted" style={{ fontSize: 12 }}>Quando atingir esse valor, o sistema alerta reposicao.</div>
            <Input value={min} onChange={(e)=>setMin(e.target.value)} placeholder="Ex.: 2,000" />
          </div>

          <div className="inline">
            <Button variant="primary" onClick={()=>save().catch(e=>setErr(e.message))}>Salvar insumo</Button>
            <Button onClick={()=>setItemModalOpen(false)}>Cancelar</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
