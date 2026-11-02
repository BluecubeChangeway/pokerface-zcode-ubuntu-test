/**
 * ThemeProvider - 主题系统核心 Provider
 * 
 * 功能：
 * 1. 三模式切换：light / dark / system
 * 2. CSS Variables 运行时注入
 * 3. localStorage 持久化用户选择
 * 4. 监听系统偏好变化（prefers-color-scheme）
 * 5. 主题包注册表预留扩展点（V2+）
 * 6. 提供 useTheme Hook 供组件消费
 */

'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo, ReactNode } from 'react';
import { lightThemeTokens } from './tokens/light/base';
import { darkThemeTokens } from './tokens/dark/base';

// ============================================
// 类型定义
// ============================================

export type ThemeMode = 'light' | 'dark' | 'system';

export interface ThemeContextValue {
  // 当前解析后的主题（实际渲染使用的）
  resolvedTheme: 'light' | 'dark';
  // 用户设置的模式
  themeMode: ThemeMode;
  // 切换主题模式
  setThemeMode: (mode: ThemeMode) => void;
  // 切换到下一个模式（循环：light → dark → system → light）
  toggleTheme: () => void;
  // 是否跟随系统
  isSystem: boolean;
  // 系统偏好
  systemTheme: 'light' | 'dark';
  // 主题包扩展（V2+）
  availableThemePackages: ThemePackageInfo[];
  activeThemePackage: string | null;
  setActiveThemePackage: (name: string | null) => void;
}

export interface ThemePackageInfo {
  name: string;
  displayName: string;
  description?: string;
  isBuiltIn: boolean;
}

export interface ThemeProviderProps {
  children: ReactNode;
  // 默认主题模式（未持久化时）
  defaultMode?: ThemeMode;
  // 启用的主题包（V2+）
  themePackages?: ThemePackageInfo[];
  // 存储键名
  storageKey?: string;
  // 是否在根元素上应用 data-theme 属性
  attribute?: 'data-theme' | 'class' | 'data-theme-mode';
  // 启用过渡动画
  enableTransitions?: boolean;
  // 回调：主题变化时
  onThemeChange?: (resolvedTheme: 'light' | 'dark', themeMode: ThemeMode) => void;
}

// ============================================
// Context 创建
// ============================================

const ThemeContext = createContext<ThemeContextValue | null>(null);

// ============================================
// 内置主题包
// ============================================

const BUILTIN_THEME_PACKAGES: ThemePackageInfo[] = [
  { name: 'light', displayName: '浅色', description: '明亮清爽的白天模式', isBuiltIn: true },
  { name: 'dark', displayName: '深色', description: '护眼舒适的夜晚模式', isBuiltIn: true },
  { name: 'system', displayName: '跟随系统', description: '自动匹配操作系统设置', isBuiltIn: true },
];

// ============================================
// ThemeProvider 组件
// ============================================

export function ThemeProvider({
  children,
  defaultMode = 'system',
  themePackages = [],
  storageKey = 'poker-face-theme',
  attribute = 'data-theme',
  enableTransitions = true,
  onThemeChange,
}: ThemeProviderProps) {
  // 状态：用户设置的模式
  const [themeMode, setThemeModeState] = useState<ThemeMode>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(storageKey) as ThemeMode | null;
      if (stored && ['light', 'dark', 'system'].includes(stored)) {
        return stored;
      }
    }
    return defaultMode;
  });

  // 状态：系统偏好
  const [systemTheme, setSystemTheme] = useState<'light' | 'dark'>('light');

  // 状态：当前激活的主题包（V2+）
  const [activeThemePackage, setActiveThemePackageState] = useState<string | null>(null);

  // 合并所有可用主题包
  const allThemePackages = useMemo(() => [
    ...BUILTIN_THEME_PACKAGES,
    ...themePackages.filter(p => !BUILTIN_THEME_PACKAGES.some(b => b.name === p.name)),
  ], [themePackages]);

  // 初始化系统偏好监听
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const initialSystemTheme = mediaQuery.matches ? 'dark' : 'light';
    setSystemTheme(initialSystemTheme);

    const handler = (e: MediaQueryListEvent) => {
      setSystemTheme(e.matches ? 'dark' : 'light');
    };

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  // 计算解析后的主题
  const resolvedTheme = useMemo((): 'light' | 'dark' => {
    if (themeMode === 'system') {
      return systemTheme;
    }
    return themeMode;
  }, [themeMode, systemTheme]);

  // 应用主题到 DOM
  useEffect(() => {
    const root = document.documentElement;
    
    // 选择当前主题的 Token
    const tokens = resolvedTheme === 'dark' ? darkThemeTokens : lightThemeTokens;
    
    // 注入所有 CSS Variables
    Object.entries(tokens).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });
    
    // 设置 data-theme 属性（CSS 选择器用）
    if (attribute === 'data-theme') {
      root.setAttribute('data-theme', resolvedTheme);
    } else if (attribute === 'class') {
      root.classList.remove('light', 'dark');
      root.classList.add(resolvedTheme);
    } else if (attribute === 'data-theme-mode') {
      root.setAttribute('data-theme-mode', themeMode);
      root.setAttribute('data-theme', resolvedTheme);
    }

    // 过渡动画控制
    if (enableTransitions) {
      root.style.setProperty('--theme-transition', 'background-color 200ms ease, color 200ms ease, border-color 200ms ease');
    } else {
      root.style.setProperty('--theme-transition', 'none');
    }

    // 触发回调
    onThemeChange?.(resolvedTheme, themeMode);
  }, [resolvedTheme, themeMode, attribute, enableTransitions, onThemeChange]);

  // 持久化用户选择
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(storageKey, themeMode);
    }
  }, [themeMode, storageKey]);

  // 设置主题模式（带验证）
  const setThemeMode = useCallback((mode: ThemeMode) => {
    if (['light', 'dark', 'system'].includes(mode)) {
      setThemeModeState(mode);
      setActiveThemePackageState(null); // 切换内置模式时清除主题包
    }
  }, []);

  // 循环切换主题
  const toggleTheme = useCallback(() => {
    const modes: ThemeMode[] = ['light', 'dark', 'system'];
    const currentIndex = modes.indexOf(themeMode);
    const nextIndex = (currentIndex + 1) % modes.length;
    setThemeMode(modes[nextIndex]);
  }, [themeMode, setThemeMode]);

  // 设置主题包（V2+）
  const setActiveThemePackage = useCallback((name: string | null) => {
    if (name === null) {
      setActiveThemePackageState(null);
      setThemeMode('system'); // 恢复跟随系统
    } else {
      const pkg = allThemePackages.find(p => p.name === name);
      if (pkg) {
        setActiveThemePackageState(name);
        // 主题包模式下，强制使用该主题包的基础模式
        // 这里简化处理：主题包内部通过 CSS Variables 覆盖，不改变 resolvedTheme
      }
    }
  }, [allThemePackages, setThemeMode]);

  // Context 值
  const value = useMemo<ThemeContextValue>(() => ({
    resolvedTheme,
    themeMode,
    setThemeMode,
    toggleTheme,
    isSystem: themeMode === 'system',
    systemTheme,
    availableThemePackages: allThemePackages,
    activeThemePackage,
    setActiveThemePackage,
  }), [
    resolvedTheme,
    themeMode,
    setThemeMode,
    toggleTheme,
    systemTheme,
    allThemePackages,
    activeThemePackage,
    setActiveThemePackage,
  ]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

// ============================================
// useTheme Hook
// ============================================

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

// ============================================
// 便捷 Hook：仅获取 resolvedTheme
// ============================================

export function useResolvedTheme(): 'light' | 'dark' {
  const { resolvedTheme } = useTheme();
  return resolvedTheme;
}

// ============================================
// 便捷 Hook：仅获取 themeMode 与切换函数
// ============================================

export function useThemeMode(): { themeMode: ThemeMode; setThemeMode: (mode: ThemeMode) => void; toggleTheme: () => void } {
  const { themeMode, setThemeMode, toggleTheme } = useTheme();
  return { themeMode, setThemeMode, toggleTheme };
}

// ============================================
// 服务端渲染兼容：获取初始主题脚本
// ============================================

export function getInitialThemeScript(storageKey = 'poker-face-theme'): string {
  return `
    (function() {
      try {
        var storageKey = '${storageKey}';
        var stored = localStorage.getItem(storageKey);
        var mode = stored && ['light','dark','system'].includes(stored) ? stored : 'system';
        var root = document.documentElement;
        var systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        var resolved = mode === 'system' ? (systemDark ? 'dark' : 'light') : mode;
        root.setAttribute('data-theme', resolved);
        root.setAttribute('data-theme-mode', mode);
      } catch (e) {
        // 静默失败，避免 SSR 闪烁
        document.documentElement.setAttribute('data-theme', 'light');
        document.documentElement.setAttribute('data-theme-mode', 'system');
      }
    })();
  `;
}

// ============================================
// 主题包注册器（V2+ 扩展点）
// ============================================

interface RegisteredThemePackage extends ThemePackageInfo {
  tokens: Record<string, string>; // CSS Variables 覆盖映射
  customProperties?: Record<string, string>;
}

const themePackageRegistry = new Map<string, RegisteredThemePackage>();

export function registerThemePackage(pkg: RegisteredThemePackage): void {
  themePackageRegistry.set(pkg.name, pkg);
}

export function getThemePackage(name: string): RegisteredThemePackage | undefined {
  return themePackageRegistry.get(name);
}

export function getAllRegisteredThemePackages(): RegisteredThemePackage[] {
  return Array.from(themePackageRegistry.values());
}

export function applyThemePackage(name: string): boolean {
  const pkg = themePackageRegistry.get(name);
  if (!pkg) return false;

  const root = document.documentElement;
  
  // 应用 CSS Variables 覆盖
  Object.entries(pkg.tokens).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });

  // 应用自定义属性
  if (pkg.customProperties) {
    Object.entries(pkg.customProperties).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });
  }

  return true;
}

export function clearThemePackage(): void {
  const root = document.documentElement;
  // 清除所有非内置 CSS Variables（以 --theme- 为前缀的自定义属性）
  // 实际实现中需要维护一个已注册变量列表
  root.style.removeProperty('--theme-transition');
}