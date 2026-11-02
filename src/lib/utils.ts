/**
 * Utility functions
 */

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * 合并 className，支持 Tailwind 类冲突解决
 * 使用 clsx 处理条件类，twMerge 解决 Tailwind 类冲突
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * 生成唯一 ID
 */
export function generateId(prefix = ''): string {
  return `${prefix}${Math.random().toString(36).substring(2, 9)}${Date.now().toString(36)}`;
}

/**
 * 延迟函数
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 防抖函数
 */
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  ms: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), ms);
  };
}

/**
 * 节流函数
 */
export function throttle<T extends (...args: any[]) => any>(
  fn: T,
  ms: number
): (...args: Parameters<T>) => void {
  let lastCall = 0;
  return (...args: Parameters<T>) => {
    const now = Date.now();
    if (now - lastCall >= ms) {
      lastCall = now;
      fn(...args);
    }
  };
}

/**
 * 类名条件拼接（简化版，不依赖 clsx）
 */
export function classNames(...classes: (string | boolean | undefined | null | Record<string, boolean>)[]): string {
  return classes
    .flatMap(c => {
      if (!c) return [];
      if (typeof c === 'string') return [c];
      if (typeof c === 'object') return Object.entries(c).filter(([, v]) => v).map(([k]) => k);
      return [];
    })
    .join(' ');
}

/**
 * 格式化数字（千分位）
 */
export function formatNumber(num: number, locale = 'zh-CN'): string {
  return new Intl.NumberFormat(locale).format(num);
}

/**
 * 格式化日期
 */
export function formatDate(date: Date | string, locale = 'zh-CN', options?: Intl.DateTimeFormatOptions): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...options,
  }).format(d);
}

/**
 * 格式化相对时间
 */
export function formatRelativeTime(date: Date | string, locale = 'zh-CN'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return `${diffSecs}秒前`;
  if (diffMins < 60) return `${diffMins}分钟前`;
  if (diffHours < 24) return `${diffHours}小时前`;
  if (diffDays < 7) return `${diffDays}天前`;
  
  return formatDate(d, locale);
}

/**
 * 深拷贝
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * 对象是否为空
 */
export function isEmpty(obj: any): boolean {
  if (obj == null) return true;
  if (Array.isArray(obj) || typeof obj === 'string') return obj.length === 0;
  if (obj instanceof Map || obj instanceof Set) return obj.size === 0;
  if (typeof obj === 'object') return Object.keys(obj).length === 0;
  return false;
}

/**
 * 获取嵌套属性（安全访问）
 */
export function get<T>(obj: any, path: string, defaultValue?: T): T | undefined {
  const keys = path.split('.');
  let result = obj;
  for (const key of keys) {
    if (result == null) return defaultValue;
    result = result[key];
  }
  return result !== undefined ? result : defaultValue;
}

/**
 * 设置嵌套属性（不可变）
 */
export function set<T>(obj: T, path: string, value: any): T {
  const clone = deepClone(obj);
  const keys = path.split('.');
  let current: any = clone;
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (!(key in current) || typeof current[key] !== 'object') {
      current[key] = {};
    }
    current = current[key];
  }
  current[keys[keys.length - 1]] = value;
  return clone;
}

/**
 * 数组去重
 */
export function unique<T>(arr: T[], key?: keyof T | ((item: T) => any)): T[] {
  if (!key) return [...new Set(arr)];
  const seen = new Set();
  return arr.filter(item => {
    const k = typeof key === 'function' ? key(item) : item[key];
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

/**
 * 数组分组
 */
export function groupBy<T>(arr: T[], key: keyof T | ((item: T) => string)): Record<string, T[]> {
  return arr.reduce((groups, item) => {
    const k = typeof key === 'function' ? key(item) : String(item[key]);
    (groups[k] = groups[k] || []).push(item);
    return groups;
  }, {} as Record<string, T[]>);
}

/**
 * 防止事件冒泡
 */
export function stopPropagation(e: React.SyntheticEvent | Event): void {
  e.stopPropagation();
}

/**
 * 阻止默认行为
 */
export function preventDefault(e: React.SyntheticEvent | Event): void {
  e.preventDefault();
}

/**
 * 组合阻止默认行为和冒泡
 */
export function stopAndPrevent(e: React.SyntheticEvent | Event): void {
  e.stopPropagation();
  e.preventDefault();
}