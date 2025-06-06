// Built with Bun at 2025-06-05T10:39:13.543Z
// public/js/styler.js
tailwind.config = {
  theme: {
    extend: {
      colors: {
        theme: {
          primary: "var(--color-primary)",
          "primary-background": "var(--color-primary-background)",
          secondary: "var(--color-secondary)",
          "secondary-background": "var(--color-secondary-background)",
          text: "var(--color-text)",
          success: "var(--color-success)",
          danger: "var(--color-danger)",
          warning: "var(--color-warning)",
          info: "var(--color-info)",
          background: "var(--color-background)",
          "background-dark": "var(--color-background-dark)",
          "background-darker": "var(--color-background-darker)",
          "background-light": "var(--color-background-light)"
        }
      }
    }
  }
};
function changeBrightness(hex, value) {
  hex = hex.replace("#", "");
  let r = parseInt(hex.slice(0, 2), 16);
  let g = parseInt(hex.slice(2, 4), 16);
  let b = parseInt(hex.slice(4, 6), 16);
  r = Math.min(255, Math.max(0, r * (1 + value / 100)));
  g = Math.min(255, Math.max(0, g * (1 + value / 100)));
  b = Math.min(255, Math.max(0, b * (1 + value / 100)));
  r = Math.round(r).toString(16).padStart(2, "0");
  g = Math.round(g).toString(16).padStart(2, "0");
  b = Math.round(b).toString(16).padStart(2, "0");
  return `#${r}${g}${b}`;
}
var themes = {
  default: {
    primary: "#3b82f6",
    primary_background: "#e0e7ff",
    secondary: "#6366f1",
    secondary_background: "#dbeafe",
    text: "#1f2937",
    success: "#10b981",
    danger: "#ef4444",
    warning: "#f59e0b",
    info: "#06b6d4",
    background: "#f9fafb",
    background_dark: changeBrightness("#f9fafb", -2),
    background_darker: "#d1d5db",
    background_light: "#f3f4f6"
  },
  light: {
    primary: "#3b82f6",
    primary_background: "#e0e7ff",
    secondary: "#6366f1",
    secondary_background: "#dbeafe",
    text: "#1f2937",
    success: "#10b981",
    danger: "#ef4444",
    warning: "#f59e0b",
    info: "#06b6d4",
    background: "#f9fafb",
    get background_dark() {
      return changeBrightness(this.background, -4);
    },
    get background_darker() {
      return changeBrightness(this.background, -8);
    },
    get background_light() {
      return changeBrightness(this.background, 2);
    }
  },
  dark: {
    primary: "#3b82f6",
    primary_background: "#e0e7ff",
    secondary: "#6366f1",
    secondary_background: "#dbeafe",
    text: "#fafafa",
    success: "#10b981",
    danger: "#ef4444",
    warning: "#f59e0b",
    info: "#06b6d4",
    background: "#18181b",
    get background_dark() {
      return changeBrightness(this.background, 15);
    },
    get background_darker() {
      return changeBrightness(this.background, 50);
    },
    get background_light() {
      return changeBrightness(this.background, 90);
    }
  }
};
Object.keys(themes.default).forEach((key) => {
  document.documentElement.style.setProperty(`--color-${key.replaceAll("_", "-")}`, themes.default[key]);
});
var themeIcons = {
  light: `<path stroke-linecap="round" stroke-linejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />`,
  dark: `<path stroke-linecap="round" stroke-linejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />`
};
var currentTheme = localStorage.getItem("dashboard-theme") || "default";
function applyTheme(themeName) {
  if (!themes[themeName]) {
    console.error(`Theme "${themeName}" not found. Using default.`);
    themeName = "light";
  }
  currentTheme = themeName;
  localStorage.setItem("dashboard-theme", themeName);
  const theme = themes[themeName];
  document.documentElement.classList.remove("light", "dark");
  document.documentElement.classList.add(themeName);
  Object.keys(theme).forEach((key) => {
    document.documentElement.style.setProperty(`--color-${key.replaceAll("_", "-")}`, theme[key]);
  });
  const themeToggle = document.getElementById("themeToggle");
  if (themeToggle) {
    const nextTheme = themeName === "light" ? "dark" : "light";
    themeToggle.firstElementChild.innerHTML = themeIcons[nextTheme];
  }
}
function toggleTheme() {
  const newTheme = currentTheme === "light" ? "dark" : "light";
  applyTheme(newTheme);
}
document.getElementById("themeToggle")?.addEventListener("click", () => {
  toggleTheme();
});
