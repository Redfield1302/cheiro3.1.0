import { useState } from "react";
import { Button } from "../components/ui/Button.jsx";
import { Card } from "../components/ui/Card.jsx";
import { Input } from "../components/ui/Input.jsx";
import { register } from "../lib/api";
import { setSession } from "../lib/session";

export default function Register() {
  const [tenantName, setTenantName] = useState("");
  const [tenantSlug, setTenantSlug] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      const session = await register({
        tenantName,
        tenantSlug,
        name,
        email,
        password
      });
      setSession(session);
      window.location.href = "/dashboard";
    } catch (e2) {
      setErr(e2.message || "Erro ao criar conta");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 16 }}>
      <Card style={{ width: "min(520px, 100%)" }}>
        <h2 style={{ marginTop: 0 }}>Cadastro do Estabelecimento</h2>
        <div className="muted" style={{ marginTop: -4, marginBottom: 12 }}>
          Crie seu tenant e o usuario administrador.
        </div>

        {err ? <div className="state error">{err}</div> : null}

        <form onSubmit={onSubmit} className="grid" style={{ marginTop: 12 }}>
          <div className="grid" style={{ gap: 6 }}>
            <label>Nome do estabelecimento</label>
            <Input
              value={tenantName}
              onChange={(e) => setTenantName(e.target.value)}
              placeholder="Ex: Planeta Pizza"
              required
            />
          </div>

          <div className="grid" style={{ gap: 6 }}>
            <label>Slug do tenant (opcional)</label>
            <Input
              value={tenantSlug}
              onChange={(e) => setTenantSlug(e.target.value)}
              placeholder="Ex: planeta-pizza"
            />
          </div>

          <div className="grid" style={{ gap: 6 }}>
            <label>Nome do administrador</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Jair"
              required
            />
          </div>

          <div className="grid" style={{ gap: 6 }}>
            <label>Email de acesso</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@empresa.com"
              required
            />
          </div>

          <div className="grid" style={{ gap: 6 }}>
            <label>Senha (minimo 6 caracteres)</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="******"
              minLength={6}
              required
            />
          </div>

          <Button variant="primary" disabled={loading}>
            {loading ? "Criando conta..." : "Criar conta"}
          </Button>
        </form>

        <div style={{ marginTop: 12 }}>
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              window.location.href = "/login";
            }}
          >
            Voltar para login
          </Button>
        </div>
      </Card>
    </div>
  );
}
