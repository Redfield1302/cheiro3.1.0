import { createContext, useContext, useMemo, useState } from "react";

const ToastCtx = createContext(null);

export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);

  const api = useMemo(() => ({
    success: (message) => add("success", message),
    error: (message) => add("error", message)
  }), []);

  function add(type, message) {
    const id = Math.random().toString(36).slice(2);
    setItems((s) => [...s, { id, type, message }]);
    setTimeout(() => setItems((s) => s.filter((i) => i.id !== id)), 3000);
  }

  return (
    <ToastCtx.Provider value={api}>
      {children}
      <div className="toast-host">
        {items.map((t) => (
          <div key={t.id} className={`toast ${t.type}`}>{t.message}</div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error("ToastProvider missing");
  return ctx;
}
