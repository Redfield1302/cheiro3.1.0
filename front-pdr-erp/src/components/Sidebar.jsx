import { NavLink } from "react-router-dom";

const items = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/pdv", label: "PDV" },
  { to: "/cash", label: "Caixa" },
  { to: "/inventory", label: "Estoque" },
  { to: "/products", label: "Produtos" },
  { to: "/categories", label: "Categorias" },
  { to: "/orders", label: "Pedidos" },
  { to: "/kitchen", label: "Cozinha" },
  { to: "/conversations", label: "Atendimento" }
];

export default function Sidebar({ isOpen = false, onClose = () => {} }) {
  return (
    <>
    <aside className={`sidebar ${isOpen ? "open" : ""}`}>
      <div className="brand">
        <div className="brand-badge">CG</div>
        <div>
          <div>Cheio Gestor</div>
          <div className="muted" style={{ fontSize: 12 }}>v4.0.0</div>
        </div>
      </div>

      <div className="section-title">Operacao</div>
      <nav className="nav" style={{ marginTop: 8 }}>
        {items.map((it) => (
          <NavLink key={it.to} to={it.to} onClick={onClose} className={({ isActive }) => (isActive ? "active" : "")}> {it.label} </NavLink>
        ))}
      </nav>

      <div style={{ marginTop: 24 }} className="section-title">Sistema</div>
      <div className="list" style={{ marginTop: 8 }}>
        <NavLink className={({ isActive }) => (isActive ? "badge" : "badge")} to="/settings/tenant" onClick={onClose}>Dados do estabelecimento</NavLink>
        <a className="badge" href="/t/minhapizzaria" target="_blank" rel="noreferrer">Cardapio digital</a>
      </div>
    </aside>
    {isOpen ? <button className="mobile-overlay" onClick={onClose} aria-label="Fechar menu" /> : null}
    </>
  );
}
