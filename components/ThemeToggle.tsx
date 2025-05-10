"use client";
import React, { useEffect, useState } from "react";

interface ThemeToggleProps {
  style?: React.CSSProperties;
}

const ThemeToggle: React.FC<ThemeToggleProps> = ({ style }) => {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem("theme") as "light" | "dark" | null;
    if (stored) setTheme(stored);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  if (!mounted) return null; // Hide until client-side

  return (
    <button
      className="theme-toggle"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      aria-label="Toggle dark mode"
      style={{
        position: "relative",
        display: "block",
        margin: "0",
        left: "unset",
        top: "unset",
        zIndex: 1,
        background: theme === "dark" ? "#232329" : "#f0f0f0",
        color: theme === "dark" ? "#eee" : "#222",
        border: "1px solid #ccc",
        borderRadius: 6,
        padding: "6px 10px",
        fontSize: 16,
        cursor: "pointer",
        boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
        transition: "background 0.2s, color 0.2s, transform 0.2s",
        ...style
      }}
    >
      {theme === "dark" ? "🌙" : "☀️"}
    </button>
  );
};

export default ThemeToggle;