import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar.jsx";
import Topbar from "./Topbar.jsx";

const titles = {
  "/pdv": { title: "PDV", subtitle: "Venda rapida de balcao" },
  "/cash": { title: "Caixa", subtitle: "Abertura, fechamento e movimentos" },
  "/inventory": { title: "Estoque", subtitle: "Insumos e movimentacoes" },
  "/products": { title: "Produtos", subtitle: "Catalogo interno" },
  "/conversations": { title: "Atendimento", subtitle: "Inbox e mensagens" }
};

export default function Layout() {
  const loc = useLocation();
  const meta = titles[loc.pathname] || { title: "Cheio Gestor", subtitle: "" };

  return (
    <div className="app">
      <Sidebar />
      <div className="main">
        <Topbar title={meta.title} subtitle={meta.subtitle} />
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
