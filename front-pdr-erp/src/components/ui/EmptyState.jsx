export function EmptyState({ title = "Sem dados", description = "" }) {
  return (
    <div className="empty">
      <b>{title}</b>
      {description ? <div className="muted" style={{ marginTop: 6 }}>{description}</div> : null}
    </div>
  );
}
