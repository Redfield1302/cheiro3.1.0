import { clearSession, getSession } from "../lib/session";
import StatusPill from "./StatusPill.jsx";

export default function Topbar({ title, subtitle }) {
  const s = getSession();

  return (
    <header className="topbar">
      <div>
        <div className="title">{title}</div>
        {subtitle ? <div className="muted" style={{ fontSize: 12 }}>{subtitle}</div> : null}
      </div>

      <div style={{ marginLeft: "auto", display: "flex", gap: 10, alignItems: "center" }}>
        <StatusPill />
        <span className="badge">{s?.tenant?.name || "Sem tenant"}</span>
        <button className="btn" onClick={() => { clearSession(); window.location.href = "/login"; }}>
          Sair
        </button>
      </div>
    </header>
  );
}
