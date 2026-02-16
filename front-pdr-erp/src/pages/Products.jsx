import { useEffect, useState } from "react";
import { createCategory, createProduct, listCategories, listProducts, updateProduct } from "../lib/api";
import PageState from "../components/PageState.jsx";
import { Card } from "../components/ui/Card.jsx";
import { Input } from "../components/ui/Input.jsx";
import { Select } from "../components/ui/Select.jsx";
import { Button } from "../components/ui/Button.jsx";
import { EmptyState } from "../components/ui/EmptyState.jsx";
import { useToast } from "../components/ui/Toast.jsx";

const money = (n) => Number(n||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});

export default function Products() {
  const toast = useToast();
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const [catName, setCatName] = useState("");
  const [pName, setPName] = useState("");
  const [price, setPrice] = useState("0");
  const [categoryId, setCategoryId] = useState("");
  const [type, setType] = useState("PRODUCED");
  const [cost, setCost] = useState("");
  const [imageUrl, setImageUrl] = useState("");

  const [editingId, setEditingId] = useState(null);
  const [edit, setEdit] = useState({});

  async function refresh() {
    setErr("");
    setLoading(true);
    try {
      const [cs, ps] = await Promise.all([listCategories(), listProducts()]);
      setCategories(cs);
      setProducts(ps);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(()=>{ refresh(); },[]);

  async function saveCategory() {
    if (!catName) return;
    await createCategory({ name: catName, sort: 0, active: true });
    setCatName("");
    refresh();
  }

  async function saveProduct() {
    if (!pName || price === "") return;
    await createProduct({
      name: pName,
      price: Number(price),
      categoryId: categoryId || null,
      type,
      cost: cost === "" ? null : Number(cost),
      imageUrl: imageUrl || null
    });
    setPName("");
    setPrice("0");
    setCost("");
    setImageUrl("");
    refresh();
  }

  function startEdit(p) {
    setEditingId(p.id);
    setEdit({
      name: p.name,
      price: p.price,
      categoryId: p.categoryId || "",
      type: p.type,
      cost: p.cost ?? "",
      imageUrl: p.imageUrl || "",
      active: p.active
    });
  }

  async function saveEdit() {
    try {
      await updateProduct(editingId, {
        name: edit.name,
        price: Number(edit.price),
        categoryId: edit.categoryId || null,
        type: edit.type,
        cost: edit.cost === "" ? null : Number(edit.cost),
        imageUrl: edit.imageUrl || null
      });
      toast.success("Produto atualizado");
      setEditingId(null);
      refresh();
    } catch (e) {
      toast.error(e.message);
    }
  }

  async function toggleActive(p) {
    try {
      await updateProduct(p.id, { active: !p.active });
      toast.success(p.active ? "Produto desativado" : "Produto ativado");
      refresh();
    } catch (e) {
      toast.error(e.message);
    }
  }

  return (
    <div className="grid">
      <PageState loading={loading} error={err} />

      <div className="grid grid-2">
        <Card>
          <div className="section-title">Nova categoria</div>
          <div className="inline" style={{ marginTop: 10 }}>
            <Input value={catName} onChange={(e)=>setCatName(e.target.value)} placeholder="nome da categoria" />
            <Button variant="primary" onClick={()=>saveCategory().catch(e=>setErr(e.message))}>Salvar</Button>
          </div>
          <div className="list" style={{ marginTop: 12 }}>
            {categories.length === 0 ? <EmptyState title="Sem categorias" /> : categories.map(c => (
              <Card key={c.id} style={{ padding: 10 }}>{c.name}</Card>
            ))}
          </div>
        </Card>

        <Card>
          <div className="section-title">Novo produto</div>
          <div className="grid" style={{ marginTop: 10 }}>
            <Input value={pName} onChange={(e)=>setPName(e.target.value)} placeholder="nome" />
            <Input value={price} onChange={(e)=>setPrice(e.target.value)} placeholder="preco" />
            <Select value={categoryId} onChange={(e)=>setCategoryId(e.target.value)}>
              <option value="">Sem categoria</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
            <Select value={type} onChange={(e)=>setType(e.target.value)}>
              <option value="PRODUCED">PRODUCED</option>
              <option value="RESELL">RESELL</option>
            </Select>
            <Input value={cost} onChange={(e)=>setCost(e.target.value)} placeholder="custo (opcional)" />
            <Input value={imageUrl} onChange={(e)=>setImageUrl(e.target.value)} placeholder="foto (url)" />
            <Button variant="primary" onClick={()=>saveProduct().catch(e=>setErr(e.message))}>Salvar</Button>
          </div>
        </Card>
      </div>

      <Card>
        <div className="section-title">Produtos</div>
        <div className="list" style={{ marginTop: 10 }}>
          {products.length === 0 ? (
            <EmptyState title="Sem produtos" description="Crie o primeiro produto." />
          ) : products.map(p => (
            <Card key={p.id} style={{ padding: 10 }}>
              {editingId === p.id ? (
                <div className="grid">
                  <Input value={edit.name} onChange={(e)=>setEdit({ ...edit, name: e.target.value })} />
                  <Input value={edit.price} onChange={(e)=>setEdit({ ...edit, price: e.target.value })} />
                  <Select value={edit.categoryId} onChange={(e)=>setEdit({ ...edit, categoryId: e.target.value })}>
                    <option value="">Sem categoria</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </Select>
                  <Select value={edit.type} onChange={(e)=>setEdit({ ...edit, type: e.target.value })}>
                    <option value="PRODUCED">PRODUCED</option>
                    <option value="RESELL">RESELL</option>
                  </Select>
                  <Input value={edit.cost} onChange={(e)=>setEdit({ ...edit, cost: e.target.value })} placeholder="custo" />
                  <Input value={edit.imageUrl} onChange={(e)=>setEdit({ ...edit, imageUrl: e.target.value })} placeholder="foto (url)" />
                  <div className="inline">
                    <Button variant="primary" onClick={saveEdit}>Salvar</Button>
                    <Button onClick={()=>setEditingId(null)}>Cancelar</Button>
                  </div>
                </div>
              ) : (
                <div>
                  <b>{p.name}</b> - {money(p.price)}
                  <div className="muted" style={{ fontSize: 12 }}>{p.categoryRef?.name || "Sem categoria"} - {p.type}</div>
                  {p.cost != null ? <div className="muted" style={{ fontSize: 12 }}>Custo: {money(p.cost)}</div> : null}
                  <div className="inline" style={{ marginTop: 8 }}>
                    <Button onClick={()=>startEdit(p)}>Editar</Button>
                    <Button onClick={()=>toggleActive(p)}>{p.active ? "Desativar" : "Ativar"}</Button>
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
