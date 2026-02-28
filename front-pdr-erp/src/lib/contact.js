export function formatarTelefoneParaWhatsApp(telefone) {
  const digits = String(telefone || "").replace(/\D/g, "");
  if (!digits) return "";

  let raw = digits;
  if (raw.startsWith("00")) raw = raw.slice(2);
  if (raw.startsWith("0")) raw = raw.slice(1);

  if (raw.startsWith("55")) return raw;
  if (raw.length === 10 || raw.length === 11) return `55${raw}`;
  return raw;
}

export function montarEnderecoParaMapa(order) {
  const parts = [
    order?.address?.street || "",
    order?.address?.number || "",
    order?.address?.neighborhood || "",
    order?.address?.city || "",
    order?.address?.state || "",
    order?.address?.postalCode || "",
    order?.address?.reference || ""
  ]
    .map((p) => String(p).replace(/\s+/g, " ").trim())
    .filter(Boolean);

  return parts.join(", ");
}

export function buildWhatsAppLink(telefone) {
  const normalized = formatarTelefoneParaWhatsApp(telefone);
  return normalized ? `https://wa.me/${normalized}` : "";
}

export function buildGoogleMapsSearchLink(endereco) {
  const normalized = String(endereco || "").replace(/\s+/g, " ").trim();
  return normalized
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(normalized)}`
    : "";
}

