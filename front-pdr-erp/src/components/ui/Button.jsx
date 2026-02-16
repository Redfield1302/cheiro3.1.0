export function Button({ variant = "default", className = "", ...props }) {
  const base = "btn" + (variant === "primary" ? " btn-primary" : variant === "ghost" ? " btn-ghost" : "");
  return <button className={`${base} ${className}`} {...props} />;
}
