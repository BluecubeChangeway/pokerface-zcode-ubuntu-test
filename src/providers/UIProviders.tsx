/**
 * UIProviders - 根级 Provider 组合
 * 
 * 统一导出所有 UI 基础设施 Provider：
 * - ThemeProvider：主题系统（light/dark/system + 主题包扩展）
 * - LocaleProvider：国际化（zh-CN/en-US + 命名空间懒加载）
 * - MotionProvider：动效系统（统一缓动/时长 + reducedMotion 开关）
 * 
 * 使用方式：
 *   import { UIProviders } from '@/providers/UIProviders';
 *   root.render(<UIProviders><App /></UIProviders>);
 * 
 * 组件内消费：
 *   import { useTheme, useLocale, useMotion } from '@/providers/UIProviders';
 */

'use client';

import React, { ReactNode } from 'react';
import { ThemeProvider, ThemeProviderProps } from '../theme/ThemeProvider';
import { LocaleProvider, LocaleProviderProps } from '../i18n/LocaleProvider';
import { MotionProvider, MotionProviderProps } from '../motion/MotionProvider';

// ============================================
// 类型定义
// ============================================

export interface UIProvidersProps extends React.HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  
  // ThemeProvider 配置
  theme?: Partial<ThemeProviderProps>;
  
  // LocaleProvider 配置
  locale?: Partial<LocaleProviderProps>;
  
  // MotionProvider 配置
  motion?: Partial<MotionProviderProps>;
  
  // 是否启用 SSR 兼容脚本注入
  enableSSRScripts?: boolean;
}

// ============================================
// 默认配置
// ============================================

const DEFAULT_THEME_CONFIG: Partial<ThemeProviderProps> = {
  defaultMode: 'system',
  storageKey: 'poker-face-theme',
  attribute: 'data-theme',
  enableTransitions: true,
};

const DEFAULT_LOCALE_CONFIG: Partial<LocaleProviderProps> = {
  defaultLocale: 'zh-CN',
  supportedLocales: ['zh-CN', 'en-US'],
  namespaces: ['common', 'canvas', 'recommendation', 'revocation', 'settings'],
  defaultNamespace: 'common',
  storageKey: 'poker-face-locale',
  fallbackLocale: 'zh-CN',
};

const DEFAULT_MOTION_CONFIG: Partial<MotionProviderProps> = {
  initialReducedMotion: 'system',
  storageKey: 'poker-face-motion',
};

// ============================================
// SSR 脚本注入组件
// ============================================

function SSRScripts({ enable = true }: { enable: boolean }) {
  if (!enable || typeof window !== 'undefined') return null;
  
  // 这些脚本会在客户端 hydration 前执行，防止闪烁
  // 实际使用时配合 Vite SSR 或手动注入到 index.html
  return (
    <>
      <script
        dangerouslySetInnerHTML={{
          __html: `
            (function() {
              try {
                // Theme
                var themeKey = 'poker-face-theme';
                var themeStored = localStorage.getItem(themeKey);
                var themeMode = themeStored && ['light','dark','system'].includes(themeStored) ? themeStored : 'system';
                var systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                var resolvedTheme = themeMode === 'system' ? (systemDark ? 'dark' : 'light') : themeMode;
                document.documentElement.setAttribute('data-theme', resolvedTheme);
                document.documentElement.setAttribute('data-theme-mode', themeMode);
                
                // Locale
                var localeKey = 'poker-face-locale';
                var localeStored = localStorage.getItem(localeKey);
                var locale = localeStored || 'zh-CN';
                document.documentElement.lang = locale;
                
                // Motion
                var motionKey = 'poker-face-motion';
                var motionStored = localStorage.getItem(motionKey);
                if (motionStored !== null) {
                  document.documentElement.classList.toggle('reduce-motion', motionStored === 'true');
                }
              } catch (e) {
                document.documentElement.setAttribute('data-theme', 'light');
                document.documentElement.setAttribute('data-theme-mode', 'system');
                document.documentElement.lang = 'zh-CN';
              }
            })();
          `,
        }}
      />
      <style dangerouslySetInnerHTML={{
        __html: `
          /* 防止主题闪烁的内联样式 */
          [data-theme="light"] { color-scheme: light; }
          [data-theme="dark"] { color-scheme: dark; }
          .reduce-motion *, .reduce-motion *::before, .reduce-motion *::after {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
            scroll-behavior: auto !important;
          }
        `,
      }} />
    </>
  );
}

// ============================================
// UIProviders 组合组件
// ============================================

export function UIProviders({
  children,
  theme = {},
  locale = {},
  motion = {},
  enableSSRScripts = true,
  ...rest
}: UIProvidersProps) {
  const themeConfig = { ...DEFAULT_THEME_CONFIG, ...theme };
  const localeConfig = { ...DEFAULT_LOCALE_CONFIG, ...locale };
  const motionConfig = { ...DEFAULT_MOTION_CONFIG, ...motion };

  return (
    <>
      {enableSSRScripts && <SSRScripts enable={true} />}
      <ThemeProvider {...themeConfig}>
        <LocaleProvider {...localeConfig}>
          <MotionProvider {...motionConfig}>
            <div {...rest}>{children}</div>
          </MotionProvider>
        </LocaleProvider>
      </ThemeProvider>
    </>
  );
}

// ============================================
// 重新导出所有 Hook 和类型（统一入口）
// ============================================

// Theme
export { ThemeProvider } from '../theme/ThemeProvider';
export { useTheme, useResolvedTheme, useThemeMode } from '../theme/ThemeProvider';
export type { ThemeMode, ThemeContextValue, ThemePackageInfo, ThemeProviderProps } from '../theme/ThemeProvider';

// Locale
export { LocaleProvider } from '../i18n/LocaleProvider';
export { useLocale, useTranslation, useCommonTranslation, useCanvasTranslation, useRecommendationTranslation, useRevocationTranslation, useSettingsTranslation } from '../i18n/LocaleProvider';
export type { SupportedLocale, LocaleContextValue, LocaleProviderProps, Namespace } from '../i18n/LocaleProvider';

// Motion
export { MotionProvider } from '../motion/MotionProvider';
export { useMotion, useReducedMotion, useMotionTransitions, useMotionVariants, useAdaptiveTransition } from '../motion/MotionProvider';
export type { MotionContextValue, MotionProviderProps, MotionPresets, MotionDurations } from '../motion/MotionProvider';

// Semantic Colors
export { semanticColor, semanticColorVariants, cardTypeColor, statusColor, statusColorMap, createSemanticStyle } from '../theme/semantic';
export type { SemanticColorKey, ComponentSemanticTokens, ThemePackageTokens } from '../theme/semantic';
export { defaultComponentTokens } from '../theme/semantic';