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
          "background-light": "var(--color-background-light)",
        },
      },
    },
  },
};

function changeBrightness(hex, value) {
  // Remove the hash symbol if it exists
  hex = hex.replace("#", "");

  // Convert hex to RGB
  let r = parseInt(hex.slice(0, 2), 16);
  let g = parseInt(hex.slice(2, 4), 16);
  let b = parseInt(hex.slice(4, 6), 16);

  // Calculate the brightness change
  r = Math.min(255, Math.max(0, r * (1 + value / 100)));
  g = Math.min(255, Math.max(0, g * (1 + value / 100)));
  b = Math.min(255, Math.max(0, b * (1 + value / 100)));

  // Convert the new RGB values back to hex
  r = Math.round(r).toString(16).padStart(2, "0");
  g = Math.round(g).toString(16).padStart(2, "0");
  b = Math.round(b).toString(16).padStart(2, "0");

  // Return the new color in hex format
  return `#${r}${g}${b}`;
}

// Theme configuration
const themes = {
  default: {
    primary: "#3b82f6", // blue-500
    primary_background: "#e0e7ff", // blue-100
    secondary: "#6366f1", // indigo-500
    secondary_background: "#dbeafe", // indigo-100
    text: "#1f2937", // gray-800
    success: "#10b981", // green-500
    danger: "#ef4444", // red-500
    warning: "#f59e0b", // amber-500
    info: "#06b6d4", // cyan-500
    background: "#f9fafb", // gray-100
    background_dark: changeBrightness("#f9fafb", -2),
    background_darker: "#d1d5db", // gray-300
    background_light: "#f3f4f6", // gray-50
  },
  light: {
    primary: "#3b82f6", // blue-500
    primary_background: "#e0e7ff", // blue-100
    secondary: "#6366f1", // indigo-500
    secondary_background: "#dbeafe", // indigo-100
    text: "#1f2937", // gray-800
    success: "#10b981", // green-500
    danger: "#ef4444", // red-500
    warning: "#f59e0b", // amber-500
    info: "#06b6d4", // cyan-500
    background: "#f9fafb", // gray-100
    get background_dark() {
      return changeBrightness(this.background, -4);
    },
    get background_darker() {
      return changeBrightness(this.background, -8);
    },
    get background_light() {
      return changeBrightness(this.background, 2);
    },
  },
  dark: {
    primary: "#3b82f6", // blue-500
    primary_background: "#e0e7ff", // blue-100
    secondary: "#6366f1", // indigo-500
    secondary_background: "#dbeafe", // indigo-100
    text: "#fafafa", // zinc-50
    success: "#10b981", // green-500
    danger: "#ef4444", // red-500"
    warning: "#f59e0b", // amber-500
    info: "#06b6d4", // cyan-500
    background: "#18181b", // zinc-700
    get background_dark() {
      return changeBrightness(this.background, 15);
    },
    get background_darker() {
      return changeBrightness(this.background, 50);
    },
    get background_light() {
      return changeBrightness(this.background, 90);
    },
  },
};

Object.keys(themes.default).forEach((key) => {
  document.documentElement.style.setProperty(
    `--color-${key.replaceAll("_", "-")}`,
    themes.default[key]
  );
});

// Theme toggle icons
const themeIcons = {
  light: `<path stroke-linecap="round" stroke-linejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />`,
  dark: `<path stroke-linecap="round" stroke-linejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />`,
};

// Current active theme
let currentTheme = localStorage.getItem("dashboard-theme") || "default";

// Set theme for the entire dashboard
function applyTheme(themeName) {
  if (!themes[themeName]) {
    console.error(`Theme "${themeName}" not found. Using default.`);
    themeName = "light";
  }
  currentTheme = themeName;
  localStorage.setItem("dashboard-theme", themeName);
  const theme = themes[themeName];

  // Apply theme to document
  document.documentElement.classList.remove("light", "dark");
  document.documentElement.classList.add(themeName);

  // Set custom properties for colors
  Object.keys(theme).forEach((key) => {
    document.documentElement.style.setProperty(
      `--color-${key.replaceAll("_", "-")}`,
      theme[key]
    );
  });

  // Update theme toggle icon
  // Show sun icon for dark mode, moon icon for light mode
  const themeToggle = document.getElementById("themeToggle");
  if (themeToggle) {
    // Next theme would be the opposite of current
    const nextTheme = themeName === "light" ? "dark" : "light";
    themeToggle.firstElementChild.innerHTML = themeIcons[nextTheme];
  }

  // Update all charts with new theme
  //updateCharts();
}

// Toggle between light and dark themes
function toggleTheme() {
  const newTheme = currentTheme === "light" ? "dark" : "light";
  applyTheme(newTheme);
}

// Define global chart options based on theme
function getChartOptions() {
  const theme = themes[currentTheme];
  return {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: {
        position: "top",
        labels: {
          usePointStyle: true,
          font: {
            family: "Inter, system-ui, sans-serif",
            size: 12,
          },
          color: theme.text,
        },
      },
      tooltip: {
        backgroundColor: theme.background_dark,
        titleColor: theme.text,
        bodyColor: theme.text,
        titleFont: {
          family: "Inter, system-ui, sans-serif",
          size: 14,
        },
        bodyFont: {
          family: "Inter, system-ui, sans-serif",
          size: 13,
        },
        padding: 12,
        cornerRadius: 8,
        borderColor: theme.background_dark,
        borderWidth: 1,
      },
    },
    scales: {
      x: {
        grid: {
          color: theme.background_dark,
        },
        ticks: {
          color: theme.text,
        },
      },
      y: {
        grid: {
          color: theme.background_dark,
        },
        ticks: {
          color: theme.text,
        },
      },
    },
  };
}

// Theme toggle event listener
document.getElementById("themeToggle")?.addEventListener("click", () => {
  toggleTheme();
});
