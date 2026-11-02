import { useState, ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { NavigationRail } from "./NavigationRail";
import { clsx } from "clsx";
import { useTheme } from "../../providers/ThemeProvider";

export type ViewKey = "data" | "calculation" | "comparison" | "settings";

export interface ViewState {
  key: ViewKey;
  label: string;
  component: ReactNode;
}

interface AppShellProps {
  views: ViewState[];
  defaultView?: ViewKey;
}

export function AppShell({ views, defaultView = "data" }: AppShellProps) {
  const [activeView, setActiveView] = useState<ViewKey>(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("active-view") as ViewKey) || defaultView;
    }
    return defaultView;
  });
  const [railCollapsed, setRailCollapsed] = useState(false);
  const { resolvedTheme } = useTheme();

  const handleViewChange = (view: ViewKey) => {
    setActiveView(view);
    localStorage.setItem("active-view", view);
  };

  const currentView = views.find((v) => v.key === activeView) || views[0];

  return (
    <div className={clsx("flex h-screen w-full bg-[rgb(var(--color-bg-primary))]", resolvedTheme)}>
      <NavigationRail
        activeView={activeView}
        onViewChange={handleViewChange}
        collapsed={railCollapsed}
        onCollapseChange={setRailCollapsed}
      />

      <div className={clsx("flex-1 flex flex-col overflow-hidden", railCollapsed ? "ml-[56px]" : "ml-[200px]")}>
        {/* Top Bar */}
        <header className={clsx(
          "flex items-center justify-between px-4 py-3 border-b border-[rgb(var(--color-border-primary))] bg-[rgb(var(--color-bg-secondary))]",
          "sticky top-0 z-[50] shadow-elevation-1"
        )}>
          <div className="flex items-center gap-4">
            <AnimatePresence mode="wait">
              <motion.h1
                key={currentView.key}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2 }}
                className="text-lg font-semibold text-[rgb(var(--color-text-primary))]"
              >
                {currentView.label}
              </motion.h1>
            </AnimatePresence>
          </div>

          <div className="flex items-center gap-3">
            {/* View switcher for keyboard users */}
            <div className="hidden sm:flex items-center gap-1 bg-[rgb(var(--color-bg-tertiary))] rounded-lg p-1" role="tablist">
              {views.map((view) => (
                <button
                  key={view.key}
                  onClick={() => setActiveView(view.key)}
                  role="tab"
                  aria-selected={activeView === view.key}
                  className={clsx(
                    "px-3 py-1.5 rounded-md text-sm font-medium transition-colors duration-brand",
                    "text-[rgb(var(--color-text-secondary))] hover:text-[rgb(var(--color-text-primary))]",
                    activeView === view.key
                      ? "bg-[rgb(var(--color-bg-primary))] text-brand-600 dark:text-brand-400 shadow-elevation-1"
                      : "hover:bg-[rgb(var(--color-bg-primary))]"
                  )}
                >
                  {view.label}
                </button>
              ))}
            </div>
          </div>
        </header>

        {/* View Content */}
        <main className="flex-1 overflow-auto" role="main">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeView}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
              className="p-4 md:p-6"
            >
              {currentView.component}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}