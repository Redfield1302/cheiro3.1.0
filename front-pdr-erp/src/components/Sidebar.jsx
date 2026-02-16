import { NavLink } from "react-router-dom";

const items = [
  { to: "/pdv", label: "PDV" },
  { to: "/cash", label: "Caixa" },
  { to: "/inventory", label: "Estoque" },
  { to: "/products", label: "Produtos" },
  { to: "/categories", label: "Categorias" },
  { to: "/orders", label: "Pedidos" },
  { to: "/conversations", label: "Atendimento" }
];

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-badge">CG</div>
        <div>
          <div>Cheio Gestor</div>
          <div className="muted" style={{ fontSize: 12 }}>v3.2.0</div>
        </div>
      </div>

      <div className="section-title">Operacao</div>
      <nav className="nav" style={{ marginTop: 8 }}>
        {items.map((it) => (
          <NavLink key={it.to} to={it.to} className={({ isActive }) => (isActive ? "active" : "")}> {it.label} </NavLink>
        ))}
      </nav>

      <div style={{ marginTop: 24 }} className="section-title">Sistema</div>
      <div className="list" style={{ marginTop: 8 }}>
        <NavLink className={({ isActive }) => (isActive ? "badge" : "badge")} to="/settings/tenant">Dados do estabelecimento</NavLink>
        <a className="badge" href="/t/minhapizzaria" target="_blank" rel="noreferrer">Cardapio digital</a>
      </div>
    </aside>
  );
}
