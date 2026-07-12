"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

type Theme = "light" | "dark";

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
  document.documentElement.dataset.theme = theme;
  localStorage.setItem("questora-theme", theme);
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const storedTheme = localStorage.getItem("questora-theme") === "dark" ? "dark" : "light";
    setTheme(storedTheme);
    applyTheme(storedTheme);
  }, []);

  const nextTheme = theme === "dark" ? "light" : "dark";
  const Icon = theme === "dark" ? Sun : Moon;

  return (
    <button
      aria-label={`Switch to ${nextTheme} theme`}
      className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border/80 bg-surface text-ink shadow-sm transition hover:-translate-y-0.5 hover:border-moss/60 hover:text-moss"
      onClick={() => {
        setTheme(nextTheme);
        applyTheme(nextTheme);
      }}
      type="button"
    >
      <Icon aria-hidden className="h-4 w-4" />
    </button>
  );
}
