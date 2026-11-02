import { motion } from "framer-motion";
import { LayoutDashboard, Calculator, BarChart2, Settings, ChevronLeft, ChevronRight } from "lucide-react";
import { useI18n } from "../../providers/I18nProvider";
import { useTheme } from "../../providers/ThemeProvider";
import { clsx } from "clsx";

type ViewKey = "data" | "calculation" | "comparison" | "settings";

interface NavigationRailProps {
  activeView: ViewKey;
  onViewChange: (view: ViewKey) => void;
  collapsed?: boolean;
  onCollapseChange?: (collapsed: boolean) => void;
}

const NAV_ITEMS: { key: ViewKey; icon: React.ReactNode; labelKey: string }[] = [
  { key: "data", icon: <LayoutDashboard className="w-5 h-5" />, labelKey: "navigation.dataWorkbench" },
  { key: "calculation", icon: <Calculator className="w-5 h-5" />, labelKey: "navigation.calculation" },
  { key: "comparison", icon: <BarChart2 className="w-5 h-5" />, labelKey: "navigation.comparison" },
  { key: "settings", icon: <Settings className="w-5 h-5" />, labelKey: "navigation.settings" },
];

export function NavigationRail({
  activeView,
  onViewChange,
  collapsed = false,
  onCollapseChange,
}: NavigationRailProps) {
  const { t } = useI18n();
  const { resolvedTheme } = useTheme();

  return (
    <motion.aside
      initial={{ width: collapsed ? 56 : 200 }}
      animate={{ width: collapsed ? 56 : 200 }}
      transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
      className={clsx(
        "flex flex-col bg-[rgb(var(--color-bg-secondary))] border-r border-[rgb(var(--color-border-primary))] overflow-hidden",
        "relative z-nav"
      )}
      style={{ width: collapsed ? 56 : 200 }}
    >
      {/* Logo/Brand */}
      <motion.div
        className={clsx("flex items-center justify-between px-3 py-4 border-b border-[rgb(var(--color-border-primary))]")}
        animate={{ opacity: collapsed ? 0 : 1, width: collapsed ? 0 : "auto" }}
        style={{ overflow: "hidden", whiteSpace: "nowrap" }}
      >
        <span className="text-lg font-semibold text-[rgb(var(--color-text-primary))]">
          医院绩效
        </span>
        {!collapsed && (
          <span className="text-xs text-[rgb(var(--color-text-muted))]">系统</span>
        )}
      </motion.div>

      {/* Navigation Items */}
      <nav className="flex-1 py-3 px-2 overflow-y-auto" role="navigation" aria-label="主导航">
        <ul className="space-y-1" role="list">
          {NAV_ITEMS.map((item) => {
            const isActive = activeView === item.key;
            return (
              <li key={item.key}>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => onViewChange(item.key)}
                  className={clsx(
                    "flex items-center gap-3 w-full px-3 py-2.5 rounded-lg transition-all duration-brand",
                    "text-[rgb(var(--color-text-secondary))] hover:text-[rgb(var(--color-text-primary))]",
                    isActive
                      ? "bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 font-medium"
                      : "hover:bg-surface-100 dark:hover:bg-surface-800",
                    collapsed && "justify-center"
                  )}
                  aria-current={isActive ? "page" : undefined}
                  aria-label={t(item.labelKey)}
                  style={{ minWidth: collapsed ? 40 : undefined }}
                >
                  <span className="flex-shrink-0">{item.icon}</span>
                  {!collapsed && (
                    <motion.span
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      transition={{ duration: 0.15 }}
                    >
                      {t(item.labelKey)}
                    </motion.span>
                  )}
                </motion.button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Collapse Toggle */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => onCollapseChange?.(!collapsed)}
        className={clsx(
          "flex items-center justify-center mx-2 mb-3 p-2 rounded-lg",
          "text-[rgb(var(--color-text-muted))] hover:text-[rgb(var(--color-text-primary))]",
          "hover:bg-surface-100 dark:hover:bg-surface-800",
          "transition-colors duration-brand"
        )}
        aria-label={collapsed ? "展开导航" : "折叠导航"}
        aria-expanded={!collapsed}
      >
        {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
      </motion.button>

{/* Theme Toggle */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => {
          // Use toggleTheme from context
          const { setMode } = useTheme();
          setMode(resolvedTheme === "dark" ? "light" : "dark");
        }}
        className={clsx(
          "flex items-center justify-center mx-2 mb-3 p-2 rounded-lg",
          "text-[rgb(var(--color-text-muted))] hover:text-[rgb(var(--color-text-primary))]",
          "hover:bg-surface-100 dark:hover:bg-surface-800",
          "transition-colors duration-brand"
        )}
        aria-label={resolvedTheme === "dark" ? "切换到浅色模式" : "切换到深色模式"}
      >
        {resolvedTheme === "dark" ? (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707-.707M6.343 17.657l-.707-.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        ) : (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
          </svg>
        )}
      </motion.button>
    </motion.aside>
  );
}