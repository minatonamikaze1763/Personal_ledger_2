
const themes = {
  // 1. Light
  light: {
    "--primary-color": "#1e3a8a",
    "--secondary-color": "#e0f2fe",
    "--accent-color": "#3b82f6",
    "--hover-color": "#1d4ed8",
    "--border-color": "#93c5fd",
    "--text-color": "#0f172a",
    "--bg-color": "#ffffff",
    "--danger-color": "#dc2626"
  },
  
  // 2. Dark
  dark: {
    "--primary-color": "#0f172a",
    "--secondary-color": "#1e293b",
    "--accent-color": "#3b82f6",
    "--hover-color": "#2563eb",
    "--border-color": "#334155",
    "--text-color": "#f1f5f9",
    "--bg-color": "#0f172a",
    "--danger-color": "#f87171"
  },
  
  // 3. Gradient (Base theme)
  gradient: {
    "--primary-color": "#0f766e",
    "--secondary-color": "#e0f2fe",
    "--accent-color": "#6366f1",
    "--hover-color": "#312e81",
    "--border-color": "#a5f3fc",
    "--text-color": "#0f172a",
    "--bg-color": "#f0f9ff",
    "--danger-color": "#dc2626"
  },
  
  // 4. Ocean Breeze
  ocean: {
    "--primary-color": "#1e3a8a",
    "--secondary-color": "#e0f7fa",
    "--accent-color": "#06b6d4",
    "--hover-color": "#0284c7",
    "--border-color": "#67e8f9",
    "--text-color": "#082f49",
    "--bg-color": "#ecfeff",
    "--danger-color": "#e11d48"
  },
  
  // 5. Sunset Glow
  sunset: {
    "--primary-color": "#f97316",
    "--secondary-color": "#fff7ed",
    "--accent-color": "#fb923c",
    "--hover-color": "#ea580c",
    "--border-color": "#fdba74",
    "--text-color": "#431407",
    "--bg-color": "#ffedd5",
    "--danger-color": "#b91c1c"
  },
  
  // 6. Aurora
  aurora: {
    "--primary-color": "#14b8a6",
    "--secondary-color": "#f0fdfa",
    "--accent-color": "#3b82f6",
    "--hover-color": "#0ea5e9",
    "--border-color": "#99f6e4",
    "--text-color": "#083344",
    "--bg-color": "#ecfeff",
    "--danger-color": "#f43f5e"
  },
  
  // 7. Candy
  candy: {
    "--primary-color": "#ec4899",
    "--secondary-color": "#fdf2f8",
    "--accent-color": "#a78bfa",
    "--hover-color": "#c026d3",
    "--border-color": "#fbcfe8",
    "--text-color": "#4a044e",
    "--bg-color": "#fce7f3",
    "--danger-color": "#e11d48"
  },
  
  // 8. Lava
  lava: {
    "--primary-color": "#b91c1c",
    "--secondary-color": "#fef2f2",
    "--accent-color": "#f97316",
    "--hover-color": "#c2410c",
    "--border-color": "#fca5a5",
    "--text-color": "#450a0a",
    "--bg-color": "#fff5f5",
    "--danger-color": "#7f1d1d"
  },
  
  // 9. Emerald
  emerald: {
    "--primary-color": "#059669",
    "--secondary-color": "#ecfdf5",
    "--accent-color": "#10b981",
    "--hover-color": "#047857",
    "--border-color": "#6ee7b7",
    "--text-color": "#064e3b",
    "--bg-color": "#d1fae5",
    "--danger-color": "#dc2626"
  },
  
  // 10. Skyfall
  skyfall: {
    "--primary-color": "#2563eb",
    "--secondary-color": "#dbeafe",
    "--accent-color": "#0ea5e9",
    "--hover-color": "#1e40af",
    "--border-color": "#93c5fd",
    "--text-color": "#1e3a8a",
    "--bg-color": "#eff6ff",
    "--danger-color": "#ef4444"
  },
  
  // 11. Coral Reef
  coral: {
    "--primary-color": "#fb7185",
    "--secondary-color": "#fff1f2",
    "--accent-color": "#f97316",
    "--hover-color": "#be123c",
    "--border-color": "#fecdd3",
    "--text-color": "#881337",
    "--bg-color": "#ffe4e6",
    "--danger-color": "#e11d48"
  },
  
  // 12. Galaxy
  galaxy: {
    "--primary-color": "#6d28d9",
    "--secondary-color": "#ede9fe",
    "--accent-color": "#6366f1",
    "--hover-color": "#7c3aed",
    "--border-color": "#c4b5fd",
    "--text-color": "#312e81",
    "--bg-color": "#f5f3ff",
    "--danger-color": "#f43f5e"
  },
  
  // 13. Flame
  flame: {
    "--primary-color": "#ea580c",
    "--secondary-color": "#fff7ed",
    "--accent-color": "#facc15",
    "--hover-color": "#b45309",
    "--border-color": "#fed7aa",
    "--text-color": "#7c2d12",
    "--bg-color": "#fffbeb",
    "--danger-color": "#b91c1c"
  },
  
  // 14. Jade
  jade: {
    "--primary-color": "#065f46",
    "--secondary-color": "#ecfdf5",
    "--accent-color": "#22c55e",
    "--hover-color": "#047857",
    "--border-color": "#bbf7d0",
    "--text-color": "#052e16",
    "--bg-color": "#f0fdf4",
    "--danger-color": "#dc2626"
  },
  
  // 15. Royal
  royal: {
    "--primary-color": "#3730a3",
    "--secondary-color": "#eef2ff",
    "--accent-color": "#4f46e5",
    "--hover-color": "#312e81",
    "--border-color": "#c7d2fe",
    "--text-color": "#1e1b4b",
    "--bg-color": "#e0e7ff",
    "--danger-color": "#7f1d1d"
  },
  
  // 16. Blossom
  blossom: {
    "--primary-color": "#f472b6",
    "--secondary-color": "#fdf2f8",
    "--accent-color": "#f9a8d4",
    "--hover-color": "#db2777",
    "--border-color": "#fbcfe8",
    "--text-color": "#831843",
    "--bg-color": "#fce7f3",
    "--danger-color": "#be123c"
  },
  
  // 17. Horizon
  horizon: {
    "--primary-color": "#0ea5e9",
    "--secondary-color": "#f0f9ff",
    "--accent-color": "#22d3ee",
    "--hover-color": "#0284c7",
    "--border-color": "#bae6fd",
    "--text-color": "#082f49",
    "--bg-color": "#e0f2fe",
    "--danger-color": "#dc2626"
  },
  
  // 18. Desert
  desert: {
    "--primary-color": "#b45309",
    "--secondary-color": "#fffbeb",
    "--accent-color": "#fbbf24",
    "--hover-color": "#92400e",
    "--border-color": "#fde68a",
    "--text-color": "#451a03",
    "--bg-color": "#fef9c3",
    "--danger-color": "#b91c1c"
  },
  
  // 19. Twilight
  twilight: {
    "--primary-color": "#7c3aed",
    "--secondary-color": "#f3e8ff",
    "--accent-color": "#06b6d4",
    "--hover-color": "#5b21b6",
    "--border-color": "#ddd6fe",
    "--text-color": "#2e1065",
    "--bg-color": "#faf5ff",
    "--danger-color": "#e11d48"
  },
  
  // 20. Cyberwave
  cyberwave: {
    "--primary-color": "#ff007f",
    "--secondary-color": "#0f0f1a",
    "--accent-color": "#00fff7",
    "--hover-color": "#ff4dff",
    "--border-color": "#39ff14",
    "--text-color": "#f8f9fa",
    "--bg-color": "#1a1a2e",
    "--danger-color": "#ff1744"
  }
};

const themeBtn = document.getElementById("themeBtn");
const themeOptions = document.getElementById("themeOptions");

const themeSelect = document.getElementById("themeSelect");
/*
function applyTheme(themeName) {
  const theme = themes[themeName];
  if (!theme) return;
  
  // Apply CSS variables to root element
  Object.keys(theme).forEach(key => {
    document.documentElement.style.setProperty(key, theme[key]);
  });
  
  // Save current theme
  localStorage.setItem("selectedTheme", themeName);
}
*/

function applyTheme(themeName) {
  const theme = themes[themeName];
  if (!theme) return;
  
  // Apply CSS variables to root element
  Object.keys(theme).forEach(key => {
    document.documentElement.style.setProperty(key, theme[key]);
  });
  
  // ✅ Update browser theme-color (for mobile browsers, PWA, etc.)
  let themeMeta = document.querySelector('meta[name="theme-color"]');
  if (!themeMeta) {
    themeMeta = document.createElement("meta");
    themeMeta.setAttribute("name", "theme-color");
    document.head.appendChild(themeMeta);
  }
  themeMeta.setAttribute("content", theme["--primary-color"] || "#ffffff");
  
  // ✅ (Optional) Update description/keywords dynamically
  const descMeta = document.querySelector('meta[name="description"]');
  if (descMeta) {
    descMeta.setAttribute("content", `App in ${themeName} theme with ${theme["--primary-color"]}`);
  }
  
  // ✅ (Optional) Update page title
  document.title = `Ledger App - ${themeName.charAt(0).toUpperCase() + themeName.slice(1)} Theme`;
  
  // Save current theme
  localStorage.setItem("selectedTheme", themeName);
}
// Load saved theme on page load
window.addEventListener("DOMContentLoaded", () => {
  const savedTheme = localStorage.getItem("selectedTheme") || "light";
  themeSelect.value = savedTheme;
  applyTheme(savedTheme);
});

// Change theme when user selects
themeSelect.addEventListener("change", (e) => {
  applyTheme(e.target.value);
});


  const hamburger = document.getElementById("hamburger");
  const navLinks = document.getElementById("navLinks");

  // Toggle menu
  hamburger.addEventListener("click", () => {
    navLinks.classList.toggle("active");
  });

  // Highlight active link based on current page
  const currentPath = window.location.pathname.split("/").pop(); 
  const links = navLinks.querySelectorAll("a");

  links.forEach(link => {
    const linkPath = link.getAttribute("href").split("/").pop();
    if (linkPath === currentPath || (currentPath === "" && linkPath === "index.html")) {
      link.classList.add("active");
    }
  });
