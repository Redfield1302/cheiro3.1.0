import { useEffect, useState } from "react";

export default function useApiStatus() {
  const [online, setOnline] = useState(true);
  const [lastCheck, setLastCheck] = useState(null);

  useEffect(() => {
    let alive = true;

    async function ping() {
      try {
        const res = await fetch("/health");
        if (!alive) return;
        setOnline(res.ok);
        setLastCheck(Date.now());
      } catch {
        if (!alive) return;
        setOnline(false);
        setLastCheck(Date.now());
      }
    }

    ping();
    const id = setInterval(ping, 15000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  return { online, lastCheck };
}
