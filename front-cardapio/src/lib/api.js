async function req(path, options = {}) {
  const headers = new Headers(options.headers || {});
  if (options.body && !headers.get("Content-Type")) headers.set("Content-Type", "application/json");

  const res = await fetch(path, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || data?.message || `HTTP ${res.status}`);
  return data;
}

export const getTenant = (slug) => req(`/api/menu/${slug}`);
export const getCategories = (slug) => req(`/api/menu/${slug}/categories`);
export const getProducts = (slug, categoryId) =>
  req(`/api/menu/${slug}/products${categoryId ? `?categoryId=${encodeURIComponent(categoryId)}` : ""}`);

export const getProduct = (slug, id) => req(`/api/menu/${slug}/products/${id}`);

export const createOrder = (slug, payload) =>
  req(`/api/menu/${slug}/orders`, { method: "POST", body: JSON.stringify(payload) });
