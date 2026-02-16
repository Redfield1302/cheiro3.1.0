import { useEffect, useState } from "react";
import PageState from "../components/PageState.jsx";
import { Card } from "../components/ui/Card.jsx";
import { EmptyState } from "../components/ui/EmptyState.jsx";
import { listConversations, getConversation } from "../lib/api";

export default function Conversations() {
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function refresh() {
    setErr("");
    setLoading(true);
    try {
      const data = await listConversations();
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function openConversation(id) {
    try {
      const data = await getConversation(id);
      setSelected(data);
      setMessages(data?.messages || []);
    } catch (e) {
      setErr(e.message);
    }
  }

  useEffect(()=>{ refresh(); },[]);

  return (
    <div className="grid grid-2">
      <PageState loading={loading} error={err} />

      <Card>
        <div className="section-title">Conversas</div>
        <div className="list" style={{ marginTop: 10 }}>
          {items.length === 0 ? (
            <EmptyState title="Inbox vazio" description="Sem conversas no momento." />
          ) : items.map(c => (
            <Card key={c.id} style={{ padding: 10 }}>
              <div className="inline" style={{ justifyContent: "space-between" }}>
                <b>{c.customer?.name || c.customerId || c.id}</b>
                <button className="btn" onClick={()=>openConversation(c.id)}>Abrir</button>
              </div>
              <div className="muted" style={{ fontSize: 12 }}>Atualizado: {new Date(c.updatedAt || c.createdAt).toLocaleString()}</div>
            </Card>
          ))}
        </div>
      </Card>

      <Card>
        <div className="section-title">Mensagens</div>
        {selected ? (
          <div className="list" style={{ marginTop: 10 }}>
            {messages.length === 0 ? (
              <EmptyState title="Sem mensagens" />
            ) : messages.map(m => (
              <div key={m.id} className="state">{m.sender}: {m.content}</div>
            ))}
          </div>
        ) : (
          <EmptyState title="Selecione uma conversa" description="Clique em uma conversa para ver mensagens." />
        )}
      </Card>
    </div>
  );
}
