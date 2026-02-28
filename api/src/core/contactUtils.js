function normalizePhoneForStorage(input) {
  const digits = String(input || "").replace(/\D/g, "");
  if (!digits) return null;

  let raw = digits;
  if (raw.startsWith("00")) raw = raw.slice(2);
  if (raw.startsWith("0")) raw = raw.slice(1);

  if (raw.startsWith("55")) return raw;
  if (raw.length === 10 || raw.length === 11) return `55${raw}`;
  return raw;
}

function normalizeAddressForStorage(input) {
  return String(input || "")
    .replace(/\s+/g, " ")
    .replace(/\s*,\s*/g, ", ")
    .trim();
}

module.exports = {
  normalizePhoneForStorage,
  normalizeAddressForStorage
};

