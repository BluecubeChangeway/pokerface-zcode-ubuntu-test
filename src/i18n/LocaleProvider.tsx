/**
 * LocaleProvider - 国际化 Provider
 * 
 * 功能：
 * 1. react-i18next 初始化配置
 * 2. 资源懒加载（i18next-resources-to-backend）
 * 3. 语言切换、持久化
 * 4. 浏览器语言检测（首次访问）
 * 5. 命名空间拆分（common、canvas、recommendation、revocation、settings）
 */

'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo, ReactNode, Suspense } from 'react';
import { initReactI18next, useTranslation as useTranslationHook, I18nextProvider } from 'react-i18next';
import i18n, { Resource } from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import resourcesToBackend from 'i18next-resources-to-backend';

// ============================================
// 类型定义
// ============================================

export type SupportedLocale = 'zh-CN' | 'en-US' | string;

export interface LocaleContextValue {
  locale: SupportedLocale;
  setLocale: (locale: SupportedLocale) => void;
  t: (key: string, options?: Record<string, any>) => string;
  i18n: typeof i18n;
  isReady: boolean;
  supportedLocales: SupportedLocale[];
}

export interface LocaleProviderProps {
  children: ReactNode;
  // 默认语言
  defaultLocale?: SupportedLocale;
  // 支持的语言列表
  supportedLocales?: SupportedLocale[];
  // 命名空间
  namespaces?: string[];
  // 默认命名空间
  defaultNamespace?: string;
  // 存储键名
  storageKey?: string;
  // 回调：语言变化时
  onLocaleChange?: (locale: SupportedLocale) => void;
  // fallback 语言
  fallbackLocale?: SupportedLocale;
}

// ============================================
// 命名空间定义
// ============================================

const NAMESPACES = [
  'common',           // 通用：按钮、提示、通用文案
  'canvas',           // 画布：卡牌、槽位、拖拽、聚焦
  'recommendation',   // 推荐：列表、详情、确认面板、拆分参数
  'revocation',       // 撤回：预览、确认、层撤回
  'settings',         // 设置：主题、语言、动效、关于
];

export type Namespace = typeof NAMESPACES[number];

// 默认导出资源路径（懒加载）
const resourcesPath = (lng: string, ns: string) => 
  import(`../i18n/resources/${lng}/${ns}.json`);

// ============================================
// i18n 初始化（单例模式）
// ============================================

let i18nInitialized = false;

function initializeI18n(options: {
  defaultLocale: SupportedLocale;
  supportedLocales: SupportedLocale[];
  namespaces: string[];
  defaultNamespace: string;
  fallbackLocale: SupportedLocale;
}): Promise<void> {
  if (i18nInitialized && i18n.isInitialized) {
    return Promise.resolve();
  }

  return i18n
    .use(initReactI18next)
    .use(LanguageDetector)
    .use(resourcesToBackend(resourcesPath))
    .init({
      // 语言配置
      lng: options.defaultLocale,
      fallbackLng: options.fallbackLocale,
      supportedLngs: options.supportedLocales,
      load: 'languageOnly', // 只加载语言代码，不加载地区

      // 命名空间
      ns: options.namespaces,
      defaultNS: options.defaultNamespace,
      fallbackNS: options.defaultNamespace,

      // 插值
      interpolation: {
        escapeValue: false, // React 已转义
        formatSeparator: ',',
      },

      // 检测选项
      detection: {
        order: ['localStorage', 'navigator', 'htmlTag'],
        caches: ['localStorage'],
        lookupLocalStorage: 'poker-face-locale',
        lookupFromPathIndex: 0,
        lookupFromSubdomainIndex: 0,
      },

      // 回退行为
      returnNull: false,
      returnEmptyString: false,
      returnObjects: false,
      joinArrays: ' ',

      // React 选项
      react: {
        useSuspense: true,
        bindI18n: 'languageChanged loaded',
        bindI18nStore: 'added removed',
        transEmptyNodeValue: '',
        transSupportBasicHtmlNodes: true,
        transKeepBasicHtmlNodesFor: ['br', 'strong', 'i', 'em', 'span'],
      },

      // 调试
      debug: process.env.NODE_ENV === 'development',

      // 缺失键处理
      saveMissing: false,
      missingKeyHandler: (lng, ns, key) => {
        console.warn(`[i18n] Missing key: ${lng}/${ns}/${key}`);
      },
    })
    .then(() => {
      i18nInitialized = true;
    });
}

// ============================================
// Context
// ============================================

const LocaleContext = createContext<LocaleContextValue | null>(null);

// ============================================
// LocaleProvider 组件
// ============================================

export function LocaleProvider({
  children,
  defaultLocale = 'zh-CN',
  supportedLocales = ['zh-CN', 'en-US'],
  namespaces = NAMESPACES,
  defaultNamespace = 'common',
  storageKey = 'poker-face-locale',
  onLocaleChange,
  fallbackLocale = 'zh-CN',
}: LocaleProviderProps) {
  const [isReady, setIsReady] = useState(false);
  const [currentLocale, setCurrentLocale] = useState<SupportedLocale>(defaultLocale);

  // 初始化 i18n
  useEffect(() => {
    let mounted = true;
    
    initializeI18n({
      defaultLocale,
      supportedLocales,
      namespaces,
      defaultNamespace,
      fallbackLocale,
    }).then(() => {
      if (mounted) {
        // 从 localStorage 恢复或使用检测到的语言
        const stored = typeof window !== 'undefined' 
          ? localStorage.getItem(storageKey) 
          : null;
        
        const initialLocale = (stored && supportedLocales.includes(stored)) 
          ? stored 
          : i18n.language || defaultLocale;
        
        setCurrentLocale(initialLocale);
        setIsReady(true);
      }
    });

    return () => { mounted = false; };
  }, [defaultLocale, supportedLocales, namespaces, defaultNamespace, fallbackLocale, storageKey]);

  // 语言变化时同步状态
  useEffect(() => {
    if (!isReady) return;

    const handleLanguageChanged = (lng: string) => {
      if (supportedLocales.includes(lng)) {
        setCurrentLocale(lng);
        onLocaleChange?.(lng);
      }
    };

    i18n.on('languageChanged', handleLanguageChanged);
    return () => i18n.off('languageChanged', handleLanguageChanged);
  }, [isReady, supportedLocales, onLocaleChange]);

  // 切换语言
  const setLocale = useCallback(async (locale: SupportedLocale) => {
    if (!supportedLocales.includes(locale)) {
      console.warn(`[LocaleProvider] Unsupported locale: ${locale}`);
      return;
    }

    await i18n.changeLanguage(locale);
    if (typeof window !== 'undefined') {
      localStorage.setItem(storageKey, locale);
    }
    // 更新 html lang 属性
    document.documentElement.lang = locale;
  }, [supportedLocales, storageKey]);

  // 初始化 html lang
  useEffect(() => {
    if (isReady) {
      document.documentElement.lang = currentLocale;
    }
  }, [currentLocale, isReady]);

  const value = useMemo<LocaleContextValue>(() => ({
    locale: currentLocale,
    setLocale,
    t: (key: string, options?: Record<string, any>) => i18n.t(key, options),
    i18n,
    isReady,
    supportedLocales,
  }), [currentLocale, setLocale, isReady, supportedLocales]);

  if (!isReady) {
    return (
      <I18nextProvider i18n={i18n}>
        <LocaleContext.Provider value={null as any}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
            <span data-testid="i18n-loading">初始化国际化...</span>
          </div>
        </LocaleContext.Provider>
      </I18nextProvider>
    );
  }

  return (
    <I18nextProvider i18n={i18n}>
      <LocaleContext.Provider value={value}>
        {children}
      </LocaleContext.Provider>
    </I18nextProvider>
  );
}

// ============================================
// useLocale Hook
// ============================================

export function useLocale(): LocaleContextValue {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error('useLocale must be used within a LocaleProvider');
  }
  return context;
}

// ============================================
// useTranslation Hook（封装 react-i18next，支持命名空间类型提示）
// ============================================

export function useTranslation(ns?: Namespace | Namespace[]) {
  const { locale, isReady, setLocale, i18n } = useLocale();
  
  // 使用 react-i18next 的 hook
  const { t, i18n: i18nInstance } = useTranslationHook(ns as string | string[]);
  
  return {
    t,
    i18n: i18nInstance,
    locale,
    isReady,
    setLocale,
  };
}

// ============================================
// 组件级翻译 Hook（带命名空间类型安全）
// ============================================

export function useCommonTranslation() {
  return useTranslation('common');
}

export function useCanvasTranslation() {
  return useTranslation('canvas');
}

export function useRecommendationTranslation() {
  return useTranslation('recommendation');
}

export function useRevocationTranslation() {
  return useTranslation('revocation');
}

export function useSettingsTranslation() {
  return useTranslation('settings');
}

// ============================================
// 服务端获取初始语言脚本
// ============================================

export function getInitialLocaleScript(storageKey = 'poker-face-locale', defaultLocale = 'zh-CN'): string {
  return `
    (function() {
      try {
        var storageKey = '${storageKey}';
        var stored = localStorage.getItem(storageKey);
        var locale = stored || '${defaultLocale}';
        document.documentElement.lang = locale;
      } catch (e) {
        document.documentElement.lang = '${defaultLocale}';
      }
    })();
  `;
}

// ============================================
// 资源预加载工具
// ============================================

export async function preloadLocaleResources(locale: SupportedLocale, namespaces?: string[]): Promise<void> {
  const ns = namespaces || NAMESPACES;
  await Promise.all(
    ns.map(n => new Promise<void>((resolve, reject) => {
      (i18n as any).loadResources(locale, n, (err?: Error) => {
        if (err) reject(err);
        else resolve();
      });
    }))
  );
}

export async function preloadAllLocales(namespaces?: string[]): Promise<void> {
  const locales: SupportedLocale[] = ['zh-CN', 'en-US'];
  await Promise.all(
    locales.flatMap(locale => 
      (namespaces || NAMESPACES).map(ns => new Promise<void>((resolve, reject) => {
        (i18n as any).loadResources(locale, ns, (err?: Error) => {
          if (err) reject(err);
          else resolve();
        });
      }))
    )
  );
}