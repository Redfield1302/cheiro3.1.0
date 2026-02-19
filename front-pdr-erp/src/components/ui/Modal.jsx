export function Modal({ open, title, children, onClose }) {
  if (!open) return null;
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="inline modal-header" style={{ justifyContent: "space-between" }}>
          <b>{title}</b>
          <button className="btn" onClick={onClose}>Fechar</button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}
