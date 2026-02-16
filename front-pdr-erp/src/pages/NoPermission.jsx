export default function NoPermission() {
  return (
    <div className="card" style={{ maxWidth: 520 }}>
      <h2 style={{ marginTop: 0 }}>Sem permissao</h2>
      <p className="muted">Sua role nao permite acessar esta tela.</p>
      <a className="btn" href="/pdv">Voltar</a>
    </div>
  );
}
