export function Badge({ tone = "default", children }) {
  const cls = tone === "ok" ? "badge ok" : "badge";
  return <span className={cls}>{children}</span>;
}
