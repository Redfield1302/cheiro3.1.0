const THEME_KEY = "cg_theme";
const DEFAULT_THEME = "magenta";

export function getTheme() {
  return localStorage.getItem(THEME_KEY) || DEFAULT_THEME;
}

export function applyTheme(theme) {
  const value = theme || DEFAULT_THEME;
  document.documentElement.setAttribute("data-theme", value);
}

export function setTheme(theme) {
  localStorage.setItem(THEME_KEY, theme);
  applyTheme(theme);
}

export function initTheme() {
  applyTheme(getTheme());
}

export const THEMES = [
  { id: "magenta", label: "Magenta / Vinho" },
  { id: "corporate-blue", label: "Azul Corporativo" }
];

