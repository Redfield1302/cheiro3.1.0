import { useEffect, useState } from "react";
import PageState from "../components/PageState.jsx";
import { Card } from "../components/ui/Card.jsx";
import { Input } from "../components/ui/Input.jsx";
import { Button } from "../components/ui/Button.jsx";
import { getTenantMe } from "../lib/api";

export default function TenantSettings() {
  const [tenant, setTenant] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function refresh() {
    setErr("");
    setLoading(true);
    try {
      setTenant(await getTenantMe());
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(()=>{ refresh(); },[]);

  return (
    <div className="grid" style={{ maxWidth: 720 }}>
      <PageState loading={loading} error={err} />
      <Card>
        <div className="section-title">Dados do estabelecimento</div>
        <div className="grid" style={{ marginTop: 10 }}>
          <Input value={tenant?.name || ""} placeholder="nome" readOnly />
          <Input value={tenant?.slug || ""} placeholder="slug" readOnly />
          <Input value={tenant?.segment || ""} placeholder="segmento" readOnly />
          <Input value={tenant?.logoUrl || ""} placeholder="logo url" readOnly />
          <Button variant="ghost" onClick={refresh}>Recarregar</Button>
        </div>
      </Card>
    </div>
  );
}
