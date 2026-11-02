/**
 * MotionProvider - 动效系统 Provider
 * 
 * 功能：
 * 1. 统一 framer-motion 默认配置（缓动、时长、关键帧）
 * 2. 全局 reducedMotion 开关（用户偏好 + 手动切换）
 * 3. 提供预设动画变体供组件复用
 * 4. 集成 prefers-reduced-motion 媒体查询
 */

'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode, useRef } from 'react';
import { MotionConfig } from 'framer-motion';

// ============================================
// 类型定义
// ============================================

export interface MotionPresets {
  // 标准缓动
  standard: [number, number, number, number];
  // 进入缓动
  entrance: [number, number, number, number];
  // 退出缓动
  exit: [number, number, number, number];
  // 强调缓动
  emphasized: [number, number, number, number];
}

export interface MotionDurations {
  instant: number;    // 0ms
  fast: number;       // 100ms
  normal: number;     // 200ms
  slow: number;       // 300ms
  slower: number;     // 500ms
}

export interface MotionContextValue {
  // 全局 reducedMotion 状态
  reducedMotion: boolean;
  // 切换 reducedMotion
  setReducedMotion: (enabled: boolean) => void;
  // 切换到下一个状态
  toggleReducedMotion: () => void;
  // 预设缓动
  easing: MotionPresets;
  // 预设时长（毫秒）
  duration: MotionDurations;
  // 关键帧预设
  keyframes: {
    fadeIn: { from: { opacity: number }; to: { opacity: number } };
    fadeOut: { from: { opacity: number }; to: { opacity: number } };
    slideUp: { from: { opacity: number; transform: string }; to: { opacity: number; transform: string } };
    slideDown: { from: { opacity: number; transform: string }; to: { opacity: number; transform: string } };
    scaleIn: { from: { opacity: number; transform: string }; to: { opacity: number; transform: string } };
    scaleOut: { from: { opacity: number; transform: string }; to: { opacity: number; transform: string } };
  };
  // 常用 transition 配置
  transitions: {
    fast: { duration: number; ease: [number, number, number, number] };
    normal: { duration: number; ease: [number, number, number, number] };
    slow: { duration: number; ease: [number, number, number, number] };
    spring: { type: 'spring'; stiffness: number; damping: number; mass?: number };
    springGentle: { type: 'spring'; stiffness: number; damping: number; mass?: number };
    springSnappy: { type: 'spring'; stiffness: number; damping: number; mass?: number };
  };
  // 常用动画变体
  variants: {
    fade: { hidden: { opacity: number }; visible: { opacity: number; transition: { duration: number; ease: [number, number, number, number] } } };
    slideUp: { hidden: { opacity: number; y: number }; visible: { opacity: number; y: number; transition: { duration: number; ease: [number, number, number, number] } } };
    slideDown: { hidden: { opacity: number; y: number }; visible: { opacity: number; y: number; transition: { duration: number; ease: [number, number, number, number] } } };
    scale: { hidden: { opacity: number; scale: number }; visible: { opacity: number; scale: number; transition: { duration: number; ease: [number, number, number, number] } } };
    stagger: { visible: { transition: { staggerChildren: number; delayChildren: number } } };
  };
}

export interface MotionProviderProps {
  children: ReactNode;
  // 初始 reducedMotion 状态（默认跟随系统偏好）
  initialReducedMotion?: boolean | 'system';
  // 存储键名
  storageKey?: string;
  // 自定义预设（可选覆盖）
  customPresets?: Partial<MotionContextValue>;
}

// ============================================
// 默认预设
// ============================================

const DEFAULT_EASING: MotionPresets = {
  standard: [0.4, 0, 0.2, 1],
  entrance: [0.4, 0, 1, 1],
  exit: [0, 0, 0.2, 1],
  emphasized: [0.4, 0, 0.2, 1],
};

const DEFAULT_DURATIONS: MotionDurations = {
  instant: 0,
  fast: 100,
  normal: 200,
  slow: 300,
  slower: 500,
};

const DEFAULT_KEYFRAMES = {
  fadeIn: { from: { opacity: 0 }, to: { opacity: 1 } },
  fadeOut: { from: { opacity: 1 }, to: { opacity: 0 } },
  slideUp: { from: { opacity: 0, transform: 'translateY(8px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
  slideDown: { from: { opacity: 0, transform: 'translateY(-8px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
  scaleIn: { from: { opacity: 0, transform: 'scale(0.95)' }, to: { opacity: 1, transform: 'scale(1)' } },
  scaleOut: { from: { opacity: 1, transform: 'scale(1)' }, to: { opacity: 0, transform: 'scale(0.95)' } },
};

const DEFAULT_TRANSITIONS = {
  fast: { duration: 0.1, ease: DEFAULT_EASING.standard },
  normal: { duration: 0.2, ease: DEFAULT_EASING.standard },
  slow: { duration: 0.3, ease: DEFAULT_EASING.standard },
  spring: { type: 'spring' as const, stiffness: 300, damping: 30 },
  springGentle: { type: 'spring' as const, stiffness: 120, damping: 14 },
  springSnappy: { type: 'spring' as const, stiffness: 500, damping: 35 },
};

const DEFAULT_VARIANTS = {
  fade: {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.2, ease: DEFAULT_EASING.standard } },
  },
  slideUp: {
    hidden: { opacity: 0, y: 8 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.2, ease: DEFAULT_EASING.standard } },
  },
  slideDown: {
    hidden: { opacity: 0, y: -8 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.2, ease: DEFAULT_EASING.standard } },
  },
  scale: {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { opacity: 1, scale: 1, transition: { duration: 0.15, ease: DEFAULT_EASING.standard } },
  },
  stagger: {
    visible: { transition: { staggerChildren: 0.05, delayChildren: 0.1 } },
  },
};

// ============================================
// Context
// ============================================

const MotionContext = createContext<MotionContextValue | null>(null);

// ============================================
// MotionProvider 组件
// ============================================

export function MotionProvider({
  children,
  initialReducedMotion = 'system',
  storageKey = 'poker-face-motion',
  customPresets = {},
}: MotionProviderProps) {
  // reducedMotion 状态
  const [reducedMotion, setReducedMotionState] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    
    // 优先读取存储
    const stored = localStorage.getItem(storageKey);
    if (stored !== null) {
      return stored === 'true';
    }
    
    // 其次跟随系统偏好
    if (initialReducedMotion === 'system') {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
    
    return initialReducedMotion === true;
  });

  // 监听系统偏好变化
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // 只有在未手动设置过时才跟随系统
    const stored = localStorage.getItem(storageKey);
    if (stored !== null) return;
    
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = (e: MediaQueryListEvent) => {
      setReducedMotionState(e.matches);
    };
    
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, [storageKey]);

  // 持久化
  const setReducedMotion = useCallback((enabled: boolean) => {
    setReducedMotionState(enabled);
    if (typeof window !== 'undefined') {
      localStorage.setItem(storageKey, String(enabled));
    }
  }, [storageKey]);

  const toggleReducedMotion = useCallback(() => {
    setReducedMotionState(prev => !prev);
  }, []);

  // 合并自定义预设
  const value = useMemo<MotionContextValue>(() => ({
    reducedMotion,
    setReducedMotion,
    toggleReducedMotion,
    easing: customPresets.easing ?? DEFAULT_EASING,
    duration: customPresets.duration ?? DEFAULT_DURATIONS,
    keyframes: customPresets.keyframes ?? DEFAULT_KEYFRAMES,
    transitions: customPresets.transitions ?? DEFAULT_TRANSITIONS,
    variants: customPresets.variants ?? DEFAULT_VARIANTS,
  }), [
    reducedMotion,
    setReducedMotion,
    toggleReducedMotion,
    customPresets.easing,
    customPresets.duration,
    customPresets.keyframes,
    customPresets.transitions,
    customPresets.variants,
  ]);

  return (
    <MotionContext.Provider value={value}>
      {/* framer-motion 全局配置 */}
      <MotionConfig
        reducedMotion={reducedMotion ? 'always' : 'never'}
        transition={{
          duration: DEFAULT_DURATIONS.normal / 1000, // framer-motion 用秒
          ease: DEFAULT_EASING.standard,
        }}
      >
        {children}
      </MotionConfig>
    </MotionContext.Provider>
  );
}

// ============================================
// useMotion Hook
// ============================================

export function useMotion(): MotionContextValue {
  const context = useContext(MotionContext);
  if (!context) {
    throw new Error('useMotion must be used within a MotionProvider');
  }
  return context;
}

// ============================================
// 便捷 Hook：仅获取 reducedMotion
// ============================================

export function useReducedMotion(): boolean {
  const { reducedMotion } = useMotion();
  return reducedMotion;
}

// ============================================
// 便捷 Hook：获取预设 transition
// ============================================

export function useMotionTransitions() {
  const { transitions, easing, duration } = useMotion();
  return { transitions, easing, duration };
}

// ============================================
// 便捷 Hook：获取预设 variants
// ============================================

export function useMotionVariants() {
  const { variants } = useMotion();
  return variants;
}

// ============================================
// 组件级 reducedMotion 适配 Hook
// 用于在组件内根据全局设置动态调整动画
// ============================================

export function useAdaptiveTransition(
  normalTransition: React.CSSProperties['transition'] | object,
  reducedTransition: React.CSSProperties['transition'] | object = { transition: 'none' }
) {
  const reducedMotion = useReducedMotion();
  return reducedMotion ? reducedTransition : normalTransition;
}

// ============================================
// 服务端获取初始动效脚本
// ============================================

export function getInitialMotionScript(storageKey = 'poker-face-motion'): string {
  return `
    (function() {
      try {
        var storageKey = '${storageKey}';
        var stored = localStorage.getItem(storageKey);
        var reduced = stored === 'true';
        // 只有在明确设置时才应用，否则由 CSS @media (prefers-reduced-motion) 处理
        if (stored !== null) {
          document.documentElement.classList.toggle('reduce-motion', reduced);
        }
      } catch (e) {
        // 静默失败
      }
    })();
  `;
}