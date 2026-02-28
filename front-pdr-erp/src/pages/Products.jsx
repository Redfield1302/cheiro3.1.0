import { useEffect, useMemo, useRef, useState } from "react";
import {
  createCategory,
  createProduct,
  getPizzaConfig,
  getProductRecipe,
  listCategories,
  listInventory,
  listProducts,
  savePizzaConfig,
  saveProductRecipe,
  updateProduct
} from "../lib/api";
import PageState from "../components/PageState.jsx";
import { Card } from "../components/ui/Card.jsx";
import { Input } from "../components/ui/Input.jsx";
import { Select } from "../components/ui/Select.jsx";
import { Button } from "../components/ui/Button.jsx";
import { EmptyState } from "../components/ui/EmptyState.jsx";
import { Modal } from "../components/ui/Modal.jsx";
import { useToast } from "../components/ui/Toast.jsx";

const money = (n) => Number(n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const moneyPlain = (n) => Number(n || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function emptySize() {
  return { name: "", maxFlavors: 2, active: true, sort: 0 };
}

function emptyFlavor() {
  return { name: "", description: "", active: true, sort: 0, prices: {} };
}

function parseDecimal(v) {
  const raw = String(v ?? "").trim();
  if (!raw) return NaN;
  const normalized = raw.includes(",") ? raw.replace(/\./g, "").replace(",", ".") : raw;
  return Number(normalized);
}

export default function Products() {
  const toast = useToast();
  const newImageFileRef = useRef(null);
  const editImageFileRef = useRef(null);
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const [catName, setCatName] = useState("");
  const [pName, setPName] = useState("");
  const [price, setPrice] = useState("0");
  const [categoryId, setCategoryId] = useState("");
  const [type, setType] = useState("PRODUCED");
  const [isPizza, setIsPizza] = useState(false);
  const [cost, setCost] = useState("");
  const [imageUrl, setImageUrl] = useState("");

  const [editingId, setEditingId] = useState(null);
  const [edit, setEdit] = useState({});

  const [pizzaOpen, setPizzaOpen] = useState(false);
  const [pizzaProduct, setPizzaProduct] = useState(null);
  const [pizzaRule, setPizzaRule] = useState("MAIOR_SABOR");
  const [pizzaSizes, setPizzaSizes] = useState([emptySize()]);
  const [pizzaFlavors, setPizzaFlavors] = useState([emptyFlavor()]);
  const [recipeOpen, setRecipeOpen] = useState(false);
  const [recipeProduct, setRecipeProduct] = useState(null);
  const [recipeItems, setRecipeItems] = useState([]);
  const [recipeInventory, setRecipeInventory] = useState([]);
  const [recipeLoading, setRecipeLoading] = useState(false);
  const [recipeIngredientOpen, setRecipeIngredientOpen] = useState(false);
  const [recipeDraft, setRecipeDraft] = useState({ ingredientType: "INVENTORY", inventoryItemId: "", ingredientProductId: "", quantity: "" });

  function readFileAsDataUrl(file, onDone) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onDone(String(reader.result || ""));
    reader.readAsDataURL(file);
  }

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

  useEffect(() => {
    refresh();
  }, []);

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
      isPizza,
      pizzaPricingRule: "MAIOR_SABOR",
      cost: cost === "" ? null : Number(cost),
      imageUrl: imageUrl || null
    });
    setPName("");
    setPrice("0");
    setCost("");
    setImageUrl("");
    setIsPizza(false);
    refresh();
  }

  function startEdit(p) {
    setEditingId(p.id);
    setEdit({
      name: p.name,
      price: p.price,
      categoryId: p.categoryId || "",
      type: p.type,
      isPizza: Boolean(p.isPizza),
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
        isPizza: Boolean(edit.isPizza),
        pizzaPricingRule: "MAIOR_SABOR",
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

  async function openPizza(product) {
    try {
      const cfg = await getPizzaConfig(product.id);
      setPizzaProduct(product);
      setPizzaRule(cfg.pizzaPricingRule || "MAIOR_SABOR");
      setPizzaSizes(cfg.sizes?.length ? cfg.sizes.map((s) => ({ ...s })) : [emptySize()]);
      setPizzaFlavors(
        cfg.flavors?.length
          ? cfg.flavors.map((f) => ({ ...f, description: f.description || "", prices: f.prices || {} }))
          : [emptyFlavor()]
      );
      setPizzaOpen(true);
    } catch (e) {
      toast.error(e.message);
    }
  }

  function addSize() {
    setPizzaSizes((s) => [...s, { ...emptySize(), sort: s.length }]);
  }

  function addFlavor() {
    setPizzaFlavors((s) => [...s, { ...emptyFlavor(), sort: s.length }]);
  }

  const sizeNames = useMemo(() => pizzaSizes.map((s) => s.name).filter(Boolean), [pizzaSizes]);

  async function savePizza() {
    if (!pizzaProduct) return;
    try {
      await savePizzaConfig(pizzaProduct.id, {
        isPizza: true,
        pizzaPricingRule: pizzaRule,
        sizes: pizzaSizes.filter((s) => s.name),
        flavors: pizzaFlavors.filter((f) => f.name)
      });
      toast.success("Configuracao de pizza salva");
      setPizzaOpen(false);
      refresh();
    } catch (e) {
      toast.error(e.message);
    }
  }

  async function openRecipe(product) {
    setRecipeOpen(true);
    setRecipeProduct(product);
    setRecipeLoading(true);
    try {
      const [recipe, inv] = await Promise.all([getProductRecipe(product.id), listInventory()]);
      setRecipeItems(recipe.items || []);
      setRecipeInventory(inv || []);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setRecipeLoading(false);
    }
  }

  const recipeProductOptions = useMemo(
    () => products.filter((p) => p.id !== recipeProduct?.id && p.active !== false && !p.isPizza),
    [products, recipeProduct]
  );

  function recipeItemKey(it) {
    return `${it.ingredientType}:${it.inventoryItemId || it.ingredientProductId}`;
  }

  function removeRecipeItem(item) {
    setRecipeItems((prev) => prev.filter((it) => recipeItemKey(it) !== recipeItemKey(item)));
  }

  function openIngredientModal() {
    setRecipeDraft({ ingredientType: "INVENTORY", inventoryItemId: "", ingredientProductId: "", quantity: "" });
    setRecipeIngredientOpen(true);
  }

  function addIngredientToRecipe() {
    const ingredientType = recipeDraft.ingredientType || "INVENTORY";
    const inventoryItemId = ingredientType === "INVENTORY" ? String(recipeDraft.inventoryItemId || "") : "";
    const ingredientProductId = ingredientType === "PRODUCT" ? String(recipeDraft.ingredientProductId || "") : "";
    const quantity = parseDecimal(recipeDraft.quantity);
    if (ingredientType === "INVENTORY" && !inventoryItemId) return toast.error("Selecione um insumo");
    if (ingredientType === "PRODUCT" && !ingredientProductId) return toast.error("Selecione um produto base");
    if (!Number.isFinite(quantity) || quantity <= 0) return toast.error("Quantidade deve ser maior que zero");

    let source = null;
    if (ingredientType === "INVENTORY") {
      source = recipeInventory.find((i) => i.id === inventoryItemId);
    } else {
      source = recipeProductOptions.find((p) => p.id === ingredientProductId);
    }
    if (!source) return toast.error("Origem nao encontrada");

    const sourceId = ingredientType === "INVENTORY" ? inventoryItemId : ingredientProductId;
    const sourceCost = ingredientType === "INVENTORY" ? Number(source.cost || 0) : Number(source.cost || 0);
    const sourceUnit = ingredientType === "INVENTORY" ? source.unit : (source.unit || "UN");
    const sourceName = source.name;

    setRecipeItems((prev) => {
      const exists = prev.find((it) => recipeItemKey(it) === `${ingredientType}:${sourceId}`);
      if (exists) {
        return prev.map((it) =>
          recipeItemKey(it) === `${ingredientType}:${sourceId}`
            ? { ...it, quantity, lineCost: quantity * sourceCost }
            : it
        );
      }
      return [
        ...prev,
        {
          ingredientType,
          inventoryItemId: ingredientType === "INVENTORY" ? sourceId : null,
          ingredientProductId: ingredientType === "PRODUCT" ? sourceId : null,
          sourceName,
          sourceUnit,
          sourceCost,
          quantity,
          lineCost: quantity * sourceCost
        }
      ];
    });
    setRecipeIngredientOpen(false);
  }

  async function saveRecipe() {
    if (!recipeProduct) return;
    try {
      await saveProductRecipe(recipeProduct.id, {
        items: recipeItems.map((it) => ({
          inventoryItemId: it.inventoryItemId || null,
          ingredientProductId: it.ingredientProductId || null,
          quantity: parseDecimal(it.quantity)
        }))
      });
      toast.success("Ficha tecnica salva");
      setRecipeOpen(false);
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
            <Input value={catName} onChange={(e) => setCatName(e.target.value)} placeholder="nome da categoria" />
            <Button variant="primary" onClick={() => saveCategory().catch((e) => setErr(e.message))}>Salvar</Button>
          </div>
          <div className="list" style={{ marginTop: 12 }}>
            {categories.length === 0 ? <EmptyState title="Sem categorias" /> : categories.map((c) => (
              <Card key={c.id} style={{ padding: 10 }}>{c.name}</Card>
            ))}
          </div>
        </Card>

        <Card>
          <div className="section-title">Novo produto</div>
          <div className="grid" style={{ marginTop: 10 }}>
            <Input value={pName} onChange={(e) => setPName(e.target.value)} placeholder="nome" />
            <Input value={price} onChange={(e) => setPrice(e.target.value)} placeholder="preco" />
            <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              <option value="">Sem categoria</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
            <Select value={type} onChange={(e) => setType(e.target.value)}>
              <option value="PRODUCED">PRODUCED</option>
              <option value="RESELL">RESELL</option>
            </Select>
            <label className="inline"><input type="checkbox" checked={isPizza} onChange={(e) => setIsPizza(e.target.checked)} /> Produto pizza fracionada</label>
            <Input value={cost} onChange={(e) => setCost(e.target.value)} placeholder="custo (opcional)" />
            <Input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="foto (url)" />
            <input
              ref={newImageFileRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={(e) => readFileAsDataUrl(e.target.files?.[0], setImageUrl)}
            />
            <div className="inline">
              <Button onClick={() => newImageFileRef.current?.click()}>Selecionar imagem do dispositivo</Button>
              <Button variant="ghost" onClick={() => setImageUrl("")}>Limpar</Button>
            </div>
            {imageUrl ? <img src={imageUrl} alt="Preview produto" style={{ width: 84, height: 84, objectFit: "cover", borderRadius: 10 }} /> : null}
            <Button variant="primary" onClick={() => saveProduct().catch((e) => setErr(e.message))}>Salvar</Button>
          </div>
        </Card>
      </div>

      <Card>
        <div className="section-title">Produtos</div>
        <div className="list" style={{ marginTop: 10 }}>
          {products.length === 0 ? (
            <EmptyState title="Sem produtos" description="Crie o primeiro produto." />
          ) : products.map((p) => (
            <Card key={p.id} style={{ padding: 10 }}>
              {editingId === p.id ? (
                <div className="grid">
                  <Input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} />
                  <Input value={edit.price} onChange={(e) => setEdit({ ...edit, price: e.target.value })} />
                  <Select value={edit.categoryId} onChange={(e) => setEdit({ ...edit, categoryId: e.target.value })}>
                    <option value="">Sem categoria</option>
                    {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </Select>
                  <Select value={edit.type} onChange={(e) => setEdit({ ...edit, type: e.target.value })}>
                    <option value="PRODUCED">PRODUCED</option>
                    <option value="RESELL">RESELL</option>
                  </Select>
                  <label className="inline"><input type="checkbox" checked={Boolean(edit.isPizza)} onChange={(e) => setEdit({ ...edit, isPizza: e.target.checked })} /> Produto pizza fracionada</label>
                  <Input value={edit.cost} onChange={(e) => setEdit({ ...edit, cost: e.target.value })} placeholder="custo" />
                  <Input value={edit.imageUrl} onChange={(e) => setEdit({ ...edit, imageUrl: e.target.value })} placeholder="foto (url)" />
                  <input
                    ref={editImageFileRef}
                    type="file"
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={(e) => readFileAsDataUrl(e.target.files?.[0], (v) => setEdit({ ...edit, imageUrl: v }))}
                  />
                  <div className="inline">
                    <Button onClick={() => editImageFileRef.current?.click()}>Selecionar imagem do dispositivo</Button>
                    <Button variant="ghost" onClick={() => setEdit({ ...edit, imageUrl: "" })}>Limpar</Button>
                  </div>
                  {edit.imageUrl ? <img src={edit.imageUrl} alt="Preview produto" style={{ width: 84, height: 84, objectFit: "cover", borderRadius: 10 }} /> : null}
                  <div className="inline">
                    <Button variant="primary" onClick={saveEdit}>Salvar</Button>
                    <Button onClick={() => setEditingId(null)}>Cancelar</Button>
                  </div>
                </div>
              ) : (
                <div>
                  <b>{p.name}</b> - {money(p.price)}
                  <div className="muted" style={{ fontSize: 12 }}>{p.categoryRef?.name || "Sem categoria"} - {p.type}{p.isPizza ? " - PIZZA" : ""}</div>
                  {p.cost != null ? <div className="muted" style={{ fontSize: 12 }}>Custo: {money(p.cost)}</div> : null}
                  <div className="inline" style={{ marginTop: 8 }}>
                    <Button onClick={() => startEdit(p)}>Editar</Button>
                    <Button onClick={() => toggleActive(p)}>{p.active ? "Desativar" : "Ativar"}</Button>
                    <Button onClick={() => openPizza(p)}>Config Pizza</Button>
                    <Button onClick={() => openRecipe(p)}>Ficha tecnica</Button>
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      </Card>

      <Modal open={pizzaOpen} title={`Config pizza - ${pizzaProduct?.name || ""}`} onClose={() => setPizzaOpen(false)}>
        <div className="grid pizza-config-modal">
          <Card>
            <div className="section-title">Fluxo de configuracao</div>
            <div className="muted" style={{ fontSize: 12, marginTop: 8 }}>
              1) Cadastre tamanhos e maximo de sabores. 2) Cadastre sabores. 3) Preencha o preco de cada sabor por tamanho.
            </div>
          </Card>

          <div className="inline pizza-rule-row">
            <div style={{ minWidth: 180 }}>Regra de preco</div>
            <Select value={pizzaRule} onChange={(e) => setPizzaRule(e.target.value)}>
              <option value="MAIOR_SABOR">MAIOR_SABOR</option>
              <option value="PROPORCIONAL">PROPORCIONAL</option>
            </Select>
          </div>

          <Card>
            <div className="section-title">Tamanhos</div>
            <div className="grid" style={{ marginTop: 8 }}>
              {pizzaSizes.map((s, i) => (
                <div key={i} className="inline pizza-size-row" style={{ alignItems: "center" }}>
                  <Input placeholder="Nome tamanho" value={s.name} onChange={(e) => {
                    const next = [...pizzaSizes];
                    next[i] = { ...next[i], name: e.target.value };
                    setPizzaSizes(next);
                  }} />
                  <Input placeholder="Max sabores" value={s.maxFlavors} onChange={(e) => {
                    const next = [...pizzaSizes];
                    next[i] = { ...next[i], maxFlavors: Number(e.target.value || 1) };
                    setPizzaSizes(next);
                  }} style={{ maxWidth: 140 }} />
                  <Button onClick={() => setPizzaSizes(pizzaSizes.filter((_, idx) => idx !== i))}>Remover</Button>
                </div>
              ))}
              <Button onClick={addSize}>Adicionar tamanho</Button>
            </div>
          </Card>

          <Card>
            <div className="section-title">Sabores e preco por tamanho</div>
            <div className="grid" style={{ marginTop: 8 }}>
              {pizzaFlavors.map((f, i) => (
                <Card key={i} style={{ padding: 10 }}>
                  <div className="inline pizza-flavor-head">
                    <Input placeholder="Nome sabor" value={f.name} onChange={(e) => {
                      const next = [...pizzaFlavors];
                      next[i] = { ...next[i], name: e.target.value };
                      setPizzaFlavors(next);
                    }} />
                    <Button onClick={() => setPizzaFlavors(pizzaFlavors.filter((_, idx) => idx !== i))}>Remover</Button>
                  </div>
                  <Input
                    placeholder="Descricao do sabor (ingredientes)"
                    value={f.description || ""}
                    onChange={(e) => {
                      const next = [...pizzaFlavors];
                      next[i] = { ...next[i], description: e.target.value };
                      setPizzaFlavors(next);
                    }}
                  />
                  <div className="pizza-price-grid" style={{ marginTop: 8 }}>
                    {sizeNames.map((sn) => (
                      <div key={sn} className="pizza-price-cell">
                        <div className="muted" style={{ fontSize: 12 }}>{sn}</div>
                        <Input value={f.prices?.[sn] ?? ""} onChange={(e) => {
                          const next = [...pizzaFlavors];
                          next[i] = { ...next[i], prices: { ...(next[i].prices || {}), [sn]: e.target.value } };
                          setPizzaFlavors(next);
                        }} placeholder="preco" />
                      </div>
                    ))}
                    {sizeNames.length === 0 ? <div className="state">Cadastre ao menos 1 tamanho para liberar os precos.</div> : null}
                  </div>
                </Card>
              ))}
              <Button onClick={addFlavor}>Adicionar sabor</Button>
            </div>
          </Card>

          <div className="inline pizza-config-actions">
            <Button variant="primary" onClick={savePizza}>Salvar configuracao</Button>
            <Button onClick={() => setPizzaOpen(false)}>Cancelar</Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={recipeOpen}
        title={`Ficha tecnica - ${recipeProduct?.name || ""}`}
        onClose={() => { setRecipeOpen(false); setRecipeIngredientOpen(false); }}
      >
        <div className="grid">
          <Card>
            <div className="section-title">Instrucoes</div>
            <div className="muted" style={{ fontSize: 12, marginTop: 8 }}>
              Informe os insumos e/ou produtos base e a quantidade para produzir 1 unidade do produto.
            </div>
          </Card>

          {recipeLoading ? <div className="state">Carregando ficha tecnica...</div> : null}

          <Card>
            <div className="inline" style={{ justifyContent: "space-between" }}>
              <div className="section-title">Itens da ficha</div>
              <Button onClick={openIngredientModal}>Adicionar item</Button>
            </div>

            <div className="list" style={{ marginTop: 10 }}>
              {recipeItems.length === 0 ? (
                <EmptyState title="Sem itens na ficha" description="Adicione os insumos do produto." />
              ) : recipeItems.map((it) => (
                <Card key={recipeItemKey(it)} style={{ padding: 10 }}>
                  <div className="inline" style={{ justifyContent: "space-between" }}>
                    <div>
                      <b>{it.sourceName}</b>
                      <div className="muted" style={{ fontSize: 12 }}>
                        {it.ingredientType === "PRODUCT" ? "Produto base" : "Insumo"} | {moneyPlain(it.quantity)} {it.sourceUnit} x {money(it.sourceCost || 0)}
                      </div>
                    </div>
                    <div className="inline">
                      <Input
                        value={it.quantity}
                        onChange={(e) => {
                          const q = e.target.value;
                          setRecipeItems((prev) =>
                            prev.map((x) =>
                              recipeItemKey(x) === recipeItemKey(it)
                                ? {
                                  ...x,
                                  quantity: q,
                                  lineCost: Number(q || 0) * Number(x.sourceCost || 0)
                                }
                                : x
                            )
                          );
                        }}
                        placeholder="Qtd"
                        style={{ width: 110 }}
                      />
                      <Button onClick={() => removeRecipeItem(it)}>Remover</Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </Card>

          <Card>
            <div className="section-title">Resumo de custo</div>
            <div style={{ marginTop: 8 }}>
              Custo total da ficha: <b>{money(recipeItems.reduce((sum, it) => sum + Number(it.lineCost || 0), 0))}</b>
            </div>
          </Card>

          <div className="inline">
            <Button variant="primary" onClick={saveRecipe}>Salvar ficha tecnica</Button>
            <Button onClick={() => setRecipeOpen(false)}>Cancelar</Button>
          </div>
        </div>
      </Modal>

      <Modal open={recipeIngredientOpen} title="Adicionar item da ficha" onClose={() => setRecipeIngredientOpen(false)}>
        <div className="grid">
          <div className="field-help">
            <div className="section-title">Tipo da origem</div>
            <div className="muted" style={{ fontSize: 12 }}>Use insumo para materia-prima. Use produto base para semiacabado (molho, massa).</div>
            <Select
              value={recipeDraft.ingredientType}
              onChange={(e) => setRecipeDraft((d) => ({
                ...d,
                ingredientType: e.target.value,
                inventoryItemId: "",
                ingredientProductId: ""
              }))}
            >
              <option value="INVENTORY">Insumo de estoque</option>
              <option value="PRODUCT">Produto base</option>
            </Select>
          </div>

          <div className="field-help">
            <div className="section-title">{recipeDraft.ingredientType === "PRODUCT" ? "Produto base" : "Insumo"}</div>
            <div className="muted" style={{ fontSize: 12 }}>
              {recipeDraft.ingredientType === "PRODUCT"
                ? "Selecione um produto produzido internamente para compor esta receita."
                : "Selecione o item do estoque que sera consumido na receita."}
            </div>
            {recipeDraft.ingredientType === "PRODUCT" ? (
              <Select value={recipeDraft.ingredientProductId} onChange={(e) => setRecipeDraft((d) => ({ ...d, ingredientProductId: e.target.value }))}>
                <option value="">Selecione um produto base</option>
                {recipeProductOptions.map((it) => (
                  <option key={it.id} value={it.id}>{it.name} ({it.unit || "UN"})</option>
                ))}
              </Select>
            ) : (
              <Select value={recipeDraft.inventoryItemId} onChange={(e) => setRecipeDraft((d) => ({ ...d, inventoryItemId: e.target.value }))}>
                <option value="">Selecione um insumo</option>
                {recipeInventory.map((it) => (
                  <option key={it.id} value={it.id}>{it.name} ({it.unit})</option>
                ))}
              </Select>
            )}
          </div>

          <div className="field-help">
            <div className="section-title">Quantidade</div>
            <div className="muted" style={{ fontSize: 12 }}>Quantidade usada para produzir 1 unidade do produto final.</div>
            <Input
              value={recipeDraft.quantity}
              onChange={(e) => setRecipeDraft((d) => ({ ...d, quantity: e.target.value }))}
              placeholder="Ex.: 0,150"
            />
          </div>

          <div className="inline">
            <Button variant="primary" onClick={addIngredientToRecipe}>Adicionar</Button>
            <Button onClick={() => setRecipeIngredientOpen(false)}>Cancelar</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
