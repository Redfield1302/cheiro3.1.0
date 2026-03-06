const KEY = "cg_delivery_session_v1";

export const getDeliverySession = () => JSON.parse(localStorage.getItem(KEY) || "null");
export const setDeliverySession = (s) => localStorage.setItem(KEY, JSON.stringify(s));
export const clearDeliverySession = () => localStorage.removeItem(KEY);
export const deliveryToken = () => getDeliverySession()?.token || null;
