export function Select(props) {
  return <select className={`select ${props.className || ""}`} {...props} />;
}
