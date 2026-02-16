import { useState } from "react";
import { login } from "../lib/api";
import { setSession } from "../lib/session";
import { Button } from "../components/ui/Button.jsx";
import { Input } from "../components/ui/Input.jsx";
import { Card } from "../components/ui/Card.jsx";

export default function Login() {
  const [email, setEmail] = useState("admin@test.com");
  const [password, setPassword] = useState("admin123");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      const res = await login(email, password);
      setSession(res);
      window.location.href = "/pdv";
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
      <Card style={{ width: 420 }}>
        <h2 style={{ marginTop: 0 }}>Login</h2>
        {err ? <div className="state error">{err}</div> : null}
        <form onSubmit={onSubmit} className="grid" style={{ marginTop: 12 }}>
          <Input value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="email" />
          <Input value={password} onChange={(e)=>setPassword(e.target.value)} type="password" placeholder="senha" />
          <Button variant="primary" disabled={loading}>
            {loading ? "Entrando..." : "Entrar"}
          </Button>
        </form>
        <div className="muted" style={{ marginTop: 12, fontSize: 12 }}>
          Sessao persistente, tenant automatico.
        </div>
      </Card>
    </div>
  );
}
