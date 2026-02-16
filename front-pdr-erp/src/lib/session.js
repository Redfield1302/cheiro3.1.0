const KEY = "cg_session_v3";
export const getSession = () => JSON.parse(localStorage.getItem(KEY) || "null");
export const setSession = (s) => localStorage.setItem(KEY, JSON.stringify(s));
export const clearSession = () => localStorage.removeItem(KEY);
export const token = () => getSession()?.token || null;
export const tenant = () => getSession()?.tenant || null;
