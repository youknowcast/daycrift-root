const THEME_KEY = "theme";
const LIGHT = "light";
const DARK = "dark";

// localStorage はプライバシー設定等で例外を投げ得るため、
// すべての読み書きを try/catch で囲み、保存値は whitelist 検証する。
function readStored(): string | null {
  try {
    const value = localStorage.getItem(THEME_KEY);
    return value === LIGHT || value === DARK ? value : null;
  } catch {
    return null;
  }
}

function writeStored(value: string): void {
  try {
    localStorage.setItem(THEME_KEY, value);
  } catch {
    // ストレージが使えない場合は表示の切り替えだけ行う
  }
}

function getPreferredTheme(): string {
  const stored = readStored();
  if (stored) return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? DARK
    : LIGHT;
}

// Reuse the value already set by the inline FOUC-prevention script if available.
const inlineValue = (window as unknown as { __theme?: { value: string } })
  .__theme?.value;
let themeValue: string =
  inlineValue === LIGHT || inlineValue === DARK
    ? inlineValue
    : getPreferredTheme();

function persist(): void {
  writeStored(themeValue);
  reflect();
}

function reflect(): void {
  const root = document.firstElementChild;
  root?.setAttribute("data-theme", themeValue);
  root?.classList.toggle("dark", themeValue === DARK);
  document
    .querySelector("#theme-btn")
    ?.setAttribute("aria-pressed", String(themeValue === DARK));

  // Fill <meta name="theme-color"> with the computed background colour so
  // Android's browser chrome matches the page background.
  const bg = window.getComputedStyle(document.body).backgroundColor;
  document.querySelector("#theme-color")?.setAttribute("content", bg);
}

function setup(): void {
  reflect();
  document.querySelector("#theme-btn")?.addEventListener("click", () => {
    themeValue = themeValue === LIGHT ? DARK : LIGHT;
    persist();
  });
}

setup();

// Re-run after View Transitions navigation.
document.addEventListener("astro:after-swap", setup);

// Carry the theme-color value across View Transitions to prevent the
// Android navigation bar from flashing during page transitions.
document.addEventListener("astro:before-swap", event => {
  const color = document.querySelector("#theme-color")?.getAttribute("content");
  if (color) {
    (event as { newDocument: Document }).newDocument
      .querySelector("#theme-color")
      ?.setAttribute("content", color);
  }
});

// Sync with OS-level dark/light preference changes.
// ユーザーが明示的にテーマを選択している場合 (localStorage に保存済み) は
// OS の変更へ追従しない。追従時も保存せず、その場の表示だけ切り替える。
window
  .matchMedia("(prefers-color-scheme: dark)")
  .addEventListener("change", ({ matches }) => {
    if (readStored() !== null) return;
    themeValue = matches ? DARK : LIGHT;
    reflect();
  });
