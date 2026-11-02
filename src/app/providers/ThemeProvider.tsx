import { createContext, useContext, useEffect, useState, ReactNode } from "react";

type ThemeMode = "light" | "dark" | "system";

interface ThemeContextValue {
  mode: ThemeMode;
  resolvedTheme: "light" | "dark";
  setMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}

interface ThemeProviderProps {
  children: ReactNode;
  defaultMode?: ThemeMode;
}

export function ThemeProvider({ children, defaultMode = "system" }: ThemeProviderProps) {
  const [mode, setModeState] = useState<ThemeMode>(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("theme-mode") as ThemeMode) || defaultMode;
    }
    return defaultMode;
  });
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("light");

  const resolveTheme = (themeMode: ThemeMode): "light" | "dark" => {
    if (themeMode === "system") {
      return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    return themeMode;
  };

  useEffect(() => {
    const resolved = resolveTheme(mode);
    setResolvedTheme(resolved);
    document.documentElement.classList.remove("light", "dark");
    document.documentElement.classList.add(resolved);
    localStorage.setItem("theme-mode", mode);
  }, [mode]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      if (mode === "system") {
        const resolved = resolveTheme("system");
        setResolvedTheme(resolved);
        document.documentElement.classList.remove("light", "dark");
        document.documentElement.classList.add(resolved);
      }
    };
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [mode]);

  const setMode = (newMode: ThemeMode) => {
    setModeState(newMode);
  };

  const toggleTheme = () => {
    const newMode = resolvedTheme === "light" ? "dark" : "light";
    setMode(newMode);
  };

  return (
    <ThemeContext.Provider value={{ mode, resolvedTheme, setMode, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}