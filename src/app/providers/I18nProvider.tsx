import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import resourcesToBackend from "i18next-resources-to-backend";

type Locale = "zh-CN" | "en-US";

interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, options?: Record<string, unknown>) => string;
  ready: boolean;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}

interface I18nProviderProps {
  children: ReactNode;
  initialLocale?: Locale;
}

export function I18nProvider({ children, initialLocale = "zh-CN" }: I18nProviderProps) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);
  const [ready, setReady] = useState(false);

  // In test environment (no window), initialize synchronously
  if (typeof window === "undefined") {
    // Synchronous initialization for tests
    if (!i18n.isInitialized) {
      i18n
        .use(initReactI18next)
        .use(
          resourcesToBackend(
            (lng: string, ns: string) =>
              import(`../../../public/locales/${lng}/${ns}.json`)
          )
        )
        .init({
          lng: initialLocale,
          fallbackLng: "zh-CN",
          ns: ["common", "data", "calculation", "comparison"],
          defaultNS: "common",
          interpolation: { escapeValue: false },
          detection: undefined,
          react: { useSuspense: false },
        });
    }
    setLocaleState(initialLocale);
    setReady(true);
  } else {
    // Browser environment - async initialization
    useEffect(() => {
      let cancelled = false;

      const initI18n = async () => {
        if (i18n.isInitialized) {
          if (!cancelled) {
            setLocaleState(initialLocale);
            setReady(true);
          }
          return;
        }

        try {
          await i18n
            .use(initReactI18next)
            .use(
              resourcesToBackend(
                (lng: string, ns: string) =>
                  import(`../../../public/locales/${lng}/${ns}.json`)
              )
            )
            .init({
              lng: initialLocale,
              fallbackLng: "zh-CN",
              ns: ["common", "data", "calculation", "comparison"],
              defaultNS: "common",
              interpolation: { escapeValue: false },
              detection: undefined,
              react: { useSuspense: false },
            });

          if (!cancelled) {
            setLocaleState(i18n.language as Locale);
            setReady(true);
          }
        } catch (error) {
          console.error("Failed to initialize i18n:", error);
          if (!cancelled) {
            setLocaleState(initialLocale);
            setReady(true);
          }
        }
      };

      initI18n();

      return () => {
        cancelled = true;
      };
    }, [initialLocale]);
  }

  const setLocale = (lng: Locale) => {
    i18n.changeLanguage(lng);
    setLocaleState(lng);
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("i18nextLng", lng);
    }
  };

  // Always provide a context value - use i18n.t even during init (it returns key if not initialized)
  const t = (key: string, options?: Record<string, unknown>) => {
    if (i18n.isInitialized) {
      return i18n.t(key, options);
    }
    return key;
  };

  return (
    <I18nContext.Provider value={{ locale, setLocale, t, ready }}>
      {children}
    </I18nContext.Provider>
  );
}