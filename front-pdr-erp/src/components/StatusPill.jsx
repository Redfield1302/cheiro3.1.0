import useApiStatus from "../lib/useApiStatus";

export default function StatusPill() {
  const { online, lastCheck } = useApiStatus();
  return (
    <span className={"badge " + (online ? "ok" : "")}
      title={lastCheck ? `Ultima checagem: ${new Date(lastCheck).toLocaleTimeString()}` : ""}>
      <span className="dot" />
      API {online ? "online" : "offline"}
    </span>
  );
}
