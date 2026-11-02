import { useState } from "react";
import { motion } from "framer-motion";
import { Calculator, Cog, HelpCircle } from "lucide-react";
import { useI18n } from "../providers/I18nProvider";
import { useTheme } from "../providers/ThemeProvider";
import { useMotion } from "../providers/MotionProvider";
import { clsx } from "clsx";

export function SettingsView() {
  const { t } = useI18n();
  const { locale, setLocale } = useI18n();
  const { mode, setMode, resolvedTheme } = useTheme();
  const { reducedMotion, setReducedMotion } = useMotion();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col gap-6"
    >
      <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="card-elevated p-6">
        <h2 className="text-lg font-semibold text-[rgb(var(--color-text-primary))] mb-4">{t("navigation.settings")}</h2>
        <div className="space-y-6">
          <section>
            <h3 className="font-medium text-[rgb(var(--color-text-primary))] mb-3">{t("theme.toggle")}</h3>
            <div className="flex flex-wrap gap-3">
              {(["light", "dark", "system"] as const).map((theme) => (
                <button
                  key={theme}
                  onClick={() => setMode(theme)}
                  className={clsx(
                    "flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all duration-brand",
                    "text-[rgb(var(--color-text-secondary))] hover:text-[rgb(var(--color-text-primary))]",
                    mode === theme
                      ? "border-brand-500 bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300"
                      : "border-[rgb(var(--color-border-primary))] hover:border-brand-500"
                  )}
                >
                  {theme === "light" && <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>}
                  {theme === "dark" && <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>}
                  {theme === "system" && <Cog className="w-5 h-5" />}
                  <span className="capitalize">{theme}</span>
                </button>
              ))}
            </div>
          </section>

          <section>
            <h3 className="font-medium text-[rgb(var(--color-text-primary))] mb-3">{t("locale.zh-CN")} / {t("locale.en-US")}</h3>
            <div className="flex gap-3">
              {(["zh-CN", "en-US"] as const).map((lng) => (
                <button
                  key={lng}
                  onClick={() => setLocale(lng)}
                  className={clsx(
                    "flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all duration-brand",
                    "text-[rgb(var(--color-text-secondary))] hover:text-[rgb(var(--color-text-primary))]",
                    locale === lng
                      ? "border-brand-500 bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300"
                      : "border-[rgb(var(--color-border-primary))] hover:border-brand-500"
                  )}
                >
                  <span className="text-sm font-mono">{lng}</span>
                  <span>{lng === "zh-CN" ? "中文（简体）" : "English"}</span>
                </button>
              ))}
            </div>
          </section>

          <section>
            <h3 className="font-medium text-[rgb(var(--color-text-primary))] mb-3">{t("motion.reduced")}</h3>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={reducedMotion}
                onChange={(e) => setReducedMotion(e.target.checked)}
                className="w-4 h-4 rounded border-[rgb(var(--color-border-primary))] text-brand-600 focus:ring-brand-500"
              />
              <span className="text-[rgb(var(--color-text-primary))]">启用后禁用过渡动画、布局动画，提升性能</span>
            </label>
          </section>

          <section className="pt-4 border-t border-[rgb(var(--color-border-primary))]">
            <h3 className="font-medium text-[rgb(var(--color-text-primary))] mb-3">关于</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-[rgb(var(--color-text-secondary))]">
              <div>
                <p className="font-medium text-[rgb(var(--color-text-primary))] mb-1">版本</p>
                <p>1.0.0-beta</p>
              </div>
              <div>
                <p className="font-medium text-[rgb(var(--color-text-primary))] mb-1">构建时间</p>
                <p>{new Date().toLocaleDateString()}</p>
              </div>
              <div>
                <p className="font-medium text-[rgb(var(--color-text-primary))] mb-1">技术栈</p>
                <p>React 19 + TypeScript + Vite</p>
              </div>
            </div>
          </section>
        </div>
      </motion.div>
    </motion.div>
  );
}