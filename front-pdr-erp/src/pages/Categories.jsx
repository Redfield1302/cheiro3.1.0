import { useEffect, useState } from "react";
import { createCategory, listCategories, updateCategory } from "../lib/api";
import PageState from "../components/PageState.jsx";
import { Button } from "../components/ui/Button.jsx";
import { Input } from "../components/ui/Input.jsx";
import { Card } from "../components/ui/Card.jsx";
import { EmptyState } from "../components/ui/EmptyState.jsx";
import { useToast } from "../components/ui/Toast.jsx";

export default function Categories() {
  const toast = useToast();
  const [categories, setCategories] = useState([]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");

  async function refresh() {
    setErr("");
    setLoading(true);
    try {
      setCategories(await listCategories());
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(()=>{ refresh(); },[]);

  async function save() {
    if (!name) return;
    try {
      await createCategory({ name, sort: 0, active: true });
      setName("");
      toast.success("Categoria criada");
      refresh();
    } catch (e) {
      toast.error(e.message);
    }
  }

  function startEdit(cat) {
    setEditingId(cat.id);
    setEditName(cat.name);
  }

  async function saveEdit() {
    try {
      await updateCategory(editingId, { name: editName });
      toast.success("Categoria atualizada");
      setEditingId(null);
      refresh();
    } catch (e) {
      toast.error(e.message);
    }
  }

  async function toggleActive(cat) {
    try {
      await updateCategory(cat.id, { active: !cat.active });
      toast.success(cat.active ? "Categoria desativada" : "Categoria ativada");
      refresh();
    } catch (e) {
      toast.error(e.message);
    }
  }

  return (
    <div className="grid">
      <PageState loading={loading} error={err} />

      <Card>
        <div className="section-title">Nova categoria</div>
        <div className="inline" style={{ marginTop: 10 }}>
          <Input value={name} onChange={(e)=>setName(e.target.value)} placeholder="nome da categoria" />
          <Button variant="primary" onClick={save}>Salvar</Button>
        </div>
      </Card>

      <Card>
        <div className="section-title">Categorias</div>
        <div className="list" style={{ marginTop: 10 }}>
          {categories.length === 0 ? (
            <EmptyState title="Sem categorias" description="Crie a primeira categoria." />
          ) : categories.map(c => (
            <Card key={c.id} style={{ padding: 10 }}>
              {editingId === c.id ? (
                <div className="inline">
                  <Input value={editName} onChange={(e)=>setEditName(e.target.value)} />
                  <Button variant="primary" onClick={saveEdit}>Salvar</Button>
                  <Button onClick={()=>setEditingId(null)}>Cancelar</Button>
                </div>
              ) : (
                <div className="inline" style={{ justifyContent: "space-between" }}>
                  <b>{c.name}</b>
                  <div className="inline">
                    <Button onClick={()=>startEdit(c)}>Editar</Button>
                    <Button onClick={()=>toggleActive(c)}>{c.active ? "Desativar" : "Ativar"}</Button>
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      </Card>
    </div>
  );
}
